<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { api, markEpisodes, toast } from '$lib/client.svelte';
	import Poster from '$lib/components/Poster.svelte';
	import Progress from '$lib/components/Progress.svelte';
	import Providers from '$lib/components/Providers.svelte';
	import Rating from '$lib/components/Rating.svelte';
	import FavoriteButton from '$lib/components/FavoriteButton.svelte';
	import { backdrop, epCode, formatDate, relativeDay, still } from '$lib/format';
	import { SvelteMap, SvelteSet } from 'svelte/reactivity';
	import { slide } from 'svelte/transition';

	let { data } = $props();

	type Ep = (typeof data.seasons)[number]['episodes'][number];

	// Optimistic overrides on top of server state; reset whenever fresh data arrives.
	let overrides = $state(new SvelteMap<number, boolean>());
	$effect.pre(() => {
		void data.seasons;
		overrides = new SvelteMap();
	});
	const isWatched = (ep: Ep) => overrides.get(ep.id) ?? ep.watched;
	const apply = (ids: number[], value: boolean) => ids.forEach((id) => overrides.set(id, value));

	const regular = $derived(
		data.seasons.filter((s) => s.seasonNumber > 0).flatMap((s) => s.episodes)
	);
	const airedRegular = $derived(regular.filter((e) => e.aired));
	const watchedAired = $derived(airedRegular.filter(isWatched).length);
	const next = $derived(airedRegular.find((e) => !isWatched(e)) ?? null);
	const upcoming = $derived(regular.find((e) => !e.aired && e.airDate) ?? null);

	// Expand the season you're currently in.
	let open = new SvelteSet<number>();
	let initFor = -1;
	$effect.pre(() => {
		if (initFor === data.show.id) return;
		initFor = data.show.id;
		open.clear();
		const s = next?.seasonNumber ?? data.seasons[0]?.seasonNumber;
		if (s !== undefined) open.add(s);
	});
	const toggleOpen = (n: number) => (open.has(n) ? open.delete(n) : open.add(n));

	function toggleEpisode(ep: Ep, e?: MouseEvent) {
		if (e?.shiftKey && !isWatched(ep)) return watchUpTo(ep);
		const value = !isWatched(ep);
		markEpisodes([ep.id], value, {
			apply,
			label: `${epCode(ep.seasonNumber, ep.episodeNumber)} marked ${value ? 'watched' : 'unwatched'}`
		});
	}

	function watchUpTo(ep: Ep) {
		const pool =
			ep.seasonNumber === 0 ? data.seasons.find((s) => s.seasonNumber === 0)!.episodes : regular;
		const ids = pool
			.filter(
				(e) =>
					(e.seasonNumber < ep.seasonNumber ||
						(e.seasonNumber === ep.seasonNumber && e.episodeNumber <= ep.episodeNumber)) &&
					(e.aired || e.id === ep.id) &&
					!isWatched(e)
			)
			.map((e) => e.id);
		markEpisodes(ids, true, {
			apply,
			label: `Watched up to ${epCode(ep.seasonNumber, ep.episodeNumber)} (${ids.length} episode${ids.length === 1 ? '' : 's'})`
		});
	}

	function seasonStats(eps: Ep[]) {
		const aired = eps.filter((e) => e.aired);
		const w = aired.filter(isWatched).length;
		return { aired: aired.length, watched: w, complete: aired.length > 0 && w === aired.length };
	}

	function toggleSeason(season: (typeof data.seasons)[number]) {
		const st = seasonStats(season.episodes);
		const value = !st.complete;
		const ids = season.episodes
			.filter((e) => (value ? e.aired && !isWatched(e) : isWatched(e)))
			.map((e) => e.id);
		markEpisodes(ids, value, {
			apply,
			label: `${season.name ?? 'Season ' + season.seasonNumber} marked ${value ? 'watched' : 'unwatched'}`
		});
	}

	function toggleAll() {
		const value = watchedAired < airedRegular.length;
		const ids = (value ? airedRegular.filter((e) => !isWatched(e)) : regular.filter(isWatched)).map(
			(e) => e.id
		);
		markEpisodes(ids, value, {
			apply,
			label: `All episodes marked ${value ? 'watched' : 'unwatched'}`
		});
	}

	let refreshing = $state(false);
	async function refresh() {
		refreshing = true;
		try {
			await api.refreshShow(data.show.id);
			await invalidateAll();
			toast('Updated from TMDB');
		} catch (e) {
			toast((e as Error).message, { kind: 'error' });
		} finally {
			refreshing = false;
		}
	}

	async function remove() {
		if (!confirm(`Remove "${data.show.name}" and its watch history from your library?`)) return;
		try {
			await api.removeShow(data.show.id);
			toast(`Removed ${data.show.name}`);
			await goto('/library', { invalidateAll: true });
		} catch (e) {
			toast((e as Error).message, { kind: 'error' });
		}
	}

	const bg = $derived(backdrop(data.show.backdropPath));
