import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { shows, userShows } from '$lib/server/db/schema';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) return { user: null, librarySummary: [] };
	const rows = await db
		.select({
			id: shows.id,
			name: shows.name,
			posterPath: shows.posterPath,
			firstAirDate: shows.firstAirDate
		})
		.from(shows)
		.innerJoin(userShows, eq(userShows.showId, shows.id))
		.where(eq(userShows.userId, locals.user!.id))
		.orderBy(shows.name);
	return {
		user: locals.user,
		librarySummary: rows.map((r) => ({
			id: r.id,
			name: r.name,
			posterPath: r.posterPath,
			year: r.firstAirDate?.slice(0, 4) ?? null
		}))
	};
};
