<script lang="ts">
	import './layout.css';
	import { page } from '$app/state';
	import SearchPalette from '$lib/components/SearchPalette.svelte';
	import Toasts from '$lib/components/Toasts.svelte';
	import { palette } from '$lib/client.svelte';

	let { children, data } = $props();

	const nav = [
		{ href: '/', label: 'Up next' },
		{ href: '/library', label: 'Library' }
	];

	function onkeydown(e: KeyboardEvent) {
		const el = e.target as HTMLElement;
		const typing = el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
		if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
			e.preventDefault();
			palette.open = !palette.open || e.key === '/';
		}
	}
</script>

<svelte:head>
	<link rel="icon" href="/icon.svg" />
	<link rel="apple-touch-icon" href="/icon.svg" />
	<link rel="manifest" href="/manifest.webmanifest" />
	<meta name="theme-color" content="#09090b" />
	<meta name="apple-mobile-web-app-capable" content="yes" />
	<title>SeenOrNot</title>
</svelte:head>

<svelte:window {onkeydown} />

<div class="min-h-dvh bg-zinc-950 text-zinc-100">
	<header class="sticky top-0 z-30 border-b border-zinc-800/80 bg-zinc-950/85 backdrop-blur">
		<div class="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3 sm:gap-6">
			<a href="/" class="text-lg font-bold tracking-tight">
				Seen<span class="text-amber-400">Or</span>Not
			</a>
			<nav class="flex gap-1">
				{#each nav as n (n.href)}
					<a
						href={n.href}
						class="rounded-lg px-3 py-1.5 text-sm font-medium {page.url.pathname === n.href
							? 'bg-zinc-800 text-white'
							: 'text-zinc-400 hover:text-white'}">{n.label}</a
					>
				{/each}
			</nav>
			<button
				onclick={() => (palette.open = true)}
				class="ml-auto flex items-center gap-2 rounded-lg bg-zinc-900 px-3 py-1.5 text-sm text-zinc-400 ring-1 ring-zinc-800 hover:text-zinc-200 sm:w-64"
			>
				<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
					><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg
				>
				<span class="hidden sm:inline">Search or add a show…</span>
				<kbd class="ml-auto hidden rounded bg-zinc-800 px-1.5 text-xs sm:inline">/</kbd>
			</button>
		</div>
	</header>

	<main class="mx-auto max-w-6xl px-4 py-6">
		{@render children()}
	</main>

	<footer
		class="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-1 px-4 pt-4 pb-24 text-xs text-zinc-600"
	>
		<span
			>Show data by <a
				class="underline hover:text-zinc-400"
				href="https://www.themoviedb.org"
				target="_blank">TMDB</a
			>. This product uses the TMDB API but is not endorsed or certified by TMDB.</span
		>
		<span
			>Streaming availability by <a
				class="underline hover:text-zinc-400"
				href="https://www.justwatch.com"
				target="_blank">JustWatch</a
			>.</span
		>
	</footer>
</div>

<SearchPalette library={data.librarySummary} />
<Toasts />
