import { getLibrary } from '$lib/server/library';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => ({
	shows: await getLibrary(locals.user!.id)
});
