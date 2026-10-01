<script lang="ts">
	import { logo } from '$lib/format';
	import type { Provider } from '$lib/types';

	let {
		providers,
		max = 4,
		size = 'h-6 w-6'
	}: { providers: Provider[]; max?: number; size?: string } = $props();
</script>

{#if providers.length}
	<div class="flex items-center gap-1">
		{#each providers.slice(0, max) as p (p.id)}
			{#if p.logo}
				<img
					src={logo(p.logo)}
					alt={p.name}
					title={p.name}
					class="{size} rounded-md"
					loading="lazy"
				/>
			{:else}
				<span class="rounded bg-zinc-700 px-1.5 text-xs" title={p.name}>{p.name}</span>
			{/if}
		{/each}
		{#if providers.length > max}
			<span class="text-xs text-zinc-500">+{providers.length - max}</span>
		{/if}
	</div>
{/if}
