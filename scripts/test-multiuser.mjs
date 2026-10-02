import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';

// Run against the production build, using an isolated temporary database.
const folder = await mkdtemp(join(tmpdir(), 'seenornot-auth-'));
const databaseUrl = `file:${folder}/test.db`;
const client = createClient({ url: databaseUrl });
let app;
try {
	const journal = JSON.parse(await readFile('drizzle/meta/_journal.json', 'utf8'));
	const oldDir = `${folder}/old`;
	await mkdir(`${oldDir}/meta`, { recursive: true });
	await writeFile(
		`${oldDir}/meta/_journal.json`,
		JSON.stringify({ ...journal, entries: journal.entries.slice(0, 3) })
	);
	for (const entry of journal.entries.slice(0, 3))
		await writeFile(`${oldDir}/${entry.tag}.sql`, await readFile(`drizzle/${entry.tag}.sql`));
	await migrate(drizzle(client), { migrationsFolder: oldDir });
	await client.execute(
		"INSERT INTO shows(id,name,favorite,added_at,synced_at,vote_count) VALUES(1,'Legacy show',1,123,9999999999,1)"
	);
	await client.execute("INSERT INTO seasons(show_id,season_number,name) VALUES(1,1,'Season 1')");
	await client.execute(
		"INSERT INTO episodes(id,show_id,season_number,episode_number,air_date) VALUES(100,1,1,1,'2020-01-01')"
	);
	await client.execute('INSERT INTO watched(episode_id,watched_at) VALUES(100,456)');
	const password = 'test-password-1234';
	const env = { ...process.env, DATABASE_URL: databaseUrl, SEENORNOT_PASSWORD: password };
	for (const name of ['alice', 'bob'])
		execFileSync(process.execPath, ['scripts/create-user.mjs', name], { env, stdio: 'pipe' });
	const scalar = async (sql) => Object.values((await client.execute(sql)).rows[0])[0];
	assert.equal(await scalar('SELECT favorite FROM user_shows WHERE user_id=1 AND show_id=1'), 1);
	assert.equal(await scalar('SELECT added_at FROM user_shows WHERE user_id=1 AND show_id=1'), 123);
	assert.equal(
		await scalar('SELECT watched_at FROM watched WHERE user_id=1 AND episode_id=100'),
		456
	);
	assert.equal(await scalar('SELECT COUNT(*) FROM user_shows WHERE user_id=2'), 0);
	assert.equal(await scalar('SELECT COUNT(*) FROM legacy_library'), 0);
	assert.equal(await scalar('SELECT COUNT(*) FROM legacy_watched'), 0);
	assert.notEqual(await scalar('SELECT password_hash FROM users WHERE id=1'), password);
	app = spawn(process.execPath, ['build'], {
		env: { ...env, PORT: '3100', ORIGIN: 'http://127.0.0.1:3100' },
		stdio: 'inherit'
	});
	const base = 'http://127.0.0.1:3100';
	for (let i = 0; i < 100; i++) {
		try {
			if ((await fetch(`${base}/health`)).ok) break;
		} catch {
			/* Wait for startup. */
		}
		await new Promise((resolve) => setTimeout(resolve, 100));
	}
	const request = (path, cookie, method = 'GET', body, origin) =>
		fetch(`${base}${path}`, {
			redirect: 'manual',
			method,
			headers: {
				...(cookie ? { cookie } : {}),
				...(body ? { 'content-type': 'application/json' } : {}),
				...(origin ? { origin } : {})
			},
			body: body ? JSON.stringify(body) : undefined
		});
	assert.equal((await request('/library')).status, 303);
	assert.equal((await request('/api/search?q=test')).status, 401);
	assert.equal((await request('/login')).status, 200);
	const login = async (username, secret = password) =>
		fetch(`${base}/login`, {
			redirect: 'manual',
			method: 'POST',
			headers: { origin: base, accept: 'text/html' },
			body: new URLSearchParams({ username, password: secret })
		});
	assert.equal((await login('alice', 'incorrect-password')).status, 400);
	const aliceLogin = await login('ALICE');
	assert.equal(aliceLogin.status, 303);
	const alice = aliceLogin.headers.get('set-cookie').split(';')[0];
	assert.ok(aliceLogin.headers.get('set-cookie').includes('HttpOnly'));
	assert.ok(aliceLogin.headers.get('set-cookie').includes('SameSite=Lax'));
	const bob = (await login('bob')).headers.get('set-cookie').split(';')[0];
	assert.equal((await request('/show/1', bob)).status, 404);
	assert.equal((await request('/api/shows/1', bob, 'PATCH', { favorite: true })).status, 404);
	assert.equal((await request('/api/shows/1/refresh', bob, 'POST')).status, 404);
	assert.equal(
		(await request('/api/watched', bob, 'POST', { ids: [100], watched: true })).status,
		404
	);
	// Both accounts follow the same catalog entry, but have independent personal state.
	await client.execute(
		'INSERT INTO user_shows(user_id,show_id,favorite,added_at) VALUES(2,1,0,789)'
	);
	assert.equal(
		(await request('/api/watched', alice, 'POST', { ids: [100], watched: false })).status,
		200
	);
	assert.equal(
		(await request('/api/watched', bob, 'POST', { ids: [100], watched: true })).status,
		200
	);
	assert.equal(await scalar('SELECT COUNT(*) FROM watched WHERE user_id=1'), 0);
	assert.equal(await scalar('SELECT COUNT(*) FROM watched WHERE user_id=2'), 1);
	assert.equal((await request('/api/shows/1', bob, 'PATCH', { favorite: true })).status, 200);
	assert.equal((await request('/api/shows/1', alice, 'PATCH', { favorite: false })).status, 200);
	assert.equal(await scalar('SELECT favorite FROM user_shows WHERE user_id=2'), 1);
	assert.equal(
		(await request('/api/shows/1', bob, 'PATCH', { favorite: false }, 'https://evil.example'))
			.status,
		403
	);
	assert.equal((await request('/api/shows/1', alice, 'DELETE')).status, 200);
	assert.equal((await request('/show/1', alice)).status, 404);
	assert.equal((await request('/show/1', bob)).status, 200);
	assert.equal(await scalar('SELECT COUNT(*) FROM watched WHERE user_id=2'), 1);
	assert.equal((await request('/logout', bob, 'POST')).status, 303);
	assert.equal((await request('/library', bob)).status, 303);
	const token = alice.split('=')[1];
	const hash = createHash('sha256').update(token).digest('hex');
	await client.execute({
		sql: 'UPDATE sessions SET expires_at=1 WHERE token_hash=?',
		args: [hash]
	});
	assert.equal((await request('/library', alice)).status, 303);
	// One earlier incorrect login already consumed one IP failure.
	for (let i = 0; i < 4; i++)
		assert.equal((await login('unknown', 'incorrect-password')).status, 400);
	assert.equal((await login('unknown', 'incorrect-password')).status, 429);
	console.log(
		'PASS: legacy upgrade, account provisioning, password hashing, sessions, isolation, logout, expiry, CSRF and rate limits.'
	);
} finally {
	if (app) {
		app.kill('SIGTERM');
		await new Promise((resolve) => app.once('exit', resolve));
	}
	client.close();
	await rm(folder, { recursive: true, force: true });
}
