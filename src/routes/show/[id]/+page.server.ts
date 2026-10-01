import { error } from '@sveltejs/kit';
import { getShow } from '$lib/server/library';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const data = await getShow(Number(params.id));
	if (!data) error(404, 'Show not in your library');
	return data;
};
