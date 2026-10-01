<script lang="ts">
	import { markEpisodes } from '$lib/client.svelte';
	import Poster from '$lib/components/Poster.svelte';
	import Progress from '$lib/components/Progress.svelte';
	import FavoriteButton from '$lib/components/FavoriteButton.svelte';
	import Providers from '$lib/components/Providers.svelte';
	import { onMount } from 'svelte';
	import { epCode, logo, sortTitle } from '$lib/format';
	import { CATEGORY_LABEL, type LibraryShow, type Provider, type ShowCategory } from '$lib/types';

	let { data } = $props();

	let text = $state('');
	let category = $state<ShowCategory | 'all'>('all');
	let provider = $state<number | null>(null);
	let sort = $state<'activity' | 'name' | 'added' | 'left'>('name');
	let view = $state<'grid' | 'list'>('grid');
	onMount(() => {
		try {
			if (localStorage.getItem('library-view') === 'list') view = 'list';
		} catch {
			/* Storage may be disabled. */
		}
	});
	function setView(value: 'grid' | 'list') {
		view = value;
		try {
			localStorage.setItem('library-view', value);
		} catch {
			/* Storage may be disabled. */
		}
	}

	const providers = $derived.by(() => {
		const map = new Map<number, Provider & { count: number }>();
		for (const s of data.shows)
			for (const p of s.providers) {
				const e = map.get(p.id);
				if (e) e.count++;
				else map.set(p.id, { ...p, count: 1 });
			}
		return [...map.values()].sort((a, b) => b.count - a.count);
	});

	const counts = $derived.by(() => {
		const c: Record<string, number> = { all: data.shows.length };
		for (const s of data.shows) c[s.category] = (c[s.category] ?? 0) + 1;
		return c;
	});

	const norm = (s: string) =>
		s
			.toLowerCase()
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '');

	const filtered = $derived.by(() => {
		const q = norm(text.trim());
		const list = data.shows.filter(
			(s) =>
				(category === 'all' || s.category === category) &&
				(provider === null || s.providers.some((p) => p.id === provider)) &&
				(!q || norm(s.name).includes(q) || s.networks.some((n) => norm(n).includes(q)))
		);
		const by: Record<typeof sort, (a: LibraryShow, b: LibraryShow) => number> = {
			activity: (a, b) =>
				(b.lastWatchedAt ?? b.addedAt).localeCompare(a.lastWatchedAt ?? a.addedAt),
			name: (a, b) =>
				sortTitle(a.name).localeCompare(sortTitle(b.name), undefined, {
					sensitivity: 'base',
					numeric: true
				}) || a.name.localeCompare(b.name),
			added: (a, b) => b.addedAt.localeCompare(a.addedAt),
			left: (a, b) => a.aired - a.watchedAired - (b.aired - b.watchedAired)
		};
		return list.sort(by[sort]);
	});
	const groups = $derived([
		{ title: 'Favorites', shows: filtered.filter((s) => s.favorite) },
		{ title: 'All shows', shows: filtered.filter((s) => !s.favorite) }
	]);
	const seasonColumns = $derived(
		[...new Set(filtered.flatMap((s) => s.seasons.map((season) => season.seasonNumber)))].sort(
			(a, b) => a - b
		)
	);
	let episodePending = $state<Record<number, boolean>>({});
	async function toggleEpisode(ep: LibraryShow['seasons'][number]['episodes'][number]) {
		if (episodePending[ep.id]) return;
		episodePending[ep.id] = true;
		try {
			await markEpisodes([ep.id], !ep.watched);
		} finally {
			episodePending[ep.id] = false;
		}
	}

	const categories: (ShowCategory | 'all')[] = [
		'all',
		'watching',
		'not_started',
		'waiting',
		'completed'
	];

	let pending = $state<Record<number, boolean>>({});
	async function watchNext(show: LibraryShow) {
		if (!show.next || pending[show.id]) return;
		pending[show.id] = true;
		try {
			await markEpisodes([show.next.id], true, {
				label: `${show.name} ${epCode(show.next.seasonNumber, show.next.episodeNumber)} watched`
			});
		} finally {
			pending[show.id] = false;
		}
	}

	const badge: Record<ShowCategory, string> = {
		watching: 'bg-amber-400 text-zinc-950',
		not_started: 'bg-zinc-700 text-zinc-100',
		waiting: 'bg-sky-600 text-white',
		completed: 'bg-emerald-600 text-white'
	};
