import { and, eq, inArray, notInArray, sql } from 'drizzle-orm';
import { db } from './db';
import { episodes, seasons, shows, watched } from './db/schema';
import { getShowWithEpisodes } from './tmdb';
import type { LibraryShow, ShowCategory } from '$lib/types';

const today = () => new Date().toISOString().slice(0, 10);
const isAired = (airDate: string | null, now = today()) => !!airDate && airDate <= now;
const ENDED = new Set(['Ended', 'Canceled']);

// ---------- Sync with TMDB ----------

export async function syncShow(id: number) {
	const { details, episodes: eps, providers, providersLink } = await getShowWithEpisodes(id);

	const showRow = {
		id: details.id,
		name: details.name,
		originalName: details.original_name,
		overview: details.overview,
		posterPath: details.poster_path,
		backdropPath: details.backdrop_path,
		firstAirDate: details.first_air_date || null,
		status: details.status,
		networks: details.networks.map((n) => n.name),
		providers,
		providersLink,
		syncedAt: new Date()
	};

	await db.transaction(async (tx) => {
		const { id: _id, ...update } = showRow;
		await tx.insert(shows).values(showRow).onConflictDoUpdate({ target: shows.id, set: update });

		for (const s of details.seasons) {
			const row = {
				showId: id,
				seasonNumber: s.season_number,
				name: s.name,
				posterPath: s.poster_path,
				airDate: s.air_date || null
			};
			await tx
				.insert(seasons)
				.values(row)
				.onConflictDoUpdate({ target: [seasons.showId, seasons.seasonNumber], set: row });
		}

		const epRows = eps.map((e) => ({
			id: e.id,
			showId: id,
			seasonNumber: e.season_number,
			episodeNumber: e.episode_number,
			name: e.name,
			overview: e.overview,
			airDate: e.air_date || null,
			runtime: e.runtime,
			stillPath: e.still_path
		}));
		for (let i = 0; i < epRows.length; i += 200) {
			await tx
				.insert(episodes)
				.values(epRows.slice(i, i + 200))
				.onConflictDoUpdate({
					target: episodes.id,
					set: {
						showId: sql`excluded.show_id`,
						seasonNumber: sql`excluded.season_number`,
						episodeNumber: sql`excluded.episode_number`,
						name: sql`excluded.name`,
						overview: sql`excluded.overview`,
						airDate: sql`excluded.air_date`,
						runtime: sql`excluded.runtime`,
						stillPath: sql`excluded.still_path`
					}
				});
		}

		// Remove seasons/episodes that no longer exist on TMDB.
		const seasonNums = details.seasons.map((s) => s.season_number);
		await tx
			.delete(seasons)
			.where(
				seasonNums.length
					? and(eq(seasons.showId, id), notInArray(seasons.seasonNumber, seasonNums))
					: eq(seasons.showId, id)
			);
		const epIds = eps.map((e) => e.id);
		const stale = await tx
			.select({ id: episodes.id })
			.from(episodes)
			.where(
				epIds.length
					? and(eq(episodes.showId, id), notInArray(episodes.id, epIds))
					: eq(episodes.showId, id)
			);
		if (stale.length) {
			const staleIds = stale.map((r) => r.id);
			await tx.delete(watched).where(inArray(watched.episodeId, staleIds));
			await tx.delete(episodes).where(inArray(episodes.id, staleIds));
		}
	});
}

export async function removeShow(id: number) {
	await db.transaction(async (tx) => {
		const ids = tx.select({ id: episodes.id }).from(episodes).where(eq(episodes.showId, id));
		await tx.delete(watched).where(inArray(watched.episodeId, ids));
		await tx.delete(episodes).where(eq(episodes.showId, id));
		await tx.delete(seasons).where(eq(seasons.showId, id));
		await tx.delete(shows).where(eq(shows.id, id));
	});
}

let refreshing: Promise<void> | null = null;

/**
 * Re-sync shows that haven't been synced for a day (ended shows: a week), in the background.
 * Picks up new episodes, air dates and changes in streaming availability.
 */
export function refreshStaleShows() {
	if (refreshing) return refreshing;
	refreshing = (async () => {
		const all = await db
			.select({ id: shows.id, status: shows.status, syncedAt: shows.syncedAt })
			.from(shows);
		const now = Date.now();
		for (const s of all) {
			const maxAge = (ENDED.has(s.status ?? '') ? 7 : 1) * 24 * 3600 * 1000;
			if (s.syncedAt && now - s.syncedAt.getTime() < maxAge) continue;
			try {
				await syncShow(s.id);
			} catch (e) {
				console.warn(`Background refresh of show ${s.id} failed:`, (e as Error).message);
			}
		}
	})().finally(() => (refreshing = null));
	return refreshing;
}

// ---------- Watched state ----------

export async function setWatched(episodeIds: number[], value: boolean) {
	if (!episodeIds.length) return 0;
	if (value) {
		const existing = await db
			.select({ id: episodes.id })
			.from(episodes)
			.where(inArray(episodes.id, episodeIds));
		if (!existing.length) return 0;
		const now = new Date();
		await db
			.insert(watched)
			.values(existing.map((e) => ({ episodeId: e.id, watchedAt: now })))
			.onConflictDoNothing();
		return existing.length;
	}
	await db.delete(watched).where(inArray(watched.episodeId, episodeIds));
	return episodeIds.length;
}

