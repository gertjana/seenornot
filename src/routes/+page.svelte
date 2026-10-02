<script lang="ts">
	import { markEpisodes, palette } from '$lib/client.svelte';
	import Poster from '$lib/components/Poster.svelte';
	import Progress from '$lib/components/Progress.svelte';
	import Providers from '$lib/components/Providers.svelte';
	import FavoriteButton from '$lib/components/FavoriteButton.svelte';
	import { backdrop, epCode, relativeDay, still, sortTitle } from '$lib/format';
	import type { LibraryShow } from '$lib/types';
	import { flip } from 'svelte/animate';
	import { fade } from 'svelte/transition';

	let { data } = $props();
	const favorites = $derived(
		data.shows
			.filter((s) => s.favorite)
			.sort((a, b) =>
				sortTitle(a.name).localeCompare(sortTitle(b.name), undefined, {
					sensitivity: 'base',
					numeric: true
				})
			)
	);

	const upNext = $derived(
		data.shows
			.filter((s) => s.category === 'watching')
			.sort((a, b) => (b.lastWatchedAt ?? '').localeCompare(a.lastWatchedAt ?? ''))
	);
	const notStarted = $derived(
		data.shows
			.filter((s) => s.category === 'not_started')
			.sort((a, b) => b.addedAt.localeCompare(a.addedAt))
	);
	const comingSoon = $derived(
		data.shows
			.filter((s) => s.upcoming && s.category !== 'not_started')
			.sort((a, b) => (a.upcoming!.airDate ?? '').localeCompare(b.upcoming!.airDate ?? ''))
			.slice(0, 8)
	);

	let pending = $state<Record<number, boolean>>({});

	async function watchNext(show: LibraryShow) {
		const ep = show.next;
		if (!ep || pending[show.id]) return;
		pending[show.id] = true;
		try {
			await markEpisodes([ep.id], true, {
				label: `${show.name} ${epCode(ep.seasonNumber, ep.episodeNumber)} watched`
			});
		} finally {
			pending[show.id] = false;
		}
	}
</script>

