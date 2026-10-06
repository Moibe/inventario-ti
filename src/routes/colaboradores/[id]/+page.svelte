<script lang="ts">
	import ImagePlus from '@lucide/svelte/icons/image-plus';
	import Plus from '@lucide/svelte/icons/plus';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Download from '@lucide/svelte/icons/download';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import { exportarExcel } from '#lib/exportar.js';
	import Confirmar from '#lib/components/Confirmar.svelte';
	import type { PageProps } from './$types';

	type Periferico = { id: number; tipo: string; marca: string; modelo: string; serie: string };

	let { data, form }: PageProps = $props();

	// Copia editable de lo que vino del servidor (mismos campos que la app de James).
	const inicial = untrack(() => data.colaborador);
	const cpuInicial = inicial?.equipos.find((e) => e.principal);
	let persona = $state({
		nombre: inicial?.nombre ?? '',
		area: inicial?.area ?? '',
		departamento: inicial?.departamento ?? '',
		puesto: inicial?.puesto ?? ''
	});
	let foto = $state<string | null>(inicial?.foto ?? null);
	let cpu = $state({
		marca: cpuInicial?.marca ?? '',
		modelo: cpuInicial?.modelo ?? '',
		serie: cpuInicial?.serie ?? ''
	});
	let perifericos = $state<Periferico[]>(
		(inicial?.equipos ?? [])
			.filter((e) => !e.principal)
			.map(({ id, tipo, marca, modelo, serie }) => ({ id, tipo, marca, modelo, serie }))
	);
	let seleccionado = $state<number | null>(null);
	let guardando = $state(false);
	let confirmarBorrado = $state(false);

	const datos = $derived(JSON.stringify({ persona, foto, cpu, perifericos }));

	// La foto se reduce a 400px antes de guardarla para que la base no crezca de más.
	function elegirFoto(e: Event) {
		const archivo = (e.currentTarget as HTMLInputElement).files?.[0];
		if (!archivo) return;
		const img = new Image();
		img.onload = () => {
			const escala = Math.min(1, 400 / Math.max(img.width, img.height));
			const lienzo = document.createElement('canvas');
			lienzo.width = Math.round(img.width * escala);
			lienzo.height = Math.round(img.height * escala);
			lienzo.getContext('2d')!.drawImage(img, 0, 0, lienzo.width, lienzo.height);
			foto = lienzo.toDataURL('image/jpeg', 0.8);
			URL.revokeObjectURL(img.src);
		};
		img.src = URL.createObjectURL(archivo);
	}

	function agregar() {
		const id = Date.now();
		perifericos.push({ id, tipo: '', marca: '', modelo: '', serie: '' });
		seleccionado = id;
	}

	function eliminar() {
		perifericos = perifericos.filter((p) => p.id !== seleccionado);
		seleccionado = null;
	}

	function exportar() {
		exportarExcel(
			[
				{
					...persona,
					equipos: [
						{ principal: true, tipo: 'CPU', ...cpu },
						...perifericos.map((p) => ({ ...p, principal: false }))
					]
				}
			],
			`inventario-${persona.nombre || 'colaborador'}`
		);
	}

	const input =
		'h-9 w-full rounded-lg border border-border bg-white px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-ring/40';
	const etiqueta = 'text-xs font-medium text-muted-foreground';
	const botonSec =
		'flex h-9 items-center gap-2 rounded-lg border border-border bg-white px-3 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-50 disabled:hover:bg-white';
	const botonPrimario =
		'h-9 rounded-lg bg-primary px-4 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60';
</script>

<svelte:head>
	<title>{inicial ? inicial.nombre : 'Nuevo colaborador'} · Inventario TI</title>
</svelte:head>

<form
	method="POST"
	action="?/guardar"
	use:enhance={() => {
		guardando = true;
		return async ({ update }) => {
			await update({ reset: false });
			guardando = false;
		};
	}}
