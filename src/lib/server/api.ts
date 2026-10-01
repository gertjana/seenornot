import { json } from '@sveltejs/kit';
import { TmdbError } from './tmdb';

/** Turn known errors into JSON responses the client can show in a toast. */
export async function handleApi(fn: () => Promise<Response>) {
	try {
		return await fn();
	} catch (e) {
		if (e instanceof TmdbError) {
			console.error(e.message);
			return json({ message: e.message }, { status: e.status === 401 ? 401 : 502 });
		}
		throw e;
	}
}

export function badRequest(message: string) {
	return json({ message }, { status: 400 });
}
