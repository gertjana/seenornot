import { error } from '@sveltejs/kit';
import { getShow } from '$lib/server/library';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const data = await getShow(locals.user!.id, Number(params.id));
	if (!data) error(404, 'Show not in your library');
	return data;
};
