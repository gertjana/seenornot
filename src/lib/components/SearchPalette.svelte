<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { api, palette, toast } from '$lib/client.svelte';
	import { poster } from '$lib/format';
	import type { SearchResult } from '$lib/types';
	import { tick } from 'svelte';

	type LibItem = { id: number; name: string; posterPath: string | null; year: string | null };
	let { library }: { library: LibItem[] } = $props();

	let query = $state('');
	let remote = $state<SearchResult[]>([]);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let active = $state(0);
	let adding = $state<Record<number, 'busy' | 'done'>>({});
	let input = $state<HTMLInputElement>();

	const normalize = (s: string) =>
		s
			.toLowerCase()
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '');

	const local = $derived.by(() => {
		const q = normalize(query.trim());
		if (!q) return [];
		return library.filter((s) => normalize(s.name).includes(q)).slice(0, 5);
	});

	const localIds = $derived(new Set(local.map((s) => s.id)));

	type Item =
		| { kind: 'lib'; id: number; name: string; posterPath: string | null; year: string | null }
		| { kind: 'tmdb'; r: SearchResult };

	const items = $derived<Item[]>([
		...local.map((s) => ({ kind: 'lib' as const, ...s })),
		...remote.filter((r) => !localIds.has(r.id)).map((r) => ({ kind: 'tmdb' as const, r }))
	]);

	// Debounced remote search
	$effect(() => {
		const q = query.trim();
		active = 0;
		if (q.length < 2) {
			remote = [];
			loading = false;
			error = null;
			return;
		}
		const ctrl = new AbortController();
		loading = true;
		const t = setTimeout(async () => {
			try {
				remote = await api.search(q, ctrl.signal);
				error = null;
			} catch (e) {
				if ((e as Error).name !== 'AbortError') error = (e as Error).message;
			} finally {
				if (!ctrl.signal.aborted) loading = false;
			}
		}, 250);
		return () => {
			clearTimeout(t);
			ctrl.abort();
		};
	});

	$effect(() => {
		if (palette.open) {
			tick().then(() => input?.select());
		}
	});

	function close() {
		palette.open = false;
	}

	async function add(r: SearchResult, open: boolean) {
		if (r.inLibrary || adding[r.id] === 'done') {
			if (open) {
				close();
				await goto(`/show/${r.id}`);
			}
			return;
		}
		adding[r.id] = 'busy';
		try {
			await api.addShow(r.id);
			adding[r.id] = 'done';
			r.inLibrary = true;
			toast(`Added ${r.name}`);
			if (open) {
				close();
				await goto(`/show/${r.id}`);
			} else {
				await invalidateAll();
			}
		} catch (e) {
			delete adding[r.id];
			toast((e as Error).message, { kind: 'error' });
		}
	}

	async function choose(item: Item | undefined, open = true) {
		if (!item) return;
		if (item.kind === 'lib') {
			close();
			await goto(`/show/${item.id}`);
		} else {
			await add(item.r, open);
		}
	}

	function onkeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') close();
		else if (e.key === 'ArrowDown') {
			e.preventDefault();
			active = Math.min(items.length - 1, active + 1);
			scrollActive();
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			active = Math.max(0, active - 1);
			scrollActive();
		} else if (e.key === 'Enter') {
			e.preventDefault();
			// Shift+Enter: add without opening
			choose(items[active], !e.shiftKey);
		}
	}

	function scrollActive() {
		tick().then(() =>
			document.getElementById(`pal-item-${active}`)?.scrollIntoView({ block: 'nearest' })
		);
	}
</script>