</script>

<div class="flex flex-col gap-4">
	<div class="flex flex-wrap items-center gap-3">
		<h1 class="text-xl font-bold">Library</h1>
		<input
			bind:value={text}
			type="search"
			placeholder="Filter your shows…"
			class="min-w-0 flex-1 rounded-lg border-0 bg-zinc-900 px-3 py-2 text-sm ring-1 ring-zinc-800 placeholder:text-zinc-500 focus:ring-amber-400 sm:max-w-xs"
		/>
		<select
			bind:value={sort}
			class="rounded-lg border-0 bg-zinc-900 py-2 pr-8 text-sm ring-1 ring-zinc-800 focus:ring-amber-400"
			aria-label="Sort"
		>
			<option value="activity">Recently watched</option>
			<option value="name">Name</option>
			<option value="added">Recently added</option>
			<option value="left">Fewest left</option>
		</select>
		<div class="flex rounded-lg bg-zinc-900 p-1 ring-1 ring-zinc-800" aria-label="Library view">
			{#each ['grid', 'list'] as mode}
				<button
					onclick={() => setView(mode as 'grid' | 'list')}
					aria-pressed={view === mode}
					class="rounded-md px-3 py-1.5 text-sm capitalize {view === mode
						? 'bg-zinc-700 text-white'
						: 'text-zinc-400 hover:text-white'}">{mode}</button
				>
			{/each}
		</div>
	</div>

	<div class="flex flex-wrap gap-2">
		{#each categories as c (c)}
			<button
				onclick={() => (category = c)}
				class="rounded-full px-3 py-1 text-sm ring-1 {category === c
					? 'bg-zinc-100 text-zinc-900 ring-zinc-100'
					: 'text-zinc-300 ring-zinc-700 hover:bg-zinc-800'}"
			>
				{c === 'all' ? 'All' : CATEGORY_LABEL[c]}
				<span class="ml-1 opacity-60">{counts[c] ?? 0}</span>
			</button>
		{/each}
	</div>

	{#if providers.length}
		<div class="flex flex-wrap items-center gap-2">
			<span class="text-xs text-zinc-500">Platform:</span>
			{#each providers as p (p.id)}
				<button
					onclick={() => (provider = provider === p.id ? null : p.id)}
					class="flex items-center gap-1.5 rounded-full py-0.5 pr-2.5 pl-0.5 text-xs ring-1 {provider ===
					p.id
						? 'bg-zinc-100 text-zinc-900 ring-zinc-100'
						: 'text-zinc-300 ring-zinc-700 hover:bg-zinc-800'}"
				>
					{#if p.logo}<img src={logo(p.logo)} alt="" class="h-5 w-5 rounded-full" />{/if}
					{p.name}
					<span class="opacity-60">{p.count}</span>
				</button>
			{/each}
		</div>
	{/if}

	{#if filtered.length === 0}
		<p class="rounded-xl bg-zinc-900 p-8 text-center text-sm text-zinc-400">
			No shows match these filters.
		</p>
	{/if}

	{#if view === 'list' && filtered.length}
		<p class="text-xs text-zinc-400">
			Each square is an episode. Filled: watched. Outline: unwatched. Dimmed: unaired. Tap a square
			to toggle.
		</p>
	{/if}
	{#each groups as group (group.title)}
		{#if group.shows.length}
			<section>
				<h2 class="mb-3 text-lg font-semibold">
					{group.title} <span class="text-sm font-normal text-zinc-500">{group.shows.length}</span>
				</h2>
				{#if view === 'list'}
					<div class="overflow-x-auto rounded-xl ring-1 ring-zinc-800">
						<table class="w-full border-collapse text-left text-sm">
							<thead class="bg-zinc-900 text-xs text-zinc-400">
								<tr
									><th class="p-3" scope="col">Poster</th><th class="p-3" scope="col">Title</th><th
										class="p-3"
										scope="col">Platform</th
									>{#each seasonColumns as n}<th class="min-w-32 p-3" scope="col">Season {n}</th
										>{/each}</tr
								>
							</thead>
							<tbody class="divide-y divide-zinc-800">
								{#each group.shows as show (show.id)}
									<tr class="bg-zinc-900/40 hover:bg-zinc-900">
										<td class="p-3"
											><a href="/show/{show.id}" aria-label="Open {show.name}"
												><Poster
													path={show.posterPath}
													alt={show.name}
													size="w92"
													class="w-10"
												/></a
											></td
										>
										<th scope="row" class="min-w-52 p-3 font-normal"
											><div class="flex items-center gap-3">
												<div class="flex-1">
													<a href="/show/{show.id}" class="font-medium hover:text-amber-400"
														>{show.name}</a
													>
													<div class="mt-1 text-xs text-zinc-500">
														{CATEGORY_LABEL[show.category]} · {show.watchedAired}/{show.aired}
													</div>
												</div>
												<FavoriteButton id={show.id} favorite={show.favorite} name={show.name} />
											</div></th
										>
										<td class="p-3"
											><Providers
												providers={show.providers}
												max={show.providers.length}
											/>{#if !show.providers.length}<span class="text-zinc-600">-</span>{/if}</td
										>
										{#each seasonColumns as n}
											{@const season = show.seasons.find((s) => s.seasonNumber === n)}
											<td class="p-3 align-middle">
												{#if season}
													<div class="flex w-32 flex-wrap gap-1.5">
														{#each season.episodes as ep (ep.id)}
															<button
																onclick={() => toggleEpisode(ep)}
																disabled={episodePending[ep.id]}
																aria-pressed={ep.watched}
																aria-label="{show.name} {epCode(n, ep.episodeNumber)}: {ep.watched
																	? 'watched, mark unwatched'
																	: 'unwatched, mark watched'}"
																title="{epCode(n, ep.episodeNumber)} · {ep.watched
																	? 'Watched'
																	: ep.aired
																		? 'Unwatched'
																		: 'Unaired'}"
																class="h-5 w-5 rounded-sm border-2 transition hover:scale-110 hover:border-amber-400 focus-visible:outline-2 focus-visible:outline-amber-400 disabled:opacity-30 {ep.watched
																	? 'border-emerald-500 bg-emerald-500'
																	: ep.aired
																		? 'border-zinc-500'
																		: 'border-dashed border-zinc-700'}"
															></button>
														{/each}
													</div>
												{:else}<span class="text-zinc-600">-</span>{/if}
											</td>
										{/each}
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{:else}
					<ul class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
						{#each group.shows as show (show.id)}
							<li class="group relative">
								<a href="/show/{show.id}" class="block">
									<div class="relative">
										<Poster
											path={show.posterPath}
											alt={show.name}
											class="ring-1 ring-zinc-800 transition group-hover:ring-zinc-500"
										/>
										<span
											class="absolute top-2 left-2 rounded-full px-2 py-0.5 text-[10px] font-semibold {badge[
												show.category
											]}"
										>
											{CATEGORY_LABEL[show.category]}
										</span>
										{#if show.providers[0]?.logo}
											<img
												src={logo(show.providers[0].logo)}
												alt={show.providers[0].name}
												title={show.providers.map((p) => p.name).join(', ')}
												class="absolute right-2 bottom-2 h-7 w-7 rounded-md shadow"
											/>
										{/if}
									</div>
									<div class="mt-2 truncate text-sm font-medium">{show.name}</div>
								</a>
								<div class="absolute top-8 right-2">
									<FavoriteButton id={show.id} favorite={show.favorite} name={show.name} />
								</div>
								<Progress value={show.watchedAired} max={show.aired} class="mt-1.5" />
								<div class="mt-1 flex items-center justify-between text-xs text-zinc-500">
									<span>{show.watchedAired}/{show.aired}</span>
									{#if show.next}
										<button
											onclick={() => watchNext(show)}
											disabled={pending[show.id]}
											class="rounded px-1.5 py-0.5 font-mono text-amber-400 hover:bg-amber-400 hover:text-zinc-950 disabled:opacity-50"
											title="Mark next episode watched"
										>
											✓ {epCode(show.next.seasonNumber, show.next.episodeNumber)}
										</button>
									{/if}
								</div>
							</li>
						{/each}
					</ul>
				{/if}
			</section>
		{/if}
	{/each}
</div>
