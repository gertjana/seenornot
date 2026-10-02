import { json } from '@sveltejs/kit';
import { badRequest, handleApi } from '$lib/server/api';
import { requireShow, syncShow } from '$lib/server/library';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = ({ params, locals }) =>
	handleApi(async () => {
		const id = Number(params.id);
		if (!Number.isInteger(id)) return badRequest('Invalid show id');
		await requireShow(locals.user!.id, id);
		await syncShow(id);
		return json({ ok: true });
	});