{#if data.shows.length === 0}
	<div class="mx-auto mt-16 max-w-md text-center">
		<div class="text-5xl">📺</div>
		<h1 class="mt-4 text-2xl font-bold">Track what you've seen</h1>
		<p class="mt-2 text-zinc-400">
			Add the series you're watching, then tick off episodes with a single tap.
		</p>
		<button
			class="mt-6 rounded-xl bg-amber-400 px-5 py-3 font-semibold text-zinc-950 hover:bg-amber-300"
			onclick={() => (palette.open = true)}>Add your first show</button
		>
		<p class="mt-3 text-xs text-zinc-500">
			Tip: press <kbd class="rounded bg-zinc-800 px-1">/</kbd> anywhere to search
		</p>
	</div>
{:else}
	{#if favorites.length}
		<section class="mb-8">
			<h2 class="mb-3 text-xl font-bold">Favorites</h2>
			<ul class="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
				{#each favorites as show (show.id)}
					<li class="relative">
						<a href="/show/{show.id}"
							><Poster path={show.posterPath} alt={show.name} />
							<div class="mt-2 truncate text-sm font-medium">{show.name}</div></a
						>
						<div class="absolute top-2 right-2">
							<FavoriteButton id={show.id} favorite={show.favorite} name={show.name} />
						</div>
						{#if show.next}<button
								onclick={() => watchNext(show)}
								disabled={pending[show.id]}
								class="mt-1 rounded px-1.5 py-1 font-mono text-xs text-amber-400 hover:bg-zinc-800 disabled:opacity-50"
								title="Mark next episode watched"
								>✓ {epCode(show.next.seasonNumber, show.next.episodeNumber)}</button
							>{/if}
					</li>
				{/each}
			</ul>
		</section>
	{/if}
	<section>
		<h2 class="mb-3 text-xl font-bold">Up next</h2>
		{#if upNext.length === 0}
			<p class="rounded-xl bg-zinc-900 p-6 text-center text-sm text-zinc-400">
				Nothing in progress. Start one of the shows below, or <button
					class="text-amber-400 underline"
					onclick={() => (palette.open = true)}>add a new one</button
				>.
			</p>
		{/if}
		<ul class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
			{#each upNext as show (show.id)}
				{@const ep = show.next!}
				{@const img = still(ep.stillPath) ?? backdrop(show.backdropPath)}
				<li
					animate:flip={{ duration: 250 }}
					in:fade
					class="group relative overflow-hidden rounded-2xl bg-zinc-900 ring-1 ring-zinc-800"
				>
					<a href="/show/{show.id}" class="block">
						<div class="relative aspect-video bg-zinc-800">
							{#if img}
								<img
									src={img}
									alt=""
									class="h-full w-full object-cover opacity-80 transition group-hover:opacity-100"
									loading="lazy"
								/>
							{/if}
							<div
								class="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/30 to-transparent"
							></div>
							<div class="absolute top-2 right-2 max-w-[60%] rounded-lg bg-zinc-950/70 p-1">
								<Providers providers={show.providers} />
							</div>
							<div class="absolute right-3 bottom-2 left-3">
								<div class="truncate text-lg font-semibold">{show.name}</div>
								<div class="truncate text-sm text-zinc-300">
									<span class="font-mono text-amber-400"
										>{epCode(ep.seasonNumber, ep.episodeNumber)}</span
									>
									{ep.name ?? ''}
								</div>
							</div>
						</div>
					</a>
					<div class="flex items-center gap-3 px-3 py-3">
						<div class="flex-1">
							<Progress value={show.watchedAired} max={show.aired} />
							<div class="mt-1.5 text-xs text-zinc-500">
								{show.aired - show.watchedAired} left · {show.watchedAired}/{show.aired} watched
							</div>
						</div>
						<button
							onclick={() => watchNext(show)}
							disabled={pending[show.id]}
							class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-400 text-zinc-950 shadow-lg transition hover:scale-105 hover:bg-amber-300 active:scale-95 disabled:opacity-60"
							title="Mark {epCode(ep.seasonNumber, ep.episodeNumber)} as watched"
							aria-label="Mark {show.name} {epCode(ep.seasonNumber, ep.episodeNumber)} as watched"
						>
							{#if pending[show.id]}
								<div
									class="h-5 w-5 animate-spin rounded-full border-2 border-zinc-900/30 border-t-zinc-900"
								></div>
							{:else}
								<svg
									class="h-6 w-6"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="3"
									><path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round" /></svg
								>
							{/if}
						</button>
					</div>
				</li>
			{/each}
		</ul>
	</section>

	{#if comingSoon.length}
		<section class="mt-10">
			<h2 class="mb-3 text-xl font-bold">Coming soon</h2>
			<ul
				class="divide-y divide-zinc-800 overflow-hidden rounded-2xl bg-zinc-900 ring-1 ring-zinc-800"
			>
				{#each comingSoon as show (show.id)}
					{@const ep = show.upcoming!}
					<li>
						<a
							href="/show/{show.id}"
							class="flex items-center gap-3 px-3 py-2 hover:bg-zinc-800/60"
						>
							<Poster
								path={show.posterPath}
								alt={show.name}
								size="w92"
								class="w-9 shrink-0 rounded"
							/>
							<div class="min-w-0 flex-1">
								<div class="truncate font-medium">{show.name}</div>
								<div class="truncate text-xs text-zinc-400">
									<span class="font-mono">{epCode(ep.seasonNumber, ep.episodeNumber)}</span>
									{ep.name ?? ''}
								</div>
							</div>
							<div class="max-w-24"><Providers providers={show.providers} size="h-5 w-5" /></div>
							<div class="w-24 shrink-0 text-right text-sm text-amber-400">
								{relativeDay(ep.airDate)}
							</div>
						</a>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	{#if notStarted.length}
		<section class="mt-10">
			<h2 class="mb-3 text-xl font-bold">Not started yet</h2>
			<ul class="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
				{#each notStarted as show (show.id)}
					<li class="group relative">
						<a href="/show/{show.id}" class="block">
							<Poster path={show.posterPath} alt={show.name} />
							<div class="mt-1 truncate text-sm">{show.name}</div>
						</a>
						<button
							onclick={() => watchNext(show)}
							disabled={pending[show.id]}
							class="absolute top-2 right-2 rounded-full bg-zinc-950/80 px-2 py-1 text-xs font-medium text-amber-400 opacity-100 ring-1 ring-zinc-700 backdrop-blur transition hover:bg-amber-400 hover:text-zinc-950 sm:opacity-0 sm:group-hover:opacity-100"
							title="Mark the first episode as watched"
							>✓ {show.next ? epCode(show.next.seasonNumber, show.next.episodeNumber) : ''}</button
						>
					</li>
				{/each}
			</ul>
		</section>
	{/if}
{/if}
