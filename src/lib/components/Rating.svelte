<script lang="ts">
	let { average, votes }: { average: number | null; votes: number | null } = $props();
</script>

{#if average !== null && votes !== null}
	<span class="text-xs text-zinc-400" title="Viewer rating from TMDB users">
		{#if votes > 0}
			<span class="font-medium text-amber-400">TMDB {average.toFixed(1)}/10</span> · {votes.toLocaleString(
				'en-US'
			)}
			{votes === 1 ? 'vote' : 'votes'}
		{:else}
			TMDB: no votes yet
		{/if}
	</span>
{/if}
