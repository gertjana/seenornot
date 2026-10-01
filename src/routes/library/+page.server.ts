import { getLibrary } from '$lib/server/library';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => ({ shows: await getLibrary() });
