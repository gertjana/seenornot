import { env } from '$env/dynamic/private';
import type { Provider } from './db/schema';

const BASE = () => env.TMDB_BASE_URL || 'https://api.themoviedb.org/3';

export class TmdbError extends Error {
	constructor(
		message: string,
		public status = 500
	) {
		super(message);
	}
}

export const region = () => (env.TMDB_REGION || 'NL').toUpperCase();
const language = () => env.TMDB_LANGUAGE || 'en-US';

async function tmdb<T>(path: string, params: Record<string, string> = {}): Promise<T> {
	const key = env.TMDB_API_KEY?.trim();
	if (!key) {
		throw new TmdbError(
			'TMDB_API_KEY is not set. Get a free key at https://www.themoviedb.org/settings/api and put it in .env',
			503
		);
	}
	const url = new URL(BASE() + path);
	url.searchParams.set('language', language());
	for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

	const headers: Record<string, string> = { accept: 'application/json' };
	// Support both the v4 "API Read Access Token" (a JWT) and the short v3 API key.
	if (key.startsWith('eyJ')) headers.authorization = `Bearer ${key}`;
	else url.searchParams.set('api_key', key);

	for (let attempt = 0; ; attempt++) {
		const res = await fetch(url, { headers });
		if (res.status === 429 && attempt < 3) {
			const wait = Number(res.headers.get('retry-after') ?? 1) * 1000;
			await new Promise((r) => setTimeout(r, wait));
			continue;
		}
		if (!res.ok) {
			const body = await res.text().catch(() => '');
			throw new TmdbError(`TMDB ${res.status} on ${path}: ${body.slice(0, 200)}`, res.status);
		}
		return (await res.json()) as T;
	}
}

// ---------- Types (only the fields we use) ----------

export type TmdbSearchResult = {
	id: number;
	name: string;
	original_name: string;
	overview: string;
	poster_path: string | null;
	first_air_date: string | null;
	vote_average: number;
	origin_country: string[];
};

type TmdbProviderEntry = { provider_id: number; provider_name: string; logo_path: string | null };

export type TmdbShowDetails = {
	id: number;
	name: string;
	original_name: string;
	overview: string;
	poster_path: string | null;
	backdrop_path: string | null;
	first_air_date: string | null;
	status: string;
	networks: { id: number; name: string }[];
	seasons: {
		season_number: number;
		name: string;
		poster_path: string | null;
		air_date: string | null;
		episode_count: number;
	}[];
	'watch/providers'?: {
		results: Record<
			string,
			{
				link?: string;
				flatrate?: TmdbProviderEntry[];
				free?: TmdbProviderEntry[];
				ads?: TmdbProviderEntry[];
			}
		>;
	};
};

export type TmdbEpisode = {
	id: number;
	season_number: number;
	episode_number: number;
	name: string;
	overview: string;
	air_date: string | null;
	runtime: number | null;
	still_path: string | null;
};

type TmdbSeason = { season_number: number; episodes: TmdbEpisode[] };

// ---------- API ----------

export async function searchShows(query: string) {
	const data = await tmdb<{ results: TmdbSearchResult[] }>('/search/tv', {
		query,
		include_adult: 'false'
	});
	return data.results;
}

/** Full show info incl. every season's episodes and streaming providers for the region. */
export async function getShowWithEpisodes(id: number) {
	const details = await tmdb<TmdbShowDetails>(`/tv/${id}`, {
		append_to_response: 'watch/providers'
	});

	// TMDB allows max 20 sub-requests per append_to_response call.
	const seasonNumbers = details.seasons.map((s) => s.season_number);
	const episodes: TmdbEpisode[] = [];
	for (let i = 0; i < seasonNumbers.length; i += 20) {
		const chunk = seasonNumbers.slice(i, i + 20);
		const data = await tmdb<Record<string, TmdbSeason | undefined>>(`/tv/${id}`, {
			append_to_response: chunk.map((n) => `season/${n}`).join(',')
		});
		for (const n of chunk) episodes.push(...(data[`season/${n}`]?.episodes ?? []));
	}

	const regional = details['watch/providers']?.results?.[region()];
	const seen = new Set<number>();
	const providers: Provider[] = [];
	for (const p of [
		...(regional?.flatrate ?? []),
		...(regional?.free ?? []),
		...(regional?.ads ?? [])
	]) {
		if (seen.has(p.provider_id)) continue;
		seen.add(p.provider_id);
		providers.push({ id: p.provider_id, name: p.provider_name, logo: p.logo_path });
	}

	return { details, episodes, providers, providersLink: regional?.link ?? null };
}
