import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { createClient } from '@libsql/client';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

const client = createClient({ url: env.DATABASE_URL });

export const db = drizzle(client, { schema });

let ready: Promise<void> | undefined;

/** Enable FK constraints and apply pending migrations (from ./drizzle). Safe to call repeatedly. */
export function initDb() {
	ready ??= (async () => {
		await client.execute('PRAGMA foreign_keys = ON');
		await client.execute('PRAGMA journal_mode = WAL');
		await migrate(db, { migrationsFolder: env.MIGRATIONS_DIR || 'drizzle' });
	})();
	return ready;
}
