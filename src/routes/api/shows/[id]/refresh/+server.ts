import { json } from '@sveltejs/kit';
import { badRequest, handleApi } from '$lib/server/api';
import { syncShow } from '$lib/server/library';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = ({ params }) =>
	handleApi(async () => {
		const id = Number(params.id);
		if (!Number.isInteger(id)) return badRequest('Invalid show id');
		await syncShow(id);
		return json({ ok: true });
	});