// ---------- Read models ----------

function categorize(
	status: string | null,
	aired: number,
	watchedAired: number,
	hasFuture: boolean
): ShowCategory {
	if (aired > 0 && watchedAired < aired) return watchedAired === 0 ? 'not_started' : 'watching';
	if (aired > 0 && !hasFuture && ENDED.has(status ?? '')) return 'completed';
	return 'waiting';
}

/** Every show in the library with progress, next episode and category. Specials (season 0) are ignored. */
export async function getLibrary(): Promise<LibraryShow[]> {
	const now = today();
	const [showRows, epRows] = await Promise.all([
		db.select().from(shows),
		db
			.select({
				id: episodes.id,
				showId: episodes.showId,
				seasonNumber: episodes.seasonNumber,
				episodeNumber: episodes.episodeNumber,
				name: episodes.name,
				airDate: episodes.airDate,
				stillPath: episodes.stillPath,
				watchedAt: watched.watchedAt
			})
			.from(episodes)
			.leftJoin(watched, eq(watched.episodeId, episodes.id))
			.where(sql`${episodes.seasonNumber} > 0`)
			.orderBy(episodes.showId, episodes.seasonNumber, episodes.episodeNumber)
	]);

	const byShow = new Map<number, typeof epRows>();
	for (const e of epRows) {
		let list = byShow.get(e.showId);
		if (!list) byShow.set(e.showId, (list = []));
		list.push(e);
	}

	return showRows.map((s) => {
		const eps = byShow.get(s.id) ?? [];
		let aired = 0;
		let watchedAired = 0;
		let watchedCount = 0;
		let lastWatchedAt: Date | null = null;
		let next: (typeof eps)[number] | null = null;
		let upcoming: (typeof eps)[number] | null = null;
		for (const e of eps) {
			const isW = !!e.watchedAt;
			if (isW) {
				watchedCount++;
				if (!lastWatchedAt || e.watchedAt! > lastWatchedAt) lastWatchedAt = e.watchedAt;
			}
			if (isAired(e.airDate, now)) {
				aired++;
				if (isW) watchedAired++;
				else if (!next) next = e;
			} else if (e.airDate && !upcoming) {
				upcoming = e;
			}
		}
		const pick = (e: typeof next) =>
			e && {
				id: e.id,
				seasonNumber: e.seasonNumber,
				episodeNumber: e.episodeNumber,
				name: e.name,
				airDate: e.airDate,
				stillPath: e.stillPath
			};
		return {
			id: s.id,
			name: s.name,
			posterPath: s.posterPath,
			backdropPath: s.backdropPath,
			firstAirDate: s.firstAirDate,
			status: s.status,
			networks: s.networks,
			providers: s.providers,
			addedAt: s.addedAt.toISOString(),
			lastWatchedAt: lastWatchedAt?.toISOString() ?? null,
			total: eps.length,
			aired,
			watched: watchedCount,
			watchedAired,
			next: pick(next),
			upcoming: pick(upcoming),
			category: categorize(s.status, aired, watchedAired, !!upcoming)
		};
	});
}

export async function getShow(id: number) {
	const [show] = await db.select().from(shows).where(eq(shows.id, id));
	if (!show) return null;
	const [seasonRows, epRows] = await Promise.all([
		db.select().from(seasons).where(eq(seasons.showId, id)).orderBy(seasons.seasonNumber),
		db
			.select({
				id: episodes.id,
				seasonNumber: episodes.seasonNumber,
				episodeNumber: episodes.episodeNumber,
				name: episodes.name,
				overview: episodes.overview,
				airDate: episodes.airDate,
				runtime: episodes.runtime,
				stillPath: episodes.stillPath,
				watchedAt: watched.watchedAt
			})
			.from(episodes)
			.leftJoin(watched, eq(watched.episodeId, episodes.id))
			.where(eq(episodes.showId, id))
			.orderBy(episodes.seasonNumber, episodes.episodeNumber)
	]);

	const now = today();
	return {
		show: {
			...show,
			addedAt: show.addedAt.toISOString(),
			syncedAt: show.syncedAt?.toISOString() ?? null
		},
		seasons: seasonRows
			.map((s) => ({
				seasonNumber: s.seasonNumber,
				name: s.name,
				airDate: s.airDate,
				episodes: epRows
					.filter((e) => e.seasonNumber === s.seasonNumber)
					.map((e) => ({
						id: e.id,
						episodeNumber: e.episodeNumber,
						seasonNumber: e.seasonNumber,
						name: e.name,
						overview: e.overview,
						airDate: e.airDate,
						runtime: e.runtime,
						stillPath: e.stillPath,
						aired: isAired(e.airDate, now),
						watched: !!e.watchedAt
					}))
			}))
			// Specials last, empty seasons hidden.
			.filter((s) => s.episodes.length > 0)
			.sort((a, b) => (a.seasonNumber || 1e6) - (b.seasonNumber || 1e6))
	};
}

export async function libraryIds() {
	const rows = await db.select({ id: shows.id }).from(shows);
	return rows.map((r) => r.id);
}
