<script lang="ts">
	import { dismiss, toasts } from '$lib/client.svelte';
	import { fly } from 'svelte/transition';
</script>

<div
	class="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4"
	aria-live="polite"
>
	{#each toasts as t (t.id)}
		<div
			transition:fly={{ y: 20, duration: 150 }}
			class="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-xl px-4 py-3 text-sm shadow-xl ring-1 {t.kind ===
			'error'
				? 'bg-red-950 text-red-100 ring-red-800'
				: 'bg-zinc-800 text-zinc-100 ring-zinc-700'}"
		>
			<span class="flex-1">{t.message}</span>
			{#if t.action}
				<button
					class="font-semibold text-amber-400 hover:text-amber-300"
					onclick={() => {
						t.action!.run();
						dismiss(t.id);
					}}>{t.action.label}</button
				>
			{/if}
			<button
				class="text-zinc-500 hover:text-zinc-300"
				aria-label="Dismiss"
				onclick={() => dismiss(t.id)}>✕</button
			>
		</div>
	{/each}
</div>
