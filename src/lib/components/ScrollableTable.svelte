<script lang="ts">
	import type { Snippet } from 'svelte';

	let { label, children }: { label: string; children: Snippet } = $props();
	let viewport = $state<HTMLDivElement>();
	let canLeft = $state(false);
	let canRight = $state(false);

	function update() {
		if (!viewport) return;
		canLeft = viewport.scrollLeft > 1;
		canRight = viewport.scrollLeft + viewport.clientWidth < viewport.scrollWidth - 1;
	}

	$effect(() => {
		if (!viewport) return;
		const observer = new ResizeObserver(update);
		observer.observe(viewport);
		if (viewport.firstElementChild) observer.observe(viewport.firstElementChild);
		update();
		return () => observer.disconnect();
	});

	function scroll(direction: number) {
		viewport?.scrollBy({
			left: direction * Math.max(160, viewport.clientWidth * 0.65),
			behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'
		});
	}

	function keydown(event: KeyboardEvent) {
		if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
		if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
			event.preventDefault();
			scroll(event.key === 'ArrowLeft' ? -1 : 1);
		}
	}
</script>

<div>
	<div
		class="sticky top-16 z-20 mb-2 flex items-center justify-between gap-3 rounded-lg bg-zinc-950/95 px-2 py-2 ring-1 ring-zinc-800 backdrop-blur"
	>
		<span class="text-xs text-zinc-400"
			>{label}
			<span class="hidden sm:inline">· Focus table to use Left/Right arrow keys</span></span
		>
		<div class="flex gap-2">
			<button
				onclick={() => scroll(-1)}
				disabled={!canLeft}
				aria-label="Scroll {label} left"
				class="h-9 w-10 rounded-md bg-zinc-800 text-lg hover:bg-zinc-700 disabled:opacity-30"
				>&larr;</button
			>
			<button
				onclick={() => scroll(1)}
				disabled={!canRight}
				aria-label="Scroll {label} right"
				class="h-9 w-10 rounded-md bg-zinc-800 text-lg hover:bg-zinc-700 disabled:opacity-30"
				>&rarr;</button
			>
		</div>
	</div>
	<!-- Scroll regions need keyboard focus so users can navigate without a mouse. -->
	<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
	<div
		bind:this={viewport}
		onscroll={update}
		onkeydown={keydown}
		role="region"
		aria-label="{label} season table"
		tabindex="0"
		class="overflow-x-auto rounded-xl ring-1 ring-zinc-800 focus-visible:outline-2 focus-visible:outline-amber-400"
	>
		{@render children()}
	</div>
</div>
