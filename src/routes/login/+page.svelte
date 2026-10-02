<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
	let pending = $state(false);
</script>

<svelte:head>
	<title>Sign in | SeenOrNot</title>
</svelte:head>

<section class="mx-auto flex min-h-[65vh] w-full max-w-sm flex-col justify-center py-12">
	<p class="mb-3 text-xs font-semibold tracking-widest text-amber-400 uppercase">SeenOrNot</p>
	<h1 class="text-3xl font-bold tracking-tight text-zinc-100">Your shows. Your progress.</h1>
	<p class="mt-3 mb-8 text-sm leading-relaxed text-zinc-400">
		Sign in to pick up where you left off.
	</p>

	<form
		method="POST"
		class="flex flex-col gap-5 rounded-xl bg-zinc-900 p-6 ring-1 ring-zinc-800"
		use:enhance={() => {
			pending = true;
			return async ({ update }) => {
				try {
					await update();
				} finally {
					pending = false;
				}
			};
		}}
		aria-busy={pending}
	>
		<div>
			<label for="username" class="mb-2 block text-sm font-medium text-zinc-200">Username</label>
			<input
				id="username"
				name="username"
				type="text"
				autocomplete="username"
				autocapitalize="none"
				spellcheck={false}
				required
				minlength="3"
				maxlength="32"
				value={form?.username ?? ''}
				aria-describedby={form?.error ? 'login-error' : undefined}
				class="w-full rounded-lg border-0 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 ring-1 ring-zinc-700 focus:ring-amber-400"
			/>
		</div>
		<div>
			<label for="password" class="mb-2 block text-sm font-medium text-zinc-200">Password</label>
			<input
				id="password"
				name="password"
				type="password"
				autocomplete="current-password"
				required
				maxlength="256"
				aria-describedby={form?.error ? 'login-error' : undefined}
				class="w-full rounded-lg border-0 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 ring-1 ring-zinc-700 focus:ring-amber-400"
			/>
		</div>
		{#if form?.error}
			<p id="login-error" role="alert" class="text-sm text-red-400">{form.error}</p>
		{/if}
		<button
			type="submit"
			disabled={pending}
			class="rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-amber-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-400 disabled:cursor-wait disabled:opacity-60"
		>
			{pending ? 'Signing in...' : 'Sign in'}
		</button>
	</form>
	<p class="mt-5 text-center text-xs text-zinc-500">Accounts are created by your administrator.</p>
</section>
