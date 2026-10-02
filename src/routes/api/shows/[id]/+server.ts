import { json } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { badRequest } from '$lib/server/api';
import { db } from '$lib/server/db';
import { userShows } from '$lib/server/db/schema';
import { removeShow } from '$lib/server/library';
import type { RequestHandler } from './$types';

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	const id = Number(params.id);
	if (!Number.isSafeInteger(id) || id <= 0) return badRequest('Invalid show id');
	const body = await request.json().catch(() => null);
	if (typeof body?.favorite !== 'boolean') {
		return badRequest('Expected { favorite: boolean }');
	}
	const [show] = await db
		.update(userShows)
		.set({ favorite: body.favorite })
		.where(and(eq(userShows.userId, locals.user!.id), eq(userShows.showId, id)))
		.returning({ id: userShows.showId, favorite: userShows.favorite });
	if (!show) return json({ message: 'Show not found' }, { status: 404 });
	return json(show);
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	const id = Number(params.id);
	if (!Number.isInteger(id)) return badRequest('Invalid show id');
	await removeShow(locals.user!.id, id);
	return json({ ok: true });
};
