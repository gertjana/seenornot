import { redirect } from '@sveltejs/kit';
import { revokeSession, SESSION_COOKIE_NAME } from '$lib/server/auth';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies }) => {
	const token = cookies.get(SESSION_COOKIE_NAME);
	if (token) await revokeSession(token);
	cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
	redirect(303, '/login');
};
