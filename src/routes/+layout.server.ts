import { db } from '$lib/server/db';
import { shows } from '$lib/server/db/schema';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async () => {
	const rows = await db
		.select({
			id: shows.id,
			name: shows.name,
			posterPath: shows.posterPath,
			firstAirDate: shows.firstAirDate
		})
		.from(shows)
		.orderBy(shows.name);
	return {
		librarySummary: rows.map((r) => ({
			id: r.id,
			name: r.name,
			posterPath: r.posterPath,
			year: r.firstAirDate?.slice(0, 4) ?? null
		}))
	};
};
