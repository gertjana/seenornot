import { getLibrary, refreshStaleShows } from '$lib/server/library';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	// Keep data fresh (new episodes, providers) without blocking the page.
	refreshStaleShows().catch(() => {});
	return { shows: await getLibrary() };
};
