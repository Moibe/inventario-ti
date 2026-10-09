<script lang="ts">
	import Plus from '@lucide/svelte/icons/plus';
	import Download from '@lucide/svelte/icons/download';
	import Search from '@lucide/svelte/icons/search';
	import FileText from '@lucide/svelte/icons/file-text';
	import { goto } from '$app/navigation';
	import { exportarExcel } from '$lib/exportar';
	import { nombreCompleto, sinAcentos } from '$lib/nombre';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let busqueda = $state('');

	// Texto buscable de cada fila, ya sin acentos (se recalcula solo al cambiar los datos).
	const buscables = $derived(
		data.colaboradores.map((c) => ({
			c,
			texto: sinAcentos(
				[
					nombreCompleto(c),
					c.usuario,
					c.numeroEmpleado,
					c.telefonoMovil,
					c.telefonoFijo,
					c.numeroResponsiva,
					c.responsivaNombre ?? '',
					c.area,
					c.departamento,
					c.puesto,
					...c.equipos.map((e) => e.serie)
				].join(' ')
			)
		}))
	);

	const filtrados = $derived.by(() => {
		const q = sinAcentos(busqueda);
		if (!q) return data.colaboradores;
		return buscables.filter((x) => x.texto.includes(q)).map((x) => x.c);
	});

	const botonSec =
		'flex h-9 items-center gap-2 rounded-lg border border-border bg-white px-3 text-xs font-medium transition-colors hover:bg-muted';
</script>

<div class="flex flex-wrap items-end justify-between gap-4">
	<div class="flex flex-col gap-1">
		<h1 class="text-xl font-semibold">Inventario de equipos</h1>
		<p class="text-sm text-muted-foreground">
			{data.colaboradores.length}
			{data.colaboradores.length === 1 ? 'colaborador' : 'colaboradores'} con resguardo.
		</p>
	</div>
	<div class="flex items-center gap-3">
		<button
			type="button"
			class={botonSec}
			onclick={() => exportarExcel(filtrados, 'inventario-ti')}
			disabled={filtrados.length === 0}
		>
			<Download class="size-4" /> Exportar a Excel
		</button>
		<a
			href="/colaboradores/nuevo"
			class="flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
		>
			<Plus class="size-4" /> Nuevo colaborador
		</a>
	</div>
</div>

<div class="mt-8 rounded-lg border border-border bg-card">
	<div class="border-b border-border p-4">
		<label class="relative block max-w-xl">
			<Search class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
			<input
				bind:value={busqueda}
				placeholder="Buscar por nombre, no. de empleado, teléfono, responsiva o serie…"
				class="h-9 w-full rounded-lg border border-border bg-white pr-3 pl-9 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/40"
			/>
		</label>
	</div>

	<table class="w-full text-sm">
		<thead class="text-left text-xs text-muted-foreground">
			<tr>
				<th class="px-4 py-3 font-medium">Nombre</th>
				<th class="px-4 py-3 font-medium">No. empleado</th>
				<th class="px-4 py-3 font-medium">Área</th>
				<th class="px-4 py-3 font-medium">Departamento</th>
				<th class="px-4 py-3 font-medium">Puesto</th>
				<th class="px-4 py-3 font-medium">Equipo</th>
				<th class="px-4 py-3 font-medium">Responsiva</th>
				<th class="px-4 py-3 text-right font-medium">Periféricos</th>
			</tr>
		</thead>
		<tbody>
			{#each filtrados as c (c.id)}
				{@const cpu = c.equipos.find((e) => e.principal)}
				<tr
					class="cursor-pointer border-t border-border transition-colors hover:bg-muted/40"
					onclick={() => goto(`/colaboradores/${c.id}`)}
				>
					<td class="px-4 py-3 font-medium">
						<a href="/colaboradores/{c.id}">{nombreCompleto(c)}</a>
						{#if c.usuario}<p class="text-xs font-normal text-muted-foreground">{c.usuario}</p>{/if}
					</td>
					<td class="px-4 py-3 text-muted-foreground">{c.numeroEmpleado || '—'}</td>
					<td class="px-4 py-3 text-muted-foreground">{c.area}</td>
					<td class="px-4 py-3 text-muted-foreground">{c.departamento}</td>
					<td class="px-4 py-3 text-muted-foreground">{c.puesto}</td>
					<td class="px-4 py-3 text-muted-foreground">
						{#if cpu && (cpu.marca || cpu.serie)}
							<span class="text-xs">{cpu.tipo}</span> {cpu.marca}
							<span class="text-xs">· {cpu.serie}</span>
						{:else}—{/if}
					</td>
					<td class="px-4 py-3">
						<div class="flex items-center gap-2 text-xs">
							{#if c.numeroResponsiva}<span>{c.numeroResponsiva}</span>{/if}
							{#if c.responsivaArchivo}
								<a
									href="/colaboradores/{c.id}/responsiva"
									target="_blank"
									title={c.responsivaNombre ?? 'Ver responsiva'}
									class="inline-flex items-center gap-1 text-primary hover:underline"
									onclick={(e) => e.stopPropagation()}
								>
									<FileText class="size-4" /> Ver
								</a>
							{:else}<span class="text-muted-foreground">Pendiente</span>{/if}
						</div>
					</td>
					<td class="px-4 py-3 text-right text-muted-foreground">
						{c.equipos.filter((e) => !e.principal).length}
					</td>
				</tr>
			{:else}
				<tr>
					<td colspan="8" class="px-4 py-12 text-center text-xs text-muted-foreground">
						{busqueda ? 'Nada coincide con la búsqueda.' : 'Aún no hay colaboradores registrados.'}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
