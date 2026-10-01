<script lang="ts">
	import { poster } from '$lib/format';

	let {
		path,
		alt,
		size = 'w342',
		class: klass = ''
	}: {
		path: string | null;
		alt: string;
		size?: 'w92' | 'w185' | 'w342' | 'w500';
		class?: string;
	} = $props();
</script>

<div class="relative aspect-[2/3] overflow-hidden rounded-lg bg-zinc-800 {klass}">
	{#if path}
		<img src={poster(path, size)} {alt} loading="lazy" class="h-full w-full object-cover" />
	{:else}
		<div
			class="flex h-full w-full items-center justify-center p-2 text-center text-xs text-zinc-500"
		>
			{alt}
		</div>
	{/if}
</div>
