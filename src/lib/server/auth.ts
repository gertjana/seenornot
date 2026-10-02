import { createHash, randomBytes } from 'node:crypto';
import { eq, lt } from 'drizzle-orm';
import { db, initDb } from './db';
import { sessions, users } from './db/schema';

export { DUMMY_PASSWORD_HASH, hashPassword, verifyPassword } from '../../../scripts/password.mjs';

export const SESSION_COOKIE_NAME = 'session';
export const SESSION_MAX_AGE = 30 * 24 * 60 * 60;

function tokenHash(token: string) {
	return createHash('sha256').update(token).digest('hex');
}

export async function createSession(userId: number) {
	await initDb();
	await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
	const token = randomBytes(32).toString('hex');
	const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000);
	await db.insert(sessions).values({ tokenHash: tokenHash(token), userId, expiresAt });
	return { token, expiresAt };
}

export async function validateSession(
	token: string
): Promise<{ id: number; username: string } | null> {
	if (!/^[a-f0-9]{64}$/.test(token)) return null;
	await initDb();
	const hash = tokenHash(token);
	const [session] = await db
		.select({ user: { id: users.id, username: users.username }, expiresAt: sessions.expiresAt })
		.from(sessions)
		.innerJoin(users, eq(sessions.userId, users.id))
		.where(eq(sessions.tokenHash, hash))
		.limit(1);
	if (!session) return null;
	if (session.expiresAt.getTime() <= Date.now()) {
		await db.delete(sessions).where(eq(sessions.tokenHash, hash));
		return null;
	}
	return session.user;
}

export async function revokeSession(token: string) {
	if (!/^[a-f0-9]{64}$/.test(token)) return;
	await initDb();
	await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash(token)));
}
