import { json } from '@sveltejs/kit';
import { handleApi } from '$lib/server/api';
import { libraryIds } from '$lib/server/library';
import { searchShows } from '$lib/server/tmdb';
import type { SearchResult } from '$lib/types';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ url }) =>
	handleApi(async () => {
		const q = url.searchParams.get('q')?.trim() ?? '';
		if (q.length < 2) return json([]);
		const [results, ids] = await Promise.all([searchShows(q), libraryIds()]);
		const inLib = new Set(ids);
		const out: SearchResult[] = results.slice(0, 12).map((r) => ({
			id: r.id,
			name: r.name,
			year: r.first_air_date ? r.first_air_date.slice(0, 4) : null,
			overview: r.overview,
			posterPath: r.poster_path,
			inLibrary: inLib.has(r.id)
		}));
		return json(out);
	});
