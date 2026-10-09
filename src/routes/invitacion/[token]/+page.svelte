<script lang="ts">
	import { enhance } from '$app/forms';
	import { botonPrimario, etiqueta, input, tarjeta } from '$lib/ui';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let guardando = $state(false);
</script>

<svelte:head><title>Activar cuenta · Inventario TI</title></svelte:head>

<div class="mx-auto flex max-w-sm flex-col gap-6 py-16">
	{#if data.conSesion}
		<div class="{tarjeta} text-center">
			<h1 class="text-base font-semibold">Ya tienes una sesión abierta</h1>
			<p class="mt-2 text-sm text-muted-foreground">
				Cierra sesión antes de activar otra cuenta con esta liga.
			</p>
			<a href="/" class="mt-4 inline-block text-sm text-primary hover:underline">Ir al inventario</a>
		</div>
	{:else}
		<div class="flex flex-col gap-1 text-center">
			<h1 class="text-xl font-semibold">Activa tu cuenta</h1>
			<p class="text-sm text-muted-foreground">
				Elige la contraseña para <span class="font-medium text-foreground">{data.usuario}</span>.
			</p>
		</div>

		<form
			method="POST"
			class="{tarjeta} flex flex-col gap-4"
			use:enhance={() => {
				guardando = true;
				return async ({ update }) => {
					await update({ reset: false });
					guardando = false;
				};
			}}
		>
			<label class="flex flex-col gap-1.5">
				<span class={etiqueta}>Contraseña</span>
				<input
					class={input}
					name="contrasena"
					type="password"
					autocomplete="new-password"
					minlength="8"
					aria-describedby="pista-contrasena"
					required
				/>
			</label>
			<!-- La pista va FUERA del <label>: dentro se vuelve parte del nombre del
			     campo ("Contraseña Mínimo 8 caracteres") para lectores de pantalla. -->
			<span id="pista-contrasena" class="-mt-2 text-xs text-muted-foreground">
				Mínimo 8 caracteres.
			</span>
			<label class="flex flex-col gap-1.5">
				<span class={etiqueta}>Repite la contraseña</span>
				<input
					class={input}
					name="confirmacion"
					type="password"
					autocomplete="new-password"
					required
				/>
			</label>

			{#if form?.error}<p class="text-xs text-destructive">{form.error}</p>{/if}

			<button type="submit" class="{botonPrimario} mt-1" disabled={guardando}>
				{guardando ? 'Guardando…' : 'Activar cuenta'}
			</button>
		</form>
	{/if}
</div>
