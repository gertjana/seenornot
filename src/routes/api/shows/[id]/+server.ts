import { json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { badRequest } from '$lib/server/api';
import { db } from '$lib/server/db';
import { shows } from '$lib/server/db/schema';
import { removeShow } from '$lib/server/library';
import type { RequestHandler } from './$types';

export const PATCH: RequestHandler = async ({ params, request }) => {
	const id = Number(params.id);
	if (!Number.isSafeInteger(id) || id <= 0) return badRequest('Invalid show id');
	const body = await request.json().catch(() => null);
	if (typeof body?.favorite !== 'boolean') {
		return badRequest('Expected { favorite: boolean }');
	}
	const [show] = await db
		.update(shows)
		.set({ favorite: body.favorite })
		.where(eq(shows.id, id))
		.returning({ id: shows.id, favorite: shows.favorite });
	if (!show) return json({ message: 'Show not found' }, { status: 404 });
	return json(show);
};

export const DELETE: RequestHandler = async ({ params }) => {
	const id = Number(params.id);
	if (!Number.isInteger(id)) return badRequest('Invalid show id');
	await removeShow(id);
	return json({ ok: true });
};
