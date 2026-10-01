import { invalidateAll } from '$app/navigation';

type Toast = {
	id: number;
	message: string;
	kind: 'info' | 'error';
	action?: { label: string; run: () => void };
};

let nextId = 1;

export const toasts = $state<Toast[]>([]);

export function toast(
	message: string,
	opts: { kind?: Toast['kind']; action?: Toast['action']; ms?: number } = {}
) {
	const t: Toast = { id: nextId++, message, kind: opts.kind ?? 'info', action: opts.action };
	toasts.push(t);
	setTimeout(() => dismiss(t.id), opts.ms ?? (opts.action ? 6000 : 3500));
}

export function dismiss(id: number) {
	const i = toasts.findIndex((t) => t.id === id);
	if (i >= 0) toasts.splice(i, 1);
}

export const palette = $state({ open: false });

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
	const res = await fetch(url, {
		method,
		headers: body ? { 'content-type': 'application/json' } : undefined,
		body: body ? JSON.stringify(body) : undefined
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error(data?.message ?? `Request failed (${res.status})`);
	return data as T;
}

export const api = {
	search: (q: string, signal?: AbortSignal) =>
		fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal }).then(async (r) => {
			const data = await r.json();
			if (!r.ok) throw new Error(data?.message ?? 'Search failed');
			return data;
		}),
	addShow: (id: number) => request<{ id: number }>('POST', '/api/shows', { id }),
	removeShow: (id: number) => request('DELETE', `/api/shows/${id}`),
	refreshShow: (id: number) => request('POST', `/api/shows/${id}/refresh`),
	setWatched: (ids: number[], watched: boolean) =>
		request<{ count: number }>('POST', '/api/watched', { ids, watched })
};

/**
 * Mark episodes (un)watched with an "Undo" toast. Calls `apply` immediately for optimistic UI
 * and again with the inverse on failure/undo.
 */
export async function markEpisodes(
	ids: number[],
	value: boolean,
	opts: { label?: string; apply?: (ids: number[], value: boolean) => void; undo?: boolean } = {}
) {
	if (!ids.length) return;
	opts.apply?.(ids, value);
	try {
		await api.setWatched(ids, value);
	} catch (e) {
		opts.apply?.(ids, !value);
		toast((e as Error).message, { kind: 'error' });
		return;
	}
	await invalidateAll();
	if (opts.undo === false) return;
	const label =
		opts.label ??
		`${ids.length} episode${ids.length === 1 ? '' : 's'} marked ${value ? 'watched' : 'unwatched'}`;
	toast(label, {
		action: {
			label: 'Undo',
			run: () => markEpisodes(ids, !value, { apply: opts.apply, undo: false })
		}
	});
}
