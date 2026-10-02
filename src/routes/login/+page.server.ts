import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import {
	createSession,
	DUMMY_PASSWORD_HASH,
	SESSION_COOKIE_NAME,
	SESSION_MAX_AGE,
	verifyPassword
} from '$lib/server/auth';
import { db, initDb } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;
const MAX_BUCKETS = 10_000;
const attempts = new Map<string, { failures: number; pending: number; expiresAt: number }>();
const INVALID_CREDENTIALS = 'Invalid username or password.';

export const load: PageServerLoad = ({ locals }) => {
	if (locals.user) redirect(303, '/library');
};

export const actions: Actions = {
	default: async ({ request, locals, cookies, url, getClientAddress, setHeaders }) => {
		if (locals.user) redirect(303, '/library');
		const form = await request.formData();
		const rawUsername = form.get('username');
		const rawPassword = form.get('password');
		const username = typeof rawUsername === 'string' ? rawUsername.trim().toLowerCase() : '';
		const password = typeof rawPassword === 'string' ? rawPassword : '';
		const validInput =
			/^[a-z0-9_.-]{3,32}$/.test(username) && password.length >= 12 && password.length <= 256;
		const now = Date.now();
		for (const [key, bucket] of attempts) {
			if (bucket.expiresAt <= now && bucket.pending === 0) attempts.delete(key);
		}
		const keys = [`ip:${getClientAddress()}`, `username:${username.slice(0, 32)}`];
		const buckets = keys.map((key) => attempts.get(key));
		if (
			buckets.some((bucket) => bucket && bucket.failures + bucket.pending >= MAX_FAILURES) ||
			attempts.size + buckets.filter((bucket) => !bucket).length > MAX_BUCKETS
		) {
			setHeaders({ 'retry-after': String(WINDOW_MS / 1000) });
			return fail(429, { username: username.slice(0, 32), error: INVALID_CREDENTIALS });
		}
		const reserved = keys.map((key) => {
			let bucket = attempts.get(key);
			if (!bucket) {
				bucket = { failures: 0, pending: 0, expiresAt: now + WINDOW_MS };
				attempts.set(key, bucket);
			}
			bucket.pending++;
			return bucket;
		});
		let verified = false;
		let user: { id: number; passwordHash: string } | undefined;
		try {
			await initDb();
			if (validInput) {
				[user] = await db
					.select({ id: users.id, passwordHash: users.passwordHash })
					.from(users)
					.where(eq(users.username, username))
					.limit(1);
			}
			const matches = await verifyPassword(
				password.slice(0, 256),
				user?.passwordHash ?? DUMMY_PASSWORD_HASH
			);
			verified = Boolean(validInput && user && matches);
		} finally {
			for (const bucket of reserved) {
				bucket.pending--;
				if (!verified) bucket.failures++;
			}
		}
		if (!verified || !user) {
			return fail(400, { username: username.slice(0, 32), error: INVALID_CREDENTIALS });
		}
		const { token, expiresAt } = await createSession(user.id);
		cookies.set(SESSION_COOKIE_NAME, token, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: url.protocol === 'https:',
			maxAge: SESSION_MAX_AGE,
			expires: expiresAt
		});
		redirect(303, '/library');
	}
};
