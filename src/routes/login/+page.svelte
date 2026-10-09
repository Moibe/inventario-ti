<script lang="ts">
	import { enhance } from '$app/forms';
	import { botonPrimario, etiqueta, input, tarjeta } from '$lib/ui';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
	let entrando = $state(false);
</script>

<svelte:head><title>Entrar · Inventario TI</title></svelte:head>

<div class="mx-auto flex max-w-sm flex-col gap-6 py-16">
	<div class="flex flex-col gap-1 text-center">
		<h1 class="text-xl font-semibold">Inventario <span class="text-primary">TI</span></h1>
		<p class="text-sm text-muted-foreground">Entra con tu cuenta para continuar.</p>
	</div>

	<form
		method="POST"
		class="{tarjeta} flex flex-col gap-4"
		use:enhance={() => {
			entrando = true;
			return async ({ update }) => {
				await update({ reset: false });
				entrando = false;
			};
		}}
	>
		<label class="flex flex-col gap-1.5">
			<span class={etiqueta}>Usuario</span>
			<!-- svelte-ignore a11y_autofocus -->
			<input
				class={input}
				name="usuario"
				autocomplete="username"
				autofocus
				required
				value={form?.usuario ?? ''}
			/>
		</label>
		<label class="flex flex-col gap-1.5">
			<span class={etiqueta}>Contraseña</span>
			<input
				class={input}
				name="contrasena"
				type="password"
				autocomplete="current-password"
				required
			/>
		</label>

		{#if form?.error}
			<p class="text-xs text-destructive">{form.error}</p>
		{/if}

		<button type="submit" class="{botonPrimario} mt-1" disabled={entrando}>
			{entrando ? 'Entrando…' : 'Entrar'}
		</button>
	</form>
</div>
