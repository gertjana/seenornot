import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
import { pathToFileURL } from 'node:url';
import { hashPassword } from './password.mjs';

async function readPassword() {
	if (process.env.SEENORNOT_PASSWORD !== undefined) return process.env.SEENORNOT_PASSWORD;
	if (!process.stdin.isTTY || !process.stdout.isTTY) {
		throw new Error('A terminal or SEENORNOT_PASSWORD is required to enter a password.');
	}
	const hiddenOutput = new Writable({
		write(_chunk, _encoding, callback) {
			callback();
		}
	});
	const prompt = createInterface({ input: process.stdin, output: hiddenOutput, terminal: true });
	const abort = new AbortController();
	prompt.on('SIGINT', () => abort.abort());
	process.stdout.write('Password (12-256 characters): ');
	try {
		return await prompt.question('', { signal: abort.signal });
	} finally {
		prompt.close();
		hiddenOutput.end();
		process.stdout.write('\n');
	}
}

export async function main() {
	if (process.argv.length !== 3) throw new Error('Usage: node scripts/create-user.mjs <username>');
	const username = process.argv[2].trim().toLowerCase();
	if (!/^[a-z0-9_.-]{3,32}$/.test(username)) {
		throw new Error('Username must be 3-32 characters using a-z, 0-9, _, . or -.');
	}
	const password = await readPassword();
	if (password.length < 12 || password.length > 256) {
		throw new Error('Password must be 12-256 characters.');
	}
	const passwordHash = await hashPassword(password);
	const client = createClient({ url: process.env.DATABASE_URL || 'file:local.db' });
	try {
		await client.execute('PRAGMA busy_timeout = 5000');
		await client.execute('PRAGMA foreign_keys = ON');
		await migrate(drizzle(client), { migrationsFolder: process.env.MIGRATIONS_DIR || 'drizzle' });
		const tx = await client.transaction('write');
		try {
			const existing = await tx.execute({
				sql: 'SELECT id FROM users WHERE username = ?',
				args: [username]
			});
			if (existing.rows.length) throw new Error('Username already exists.');
			const inserted = await tx.execute({
				sql: 'INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?) RETURNING id',
				args: [username, passwordHash, Math.floor(Date.now() / 1000)]
			});
			const userId = inserted.rows[0].id;
			const count = await tx.execute('SELECT COUNT(*) AS count FROM users');
			if (Number(count.rows[0].count) === 1) {
				await tx.execute({
					sql: 'INSERT INTO user_shows (user_id, show_id, favorite, added_at) SELECT ?, show_id, favorite, added_at FROM legacy_library',
					args: [userId]
				});
				await tx.execute({
					sql: 'INSERT INTO watched (user_id, episode_id, watched_at) SELECT ?, episode_id, watched_at FROM legacy_watched',
					args: [userId]
				});
				await tx.execute('DELETE FROM legacy_watched');
				await tx.execute('DELETE FROM legacy_library');
			}
			await tx.commit();
		} catch (error) {
			await tx.rollback();
			throw error;
		} finally {
			tx.close();
		}
		console.log(`Created user ${username}.`);
	} finally {
		client.close();
	}
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	main().catch((error) => {
		console.error(error instanceof Error ? error.message : 'User creation failed.');
		process.exitCode = 1;
	});
}
