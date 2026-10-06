<script lang="ts">
	import ImagePlus from '@lucide/svelte/icons/image-plus';
	import Plus from '@lucide/svelte/icons/plus';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Download from '@lucide/svelte/icons/download';

	type Periferico = { id: number; tipo: string; marca: string; modelo: string; serie: string };

	// Mismos campos que la app de escritorio de James.
	let persona = $state({ nombre: '', area: '', departamento: '', puesto: '' });
	let cpu = $state({ marca: '', modelo: '', serie: '' });
	let perifericos = $state<Periferico[]>([]);
	let foto = $state<string | null>(null);
	let seleccionado = $state<number | null>(null);
	let aviso = $state('');

	const CLAVE = 'inventario-ti:registro';

	// Mientras no hay backend, el registro vive en el navegador.
	$effect(() => {
		try {
			const guardado = localStorage.getItem(CLAVE);
			if (!guardado) return;
			const r = JSON.parse(guardado);
			persona = r.persona;
			cpu = r.cpu;
			perifericos = r.perifericos;
			foto = r.foto;
		} catch {}
	});

	function elegirFoto(e: Event) {
		const archivo = (e.currentTarget as HTMLInputElement).files?.[0];
		if (!archivo) return;
		const lector = new FileReader();
		lector.onload = () => (foto = lector.result as string);
		lector.readAsDataURL(archivo);
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

	function guardar() {
		try {
			localStorage.setItem(CLAVE, JSON.stringify({ persona, cpu, perifericos, foto }));
			aviso = 'Guardado';
		} catch {
			aviso = 'No se pudo guardar';
		}
		setTimeout(() => (aviso = ''), 2000);
	}

	// CSV con BOM para que Excel respete los acentos.
	function exportar() {
		const celda = (v: string) => `"${v.replaceAll('"', '""')}"`;
		const base = [persona.nombre, persona.area, persona.departamento, persona.puesto];
		const filas = [
			['Nombre', 'Área', 'Departamento', 'Puesto', 'Tipo', 'Marca', 'Modelo', 'No. Serie'],
			[...base, 'CPU', cpu.marca, cpu.modelo, cpu.serie],
			...perifericos.map((p) => [...base, p.tipo, p.marca, p.modelo, p.serie])
		];
		const csv = '﻿' + filas.map((f) => f.map(celda).join(',')).join('\r\n');
		const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
		const a = document.createElement('a');
		a.href = url;
		a.download = `inventario-${persona.nombre || 'equipo'}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	}

	const input =
		'h-9 w-full rounded-lg border border-border bg-white px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-ring/40';
	const etiqueta = 'text-xs font-medium text-muted-foreground';
	const botonSec =
		'flex h-9 items-center gap-2 rounded-lg border border-border bg-white px-3 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-50 disabled:hover:bg-white';
</script>

<div class="flex items-end justify-between gap-4">
	<div class="flex flex-col gap-1">
		<h1 class="text-xl font-semibold">Inventario de equipos</h1>
		<p class="text-sm text-muted-foreground">Resguardo por colaborador.</p>
	</div>
	<div class="flex items-center gap-3">
		{#if aviso}<span class="text-xs text-muted-foreground">{aviso}</span>{/if}
		<button type="button" class={botonSec} onclick={exportar}>
			<Download class="size-4" /> Exportar a Excel
		</button>
		<button
			type="button"
			onclick={guardar}
			class="h-9 rounded-lg bg-primary px-4 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
		>
			Guardar
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
						<input class={input} bind:value={persona.nombre} />
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
				<button type="button" class={botonSec} onclick={eliminar} disabled={seleccionado === null}>
					<Trash2 class="size-4" /> Eliminar
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
