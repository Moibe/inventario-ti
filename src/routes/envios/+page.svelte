<script lang="ts">
	import Download from '@lucide/svelte/icons/download';
	import FileSpreadsheet from '@lucide/svelte/icons/file-spreadsheet';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import { enhance } from '$app/forms';
	import Confirmar from '$lib/components/Confirmar.svelte';
	import { botonSec } from '$lib/ui';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let porBorrar = $state<{ id: number; nombre: string } | null>(null);

	const peso = (b: number) =>
		b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`;

	const cuando = (d: Date | string) =>
		new Date(d).toLocaleString('es-MX', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
</script>

<svelte:head><title>Archivos enviados · Inventario TI</title></svelte:head>

<div class="flex flex-col gap-1">
	<h1 class="text-xl font-semibold">Archivos enviados</h1>
	<p class="text-sm text-muted-foreground">
		Excels que mandó el capturista desde la ficha. Por ahora solo se guardan; nadie los convierte
		en colaboradores todavía.
	</p>
</div>

<div class="mt-8 overflow-hidden rounded-lg border border-border bg-card">
	<table class="w-full text-sm">
		<thead class="text-left text-xs text-muted-foreground">
			<tr>
				<th class="px-4 py-3 font-medium">Archivo</th>
				<th class="px-4 py-3 font-medium">Lo mandó</th>
				<th class="px-4 py-3 font-medium">Cuándo</th>
				<th class="px-4 py-3 text-right font-medium">Tamaño</th>
				<th class="px-4 py-3"><span class="sr-only">Acciones</span></th>
			</tr>
		</thead>
		<tbody>
			{#each data.envios as e (e.id)}
				<tr class="border-t border-border">
					<td class="px-4 py-3">
						<span class="flex items-center gap-2 font-medium">
							<FileSpreadsheet class="size-4 shrink-0 text-muted-foreground" />
							{e.nombre}
						</span>
					</td>
					<td class="px-4 py-3 text-muted-foreground">{e.de}</td>
					<td class="px-4 py-3 text-muted-foreground">{cuando(e.creadoEn)}</td>
					<td class="px-4 py-3 text-right text-muted-foreground">{peso(e.bytes)}</td>
					<td class="px-4 py-3">
						<div class="flex justify-end gap-2">
							<a href="/envios/{e.id}" download class={botonSec}>
								<Download class="size-4" /> Descargar
							</a>
							<button
								type="button"
								class="{botonSec} text-destructive"
								onclick={() => (porBorrar = { id: e.id, nombre: e.nombre })}
							>
								<Trash2 class="size-4" /> Borrar
							</button>
						</div>
					</td>
				</tr>
			{:else}
				<tr>
					<td colspan="5" class="px-4 py-12 text-center text-xs text-muted-foreground">
						Todavía nadie ha enviado un archivo.
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<Confirmar abierto={porBorrar !== null} titulo="Borrar archivo" onCerrar={() => (porBorrar = null)}>
	Se borrará <span class="font-medium text-foreground">{porBorrar?.nombre}</span> del servidor. Esta
	acción no se puede deshacer.
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
