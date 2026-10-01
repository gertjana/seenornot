import { json } from '@sveltejs/kit';
import { badRequest, handleApi } from '$lib/server/api';
import { syncShow } from '$lib/server/library';
import type { RequestHandler } from './$types';

/** Add a show to the library (by TMDB id) and download all its seasons/episodes. */
export const POST: RequestHandler = ({ request }) =>
	handleApi(async () => {
		const body = await request.json().catch(() => null);
		const id = Number(body?.id);
		if (!Number.isInteger(id) || id <= 0) return badRequest('Invalid show id');
		await syncShow(id);
		return json({ id });
	});