</script>

<svelte:head><title>{data.show.name} · SeenOrNot</title></svelte:head>

<section class="relative -mx-4 -mt-6 overflow-hidden px-4 pt-6 pb-6 sm:rounded-b-3xl">
	{#if bg}
		<img
			src={bg}
			alt=""
			class="absolute inset-0 -z-10 h-full w-full object-cover opacity-25 blur-[2px]"
		/>
		<div
			class="absolute inset-0 -z-10 bg-gradient-to-b from-zinc-950/40 via-zinc-950/70 to-zinc-950"
		></div>
	{/if}
	<div class="flex gap-4 sm:gap-6">
		<Poster
			path={data.show.posterPath}
			alt={data.show.name}
			size="w342"
			class="w-28 shrink-0 shadow-2xl sm:w-44"
		/>
		<div class="min-w-0 flex-1">
			<div class="flex items-center gap-3">
				<h1 class="flex-1 text-2xl font-bold sm:text-3xl">{data.show.name}</h1>
				<FavoriteButton id={data.show.id} favorite={data.show.favorite} name={data.show.name} />
			</div>
			<div class="mt-1 flex flex-wrap gap-x-3 text-sm text-zinc-400">
				{#if data.show.firstAirDate}<span>{data.show.firstAirDate.slice(0, 4)}</span>{/if}
				{#if data.show.status}<span>{data.show.status}</span>{/if}
				{#if data.show.networks.length}<span>{data.show.networks.join(', ')}</span>{/if}
			</div>
			<div class="mt-2"><Rating average={data.show.voteAverage} votes={data.show.voteCount} /></div>
			{#if data.show.providers.length}
				<div class="mt-3 flex flex-wrap items-center gap-2">
					<Providers providers={data.show.providers} names size="h-6 w-6" />
					{#if data.show.providersLink}
						<a
							href={data.show.providersLink}
							target="_blank"
							rel="noreferrer"
							class="text-xs text-zinc-400 underline hover:text-zinc-200">Where to watch</a
						>
					{/if}
				</div>
			{:else}
				<div class="mt-3 text-xs text-zinc-500">
					No streaming availability listed for your region
				</div>
			{/if}
			<p class="mt-3 line-clamp-3 hidden text-sm text-zinc-300 sm:block">{data.show.overview}</p>
		</div>
	</div>
	<p class="mt-3 line-clamp-4 text-sm text-zinc-300 sm:hidden">{data.show.overview}</p>

	<div class="mt-5 rounded-2xl bg-zinc-900/80 p-4 ring-1 ring-zinc-800 backdrop-blur">
		<div class="flex items-center gap-3">
			<div class="flex-1">
				<Progress value={watchedAired} max={airedRegular.length} />
				<div class="mt-1.5 text-xs text-zinc-400">
					{watchedAired} of {airedRegular.length} aired episodes watched
					{#if upcoming}· next new episode {relativeDay(upcoming.airDate)}{/if}
				</div>
			</div>
		</div>
		<div class="mt-3 flex flex-wrap items-center gap-2">
			{#if next}
				<button
					onclick={() => toggleEpisode(next)}
					class="flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-300 active:scale-95"
				>
					<svg
						class="h-5 w-5"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="3"
						><path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round" /></svg
					>
					<span class="font-mono">{epCode(next.seasonNumber, next.episodeNumber)}</span>
					<span class="max-w-48 truncate font-normal">{next.name}</span>
				</button>
			{:else if airedRegular.length}
				<span class="rounded-xl bg-emerald-900/50 px-4 py-2.5 text-sm text-emerald-300"
					>✓ All caught up</span
				>
			{/if}
			<div class="ml-auto flex gap-2">
				{#if airedRegular.length}
					<button
						onclick={toggleAll}
						class="rounded-lg px-3 py-2 text-sm text-zinc-300 ring-1 ring-zinc-700 hover:bg-zinc-800"
					>
						{watchedAired < airedRegular.length ? 'Mark all watched' : 'Mark all unwatched'}
					</button>
				{/if}
				<button
					onclick={refresh}
					disabled={refreshing}
					class="rounded-lg px-3 py-2 text-sm text-zinc-300 ring-1 ring-zinc-700 hover:bg-zinc-800 disabled:opacity-50"
					title="Re-download seasons, episodes and providers"
					>{refreshing ? 'Updating…' : 'Refresh'}</button
				>
				<button
					onclick={remove}
					class="rounded-lg px-3 py-2 text-sm text-red-400 ring-1 ring-zinc-700 hover:bg-red-950"
					>Remove</button
				>
			</div>
		</div>
	</div>
</section>

<section class="mt-2 flex flex-col gap-3">
	<p class="hidden text-xs text-zinc-500 sm:block">
		Tip: <kbd class="rounded bg-zinc-800 px-1">Shift</kbd>+click a checkbox to mark everything up to
		that episode as watched.
	</p>
	{#each data.seasons as season (season.seasonNumber)}
		{@const st = seasonStats(season.episodes)}
		{@const isOpen = open.has(season.seasonNumber)}
		<div class="overflow-hidden rounded-2xl bg-zinc-900 ring-1 ring-zinc-800">
			<div class="flex items-center gap-3 p-3 sm:p-4">
				<button
					class="flex min-w-0 flex-1 items-center gap-3 text-left"
					onclick={() => toggleOpen(season.seasonNumber)}
					aria-expanded={isOpen}
				>
					<svg
						class="h-4 w-4 shrink-0 text-zinc-500 transition {isOpen ? 'rotate-90' : ''}"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2.5"><path d="M9 6l6 6-6 6" /></svg
					>
					<div class="min-w-0 flex-1">
						<div class="flex items-baseline gap-2">
							<span class="truncate font-semibold"
								>{season.name ?? `Season ${season.seasonNumber}`}</span
							>
							<span class="shrink-0 text-xs text-zinc-500"
								>{st.watched}/{st.aired}{st.aired < season.episodes.length
									? ` (+${season.episodes.length - st.aired} upcoming)`
									: ''}</span
							>
						</div>
						<Progress value={st.watched} max={st.aired} class="mt-1.5 max-w-xs" />
					</div>
				</button>
				{#if st.aired > 0}
					<button
						onclick={() => toggleSeason(season)}
						class="shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition {st.complete
							? 'bg-emerald-900/50 text-emerald-300 hover:bg-zinc-800 hover:text-zinc-300'
							: 'bg-zinc-800 text-zinc-100 hover:bg-amber-400 hover:text-zinc-950'}"
						title={st.complete
							? 'Mark season unwatched'
							: 'Mark all aired episodes in this season watched'}
					>
						{st.complete ? '✓ Watched' : 'Mark season'}
					</button>
				{/if}
			</div>

			{#if isOpen}
				<ul
					transition:slide={{ duration: 150 }}
					class="divide-y divide-zinc-800/70 border-t border-zinc-800"
				>
					{#each season.episodes as ep (ep.id)}
						{@const w = isWatched(ep)}
						<li
							class="group flex items-start gap-3 px-3 py-2.5 sm:px-4 {!ep.aired
								? 'opacity-50'
								: ''}"
						>
							<button
								onclick={(e) => toggleEpisode(ep, e)}
								class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-2 transition active:scale-90 {w
									? 'bg-emerald-500 text-zinc-950 ring-emerald-500'
									: 'text-transparent ring-zinc-600 hover:text-zinc-500 hover:ring-amber-400'}"
								aria-pressed={w}
								aria-label="{w ? 'Unmark' : 'Mark'} {epCode(
									ep.seasonNumber,
									ep.episodeNumber
								)} watched"
								title="Click: toggle · Shift+click: watched up to here"
							>
								<svg
									class="h-5 w-5"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="3"
									><path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round" /></svg
								>
							</button>
							{#if ep.stillPath}
								<img
									src={still(ep.stillPath)}
									alt=""
									loading="lazy"
									class="hidden aspect-video w-28 shrink-0 rounded-md object-cover sm:block"
								/>
							{/if}
							<div class="min-w-0 flex-1">
								<div class="flex items-baseline gap-2">
									<span class="shrink-0 font-mono text-xs text-zinc-500">{ep.episodeNumber}</span>
									<span class="truncate font-medium {w ? 'text-zinc-400' : ''}"
										>{ep.name || `Episode ${ep.episodeNumber}`}</span
									>
								</div>
								<div class="text-xs text-zinc-500">
									{ep.aired ? formatDate(ep.airDate) : `Airs ${relativeDay(ep.airDate)}`}{ep.runtime
										? ` · ${ep.runtime} min`
										: ''}
								</div>
								{#if ep.overview}
									<p class="mt-1 line-clamp-2 text-xs text-zinc-400">{ep.overview}</p>
								{/if}
							</div>
							{#if !w && ep.aired}
								<button
									onclick={() => watchUpTo(ep)}
									class="shrink-0 rounded-md px-2 py-1 text-xs text-zinc-500 opacity-100 ring-1 ring-zinc-700 hover:text-amber-400 sm:opacity-0 sm:group-hover:opacity-100"
									title="Mark this and all previous episodes as watched">Up to here</button
								>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	{/each}
</section>
