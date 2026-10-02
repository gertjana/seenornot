import { json } from '@sveltejs/kit';
import { badRequest } from '$lib/server/api';
import { setWatched } from '$lib/server/library';
import type { RequestHandler } from './$types';

/** Body: { ids: number[], watched: boolean } — mark episodes watched / unwatched. */
export const POST: RequestHandler = async ({ request, locals }) => {
	const body = await request.json().catch(() => null);
	const ids: unknown = body?.ids;
	if (
		!Array.isArray(ids) ||
		ids.length > 5000 ||
		!ids.every((i) => Number.isInteger(i)) ||
		typeof body?.watched !== 'boolean'
	) {
		return badRequest('Expected { ids: number[], watched: boolean }');
	}
	const count = await setWatched(locals.user!.id, ids as number[], body.watched);
	return json({ count });
};
