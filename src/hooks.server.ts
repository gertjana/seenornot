import { json, redirect, type Handle, type ServerInit } from '@sveltejs/kit';
import { initDb } from '$lib/server/db';
import { SESSION_COOKIE_NAME, validateSession } from '$lib/server/auth';

export const init: ServerInit = async () => {
	await initDb();
};

export const handle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get(SESSION_COOKIE_NAME);
	event.locals.user = token ? await validateSession(token) : null;
	if (token && !event.locals.user) event.cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
	const path = event.url.pathname;
	const publicRoute = path === '/health' || path === '/login' || path === '/login/__data.json';
	if (event.route.id && !publicRoute && !event.locals.user) {
		if (path.startsWith('/api/')) return json({ message: 'Please log in.' }, { status: 401 });
		redirect(303, '/login');
	}
	// JSON mutations must also be same-origin; SvelteKit checks form submissions itself.
	if (!['GET', 'HEAD', 'OPTIONS'].includes(event.request.method)) {
		const origin = event.request.headers.get('origin');
		if (origin && origin !== event.url.origin)
			return json({ message: 'Invalid origin' }, { status: 403 });
	}
	const response = await resolve(event);
	if (event.route.id && path !== '/health')
		response.headers.set('cache-control', 'private, no-store');
	return response;
};
