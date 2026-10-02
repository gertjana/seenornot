<script lang="ts">
	import { logo } from '$lib/format';
	import type { Provider } from '$lib/types';

	let {
		providers,
		max = Infinity,
		size = 'h-6 w-6',
		names = false
	}: { providers: Provider[]; max?: number; size?: string; names?: boolean } = $props();
</script>

{#if providers.length}
	<div class="flex flex-wrap items-center gap-1.5" aria-label="Streaming platforms">
		{#each providers.slice(0, max) as p (p.id)}
			<span
				class="inline-flex items-center gap-1.5 {names ? 'rounded-lg bg-zinc-800 px-2 py-1' : ''}"
			>
				{#if p.logo}
					<img
						src={logo(p.logo)}
						alt={p.name}
						title={p.name}
						class="{size} shrink-0 rounded-md"
						loading="lazy"
					/>
				{:else}
					<span class="rounded bg-zinc-700 px-1.5 text-xs" title={p.name}>{p.name}</span>
				{/if}
				{#if names && p.logo}<span class="text-xs text-zinc-300">{p.name}</span>{/if}
			</span>
		{/each}
		{#if providers.length > max}
			<span class="text-xs text-zinc-500">+{providers.length - max}</span>
		{/if}
	</div>
{/if}
