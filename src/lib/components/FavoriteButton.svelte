<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { api, toast } from '$lib/client.svelte';

	let { id, favorite, name }: { id: number; favorite: boolean; name: string } = $props();
	let busy = $state(false);
	let optimistic = $state<boolean | null>(null);
	const selected = $derived(optimistic ?? favorite);

	async function toggle() {
		if (busy) return;
		busy = true;
		optimistic = !selected;
		try {
			await api.setFavorite(id, optimistic);
			await invalidateAll();
		} catch (e) {
			toast((e as Error).message, { kind: 'error' });
		} finally {
			optimistic = null;
			busy = false;
		}
	}
</script>

<button
	onclick={toggle}
	disabled={busy}
	aria-pressed={selected}
	aria-label="{selected ? 'Remove' : 'Add'} {name} {selected ? 'from' : 'to'} favorites"
	title={selected ? 'Remove from favorites' : 'Add to favorites'}
	class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-950/80 ring-1 ring-zinc-700 transition hover:ring-amber-400 disabled:opacity-50 {selected
		? 'text-amber-400'
		: 'text-zinc-400'}"
>
	<svg
		viewBox="0 0 24 24"
		class="h-5 w-5"
		fill={selected ? 'currentColor' : 'none'}
		stroke="currentColor"
		stroke-width="1.5"
	>
		<path d="m12 3 2.8 5.7 6.3.9-4.6 4.5 1.1 6.3-5.6-3-5.6 3 1.1-6.3L3 9.6l6.2-.9Z" />
	</svg>
</button>