>
	<input type="hidden" name="datos" value={datos} />

	<div class="flex flex-wrap items-end justify-between gap-4">
		<div class="flex flex-col gap-1">
			<a
				href="/"
				class="mb-1 flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
			>
				<ArrowLeft class="size-3.5" /> Inventario
			</a>
			<h1 class="text-xl font-semibold">{inicial ? inicial.nombre : 'Nuevo colaborador'}</h1>
		</div>
		<div class="flex items-center gap-3">
			{#if form?.mensaje}<span class="text-xs text-destructive">{form.mensaje}</span>{/if}
			{#if inicial}
				<button
					type="button"
					class="{botonSec} text-destructive"
					onclick={() => (confirmarBorrado = true)}
				>
					<Trash2 class="size-4" /> Eliminar
				</button>
			{/if}
			<button type="button" class={botonSec} onclick={exportar}>
				<Download class="size-4" /> Exportar a Excel
			</button>
			<button type="submit" class={botonPrimario} disabled={guardando}>
				{guardando ? 'Guardando…' : 'Guardar'}
			</button>
		</div>
	</div>

	<div class="mt-8 grid gap-6 lg:grid-cols-2">
		<div class="flex flex-col gap-6">
			<section class="rounded-lg border border-border bg-card p-6">
				<h2 class="text-sm font-semibold">Colaborador</h2>
				<div class="mt-4 flex gap-6">
					<label
						class="flex size-36 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-muted/50 transition-colors hover:bg-muted"
					>
						{#if foto}
							<img src={foto} alt="Foto del colaborador" class="size-full object-cover" />
						{:else}
							<span class="flex flex-col items-center gap-1 text-xs text-muted-foreground">
								<ImagePlus class="size-5" /> Foto
							</span>
						{/if}
						<input type="file" accept="image/*" class="hidden" onchange={elegirFoto} />
					</label>
					<div class="grid flex-1 grid-cols-2 gap-3">
						<label class="col-span-2 flex flex-col gap-1.5">
							<span class={etiqueta}>Nombre</span>
							<input class={input} bind:value={persona.nombre} required />
						</label>
						<label class="flex flex-col gap-1.5">
							<span class={etiqueta}>Área</span>
							<input class={input} bind:value={persona.area} />
						</label>
						<label class="flex flex-col gap-1.5">
							<span class={etiqueta}>Departamento</span>
							<input class={input} bind:value={persona.departamento} />
						</label>
						<label class="col-span-2 flex flex-col gap-1.5">
							<span class={etiqueta}>Puesto</span>
							<input class={input} bind:value={persona.puesto} />
						</label>
					</div>
				</div>
			</section>

			<section class="rounded-lg border border-border bg-card p-6">
				<h2 class="text-sm font-semibold">Equipo principal (CPU)</h2>
				<div class="mt-4 grid grid-cols-3 gap-3">
					<label class="flex flex-col gap-1.5">
						<span class={etiqueta}>Marca</span>
						<input class={input} bind:value={cpu.marca} />
					</label>
					<label class="flex flex-col gap-1.5">
						<span class={etiqueta}>Modelo</span>
						<input class={input} bind:value={cpu.modelo} />
					</label>
					<label class="flex flex-col gap-1.5">
						<span class={etiqueta}>No. Serie</span>
						<input class={input} bind:value={cpu.serie} />
					</label>
				</div>
			</section>
		</div>

		<section class="flex flex-col rounded-lg border border-border bg-card p-6">
			<div class="flex items-center justify-between">
				<h2 class="text-sm font-semibold">Periféricos</h2>
				<div class="flex gap-2">
					<button type="button" class={botonSec} onclick={agregar}>
						<Plus class="size-4" /> Agregar
					</button>
					<button
						type="button"
						class={botonSec}
						onclick={eliminar}
						disabled={seleccionado === null}
					>
						<Trash2 class="size-4" /> Quitar
					</button>
				</div>
			</div>

			<div class="mt-4 overflow-hidden rounded-lg border border-border">
				<table class="w-full text-sm">
					<thead class="bg-muted/60 text-left text-xs text-muted-foreground">
						<tr>
							<th class="px-3 py-2 font-medium">Tipo</th>
							<th class="px-3 py-2 font-medium">Marca</th>
							<th class="px-3 py-2 font-medium">Modelo</th>
							<th class="px-3 py-2 font-medium">No. Serie</th>
						</tr>
					</thead>
					<tbody>
						{#each perifericos as p (p.id)}
							<tr
								class={[
									'border-t border-border transition-colors',
									seleccionado === p.id ? 'bg-primary/5' : 'hover:bg-muted/40'
								]}
								onfocusin={() => (seleccionado = p.id)}
								onclick={() => (seleccionado = p.id)}
							>
								{#each ['tipo', 'marca', 'modelo', 'serie'] as const as campo (campo)}
									<td class="p-1">
										<input
											class="h-8 w-full rounded-md bg-transparent px-2 outline-none focus:bg-white focus:ring-2 focus:ring-ring/40"
											bind:value={p[campo]}
										/>
									</td>
								{/each}
							</tr>
						{:else}
							<tr>
								<td colspan="4" class="px-3 py-10 text-center text-xs text-muted-foreground">
									Sin periféricos. Usa “Agregar” para registrar monitor, teclado, mouse…
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>
	</div>
</form>

<Confirmar bind:abierto={confirmarBorrado} titulo="Eliminar colaborador">
	Se borrará a <span class="font-medium text-foreground">{inicial?.nombre}</span> junto con todos sus
	equipos. Esta acción no se puede deshacer.
	{#snippet acciones()}
		<button type="button" class={botonSec} onclick={() => (confirmarBorrado = false)}>
			Cancelar
		</button>
		<form method="POST" action="?/eliminar" use:enhance>
			<button
				type="submit"
				class="h-9 rounded-lg bg-destructive px-4 text-xs font-medium text-white transition-opacity hover:opacity-90"
			>
				Eliminar
			</button>
		</form>
	{/snippet}
</Confirmar>
