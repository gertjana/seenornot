import { json } from '@sveltejs/kit';
import { badRequest } from '$lib/server/api';
import { removeShow } from '$lib/server/library';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async ({ params }) => {
	const id = Number(params.id);
	if (!Number.isInteger(id)) return badRequest('Invalid show id');
	await removeShow(id);
	return json({ ok: true });
};