{#if palette.open}
	<div
		class="fixed inset-0 z-40 flex items-start justify-center bg-black/60 p-4 pt-[10vh] backdrop-blur-sm"
	>
		<button class="absolute inset-0 cursor-default" aria-label="Close search" onclick={close}
		></button>
		<div
			class="relative flex max-h-[75vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-zinc-900 shadow-2xl ring-1 ring-zinc-700"
			role="dialog"
			aria-modal="true"
			aria-label="Search shows"
		>
			<div class="flex items-center gap-3 border-b border-zinc-800 px-4">
				<svg
					class="h-5 w-5 text-zinc-500"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg
				>
				<input
					bind:this={input}
					bind:value={query}
					{onkeydown}
					placeholder="Search a series to add or open…"
					class="flex-1 border-0 bg-transparent py-4 text-base text-zinc-100 placeholder:text-zinc-500 focus:ring-0"
					autocomplete="off"
					spellcheck="false"
				/>
				{#if loading}
					<div
						class="h-4 w-4 animate-spin rounded-full border-2 border-zinc-600 border-t-amber-400"
					></div>
				{/if}
				<kbd class="hidden rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-400 sm:block"
					>Esc</kbd
				>
			</div>

			<ul class="overflow-y-auto p-2">
				{#if error}
					<li class="p-4 text-sm text-red-400">{error}</li>
				{/if}
				{#each items as item, i (item.kind + (item.kind === 'lib' ? item.id : item.r.id))}
					{@const id = item.kind === 'lib' ? item.id : item.r.id}
					{@const name = item.kind === 'lib' ? item.name : item.r.name}
					{@const year = item.kind === 'lib' ? item.year : item.r.year}
					{@const posterPath = item.kind === 'lib' ? item.posterPath : item.r.posterPath}
					{@const inLib = item.kind === 'lib' || item.r.inLibrary || adding[id] === 'done'}
					{#if i === 0 && item.kind === 'lib'}
						<li class="px-3 pt-1 pb-2 text-xs font-medium tracking-wide text-zinc-500 uppercase">
							In your library
						</li>
					{:else if item.kind === 'tmdb' && (i === 0 || items[i - 1].kind === 'lib')}
						<li class="px-3 pt-3 pb-2 text-xs font-medium tracking-wide text-zinc-500 uppercase">
							Add from TMDB
						</li>
					{/if}
					<li id="pal-item-{i}">
						<div
							class="flex w-full items-center gap-3 rounded-xl p-2 text-left {i === active
								? 'bg-zinc-800'
								: 'hover:bg-zinc-800/60'}"
							role="option"
							aria-selected={i === active}
							tabindex="-1"
							onmouseenter={() => (active = i)}
						>
							<button
								class="flex min-w-0 flex-1 items-center gap-3 text-left"
								onclick={() => choose(item)}
							>
								<img
									src={poster(posterPath, 'w92') ?? ''}
									alt=""
									class="h-16 w-11 shrink-0 rounded bg-zinc-800 object-cover"
									loading="lazy"
								/>
								<div class="min-w-0 flex-1">
									<div class="truncate font-medium text-zinc-100">
										{name}
										{#if year}<span class="font-normal text-zinc-500">({year})</span>{/if}
									</div>
									{#if item.kind === 'tmdb' && item.r.overview}
										<div class="line-clamp-2 text-xs text-zinc-400">{item.r.overview}</div>
									{/if}
								</div>
							</button>
							{#if inLib}
								<span
									class="shrink-0 rounded-full bg-emerald-900/60 px-2.5 py-1 text-xs text-emerald-300"
									>In library</span
								>
							{:else}
								<button
									class="shrink-0 rounded-full bg-amber-400 px-3 py-1 text-sm font-semibold text-zinc-950 hover:bg-amber-300 disabled:opacity-60"
									disabled={adding[id] === 'busy'}
									onclick={() => item.kind === 'tmdb' && add(item.r, false)}
									title="Add without opening (Shift+Enter)"
								>
									{adding[id] === 'busy' ? 'Adding…' : '+ Add'}
								</button>
							{/if}
						</div>
					</li>
				{:else}
					{#if query.trim().length >= 2 && !loading && !error}
						<li class="p-6 text-center text-sm text-zinc-500">No shows found</li>
					{:else if !query.trim()}
						<li class="p-6 text-center text-sm text-zinc-500">
							Type a title. <kbd class="rounded bg-zinc-800 px-1">Enter</kbd> adds &amp; opens,
							<kbd class="rounded bg-zinc-800 px-1">Shift+Enter</kbd> just adds.
						</li>
					{/if}
				{/each}
			</ul>
		</div>
	</div>
{/if}
