import type { Handle, ServerInit } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { initDb } from '$lib/server/db';

export const init: ServerInit = async () => {
	await initDb();
};

/**
 * Optional protection when exposing the app publicly:
 * set APP_PASSWORD (and optionally APP_USER) to require HTTP Basic auth.
 */
export const handle: Handle = async ({ event, resolve }) => {
	const password = env.APP_PASSWORD;
	if (password && event.url.pathname !== '/health') {
		const expected = 'Basic ' + btoa(`${env.APP_USER || 'me'}:${password}`);
		if (event.request.headers.get('authorization') !== expected) {
			return new Response('Authentication required', {
				status: 401,
				headers: { 'www-authenticate': 'Basic realm="SeenOrNot", charset="UTF-8"' }
			});
		}
	}
	return resolve(event);
};
