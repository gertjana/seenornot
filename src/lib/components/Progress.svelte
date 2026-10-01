<script lang="ts">
	let { value, max, class: klass = '' }: { value: number; max: number; class?: string } = $props();
	const pct = $derived(max > 0 ? Math.min(100, (value / max) * 100) : 0);
</script>

<div
	class="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800 {klass}"
	role="progressbar"
	aria-valuenow={value}
	aria-valuemax={max}
>
	<div
		class="h-full rounded-full transition-all duration-300 {pct >= 100
			? 'bg-emerald-500'
			: 'bg-amber-400'}"
		style="width: {pct}%"
	></div>
</div>
