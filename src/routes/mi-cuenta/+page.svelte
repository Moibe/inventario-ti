<script lang="ts">
	import { enhance } from '$app/forms';
	import { botonPrimario, etiqueta, input, tarjeta } from '$lib/ui';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const fecha = (d: Date | string) =>
		new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
</script>

<svelte:head><title>Mi cuenta · Inventario TI</title></svelte:head>

<div class="flex flex-col gap-1">
	<h1 class="text-xl font-semibold">Mi cuenta</h1>
	<p class="text-sm text-muted-foreground">
		{data.usuario} · {data.esAdmin ? 'Superadmin' : 'Capturista'}{data.creadoEn
			? ` · desde el ${fecha(data.creadoEn)}`
			: ''}
	</p>
</div>

<form
	method="POST"
	action="?/cambiarContrasena"
	class="{tarjeta} mt-8 flex max-w-sm flex-col gap-4"
	use:enhance
>
	<h2 class="text-sm font-semibold">Cambiar mi contraseña</h2>
	<label class="flex flex-col gap-1.5">
		<span class={etiqueta}>Contraseña actual</span>
		<input class={input} name="actual" type="password" autocomplete="current-password" required />
	</label>
	<label class="flex flex-col gap-1.5">
		<span class={etiqueta}>Contraseña nueva</span>
		<input
			class={input}
			name="nueva"
			type="password"
			autocomplete="new-password"
			minlength="8"
			aria-describedby="pista-nueva"
			required
		/>
	</label>
	<!-- Fuera del <label> a propósito: dentro contaría como parte del nombre del campo. -->
	<span id="pista-nueva" class="-mt-2 text-xs text-muted-foreground">Mínimo 8 caracteres.</span>
	<label class="flex flex-col gap-1.5">
		<span class={etiqueta}>Repite la contraseña nueva</span>
		<input
			class={input}
			name="confirmacion"
			type="password"
			autocomplete="new-password"
			required
		/>
	</label>

	{#if form?.error}<p class="text-xs text-destructive">{form.error}</p>{/if}
	{#if form?.cambiada}<p class="text-xs text-primary">Listo, tu contraseña quedó cambiada.</p>{/if}

	<button type="submit" class={botonPrimario}>Cambiar contraseña</button>
</form>
