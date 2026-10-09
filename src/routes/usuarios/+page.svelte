<script lang="ts">
	import Copy from '@lucide/svelte/icons/copy';
	import Link2 from '@lucide/svelte/icons/link-2';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import UserPlus from '@lucide/svelte/icons/user-plus';
	import { enhance } from '$app/forms';
	import Confirmar from '$lib/components/Confirmar.svelte';
	import { botonPrimario, botonSec, etiqueta, input, tarjeta } from '$lib/ui';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let porBorrar = $state<{ id: number; usuario: string } | null>(null);
	let copiado = $state(false);

	async function copiar(texto: string) {
		try {
			await navigator.clipboard.writeText(texto);
			copiado = true;
			setTimeout(() => (copiado = false), 2000);
		} catch {
			copiado = false;
		}
	}

	const fecha = (d: Date | string) =>
		new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
</script>

<svelte:head><title>Usuarios · Inventario TI</title></svelte:head>

<div class="flex flex-col gap-1">
	<h1 class="text-xl font-semibold">Usuarios</h1>
	<p class="text-sm text-muted-foreground">
		Tú das de alta la cuenta y la persona elige su propia contraseña con la liga de invitación.
	</p>
</div>

{#if form?.liga}
	<div class="mt-6 rounded-lg border border-primary/30 bg-primary/5 p-4">
		<p class="text-sm font-medium">Liga de invitación para {form.para}</p>
		<p class="mt-1 text-xs text-muted-foreground">
			Mándasela por el medio que prefieras. Sirve una sola vez y expira en 7 días.
		</p>
		<div class="mt-3 flex flex-wrap items-center gap-2">
			<code class="flex-1 truncate rounded-md border border-border bg-white px-3 py-2 text-xs">
				{form.liga}
			</code>
			<button type="button" class={botonSec} onclick={() => copiar(form.liga)}>
				<Copy class="size-4" />
				{copiado ? 'Copiada' : 'Copiar'}
			</button>
		</div>
	</div>
{/if}

<div class="mt-6 grid gap-6 lg:grid-cols-[1fr_20rem]">
	<div class="overflow-hidden rounded-lg border border-border bg-card">
		<table class="w-full text-sm">
			<thead class="text-left text-xs text-muted-foreground">
				<tr>
					<th class="px-4 py-3 font-medium">Usuario</th>
					<th class="px-4 py-3 font-medium">Rol</th>
					<th class="px-4 py-3 font-medium">Estado</th>
					<th class="px-4 py-3 font-medium">Alta</th>
					<th class="px-4 py-3"><span class="sr-only">Acciones</span></th>
				</tr>
			</thead>
			<tbody>
				{#each data.usuarios as u (u.id)}
					<tr class="border-t border-border">
						<td class="px-4 py-3 font-medium">
							{u.usuario}
							{#if u.id === data.yo}<span class="text-xs text-muted-foreground"> (tú)</span>{/if}
						</td>
						<td class="px-4 py-3 text-muted-foreground">
							{u.esAdmin ? 'Superadmin' : 'Capturista'}
						</td>
						<td class="px-4 py-3">
							{#if u.sinActivar}
								<span class="text-xs text-destructive">Sin activar</span>
							{:else}
								<span class="text-xs text-muted-foreground">Activa</span>
							{/if}
						</td>
						<td class="px-4 py-3 text-xs text-muted-foreground">{fecha(u.creadoEn)}</td>
						<td class="px-4 py-3">
							<div class="flex justify-end gap-2">
								{#if u.sinActivar}
									<form method="POST" action="?/reinvitar" use:enhance>
										<input type="hidden" name="id" value={u.id} />
										<button type="submit" class={botonSec} title="Generar una liga nueva">
											<Link2 class="size-4" /> Nueva liga
										</button>
									</form>
								{/if}
								{#if u.id !== data.yo}
									<button
										type="button"
										class="{botonSec} text-destructive"
										onclick={() => (porBorrar = { id: u.id, usuario: u.usuario })}
									>
										<Trash2 class="size-4" /> Borrar
									</button>
								{/if}
							</div>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
		{#if form?.errorLiga}<p class="px-4 py-3 text-xs text-destructive">{form.errorLiga}</p>{/if}
		{#if form?.errorBorrar}<p class="px-4 py-3 text-xs text-destructive">{form.errorBorrar}</p>{/if}
	</div>

	<form method="POST" action="?/crear" class="{tarjeta} flex h-fit flex-col gap-4" use:enhance>
		<h2 class="text-sm font-semibold">Nueva cuenta</h2>
		<label class="flex flex-col gap-1.5">
			<span class={etiqueta}>Usuario</span>
			<input class={input} name="usuario" required value={form?.usuario ?? ''} />
		</label>
		<label class="flex items-center gap-2 text-sm">
			<input type="checkbox" name="esAdmin" class="size-4 rounded border-border" />
			Superadmin (administra cuentas y descarga los archivos enviados)
		</label>
		{#if form?.errorCrear}<p class="text-xs text-destructive">{form.errorCrear}</p>{/if}
		<button type="submit" class="{botonPrimario} flex items-center justify-center gap-2">
			<UserPlus class="size-4" /> Crear y generar liga
		</button>
	</form>
</div>

<Confirmar
	abierto={porBorrar !== null}
	titulo="Borrar cuenta"
	onCerrar={() => (porBorrar = null)}
>
	Se borrará la cuenta de <span class="font-medium text-foreground">{porBorrar?.usuario}</span> y su
	sesión. El inventario que haya capturado no se toca.
	{#snippet acciones()}
		<button type="button" class={botonSec} onclick={() => (porBorrar = null)}>Cancelar</button>
		<form method="POST" action="?/eliminar" use:enhance={() => async ({ update }) => {
				porBorrar = null;
				await update();
			}}>
			<input type="hidden" name="id" value={porBorrar?.id} />
			<button
				type="submit"
				class="h-9 rounded-lg bg-destructive px-4 text-xs font-medium text-white transition-opacity hover:opacity-90"
			>
				Borrar
			</button>
		</form>
	{/snippet}
</Confirmar>
