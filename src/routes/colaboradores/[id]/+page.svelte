<script lang="ts">
	import ImagePlus from '@lucide/svelte/icons/image-plus';
	import Plus from '@lucide/svelte/icons/plus';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Download from '@lucide/svelte/icons/download';
	import Printer from '@lucide/svelte/icons/printer';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import FileText from '@lucide/svelte/icons/file-text';
	import Upload from '@lucide/svelte/icons/upload';
	import X from '@lucide/svelte/icons/x';
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import { exportarExcel } from '$lib/exportar';
	import { reducirImagen } from '$lib/imagen';
	import { nombreCompleto } from '$lib/nombre';
	import Confirmar from '$lib/components/Confirmar.svelte';
	import { botonPrimario, botonSec, cajaFoto, celda, etiqueta, input } from '$lib/ui';
	import type { PageProps } from './$types';

	// Tipos de periférico de uso diario; cualquier otro se captura con "Otro…".
	const TIPOS_PERIFERICO = [
		'Cargador',
		'Monitor',
		'Teclado',
		'Mouse',
		'Cámara web',
		'Diadema',
		'Impresora',
		'Escáner'
	];
	const OTRO = '__otro';
	const TIPOS_EQUIPO = ['CPU', 'Laptop'];

	// `otro` solo existe en pantalla: marca las filas cuyo tipo no está en la lista.
	type Periferico = {
		id: number;
		tipo: string;
		marca: string;
		modelo: string;
		serie: string;
		otro: boolean;
	};

	let { data, form }: PageProps = $props();

	// Registros capturados a mano ("monitor", "camara web") se acomodan en la lista.
	const sinAcentos = (t: string) =>
		t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
	const normalizarTipo = (t: string) =>
		TIPOS_PERIFERICO.find((x) => sinAcentos(x) === sinAcentos(t)) ?? t;

	// Copia editable de lo que vino del servidor (mismos campos que la app de James).
	const inicial = untrack(() => data.colaborador);
	const principal = inicial?.equipos.find((e) => e.principal);
	let persona = $state({
		nombre: inicial?.nombre ?? '',
		apellidoPaterno: inicial?.apellidoPaterno ?? '',
		apellidoMaterno: inicial?.apellidoMaterno ?? '',
		usuario: inicial?.usuario ?? '',
		numeroEmpleado: inicial?.numeroEmpleado ?? '',
		telefonoMovil: inicial?.telefonoMovil ?? '',
		telefonoFijo: inicial?.telefonoFijo ?? '',
		area: inicial?.area ?? '',
		departamento: inicial?.departamento ?? '',
		puesto: inicial?.puesto ?? '',
		numeroResponsiva: inicial?.numeroResponsiva ?? ''
	});
	let foto = $state<string | null>(inicial?.foto ?? null);
	let fotoEquipo = $state<string | null>(inicial?.fotoEquipo ?? null);
	let cpu = $state({
		tipo: principal?.tipo === 'Laptop' ? 'Laptop' : 'CPU',
		marca: principal?.marca ?? '',
		modelo: principal?.modelo ?? '',
		serie: principal?.serie ?? ''
	});
	let perifericos = $state<Periferico[]>(
		(inicial?.equipos ?? [])
			.filter((e) => !e.principal)
			.map(({ id, tipo, marca, modelo, serie }) => {
				const normal = normalizarTipo(tipo);
				return {
					id,
					tipo: normal,
					marca,
					modelo,
					serie,
					otro: normal !== '' && !TIPOS_PERIFERICO.includes(normal)
				};
			})
	);
	let seleccionado = $state<number | null>(null);
	let guardando = $state(false);
	let confirmarBorrado = $state(false);
	let errorLocal = $state('');
	let avisoLocal = $state('');

	// La responsiva viaja como archivo en el mismo formulario (multipart).
	let inputResponsiva = $state<HTMLInputElement>();
	let archivoNuevo = $state('');
	let quitarResponsiva = $state(false);
	// Hay una responsiva ya guardada que se conserva tal cual (se puede imprimir/descargar).
	const archivoGuardado = $derived(
		!!inicial?.responsivaArchivo && !quitarResponsiva && !archivoNuevo
	);

	// Se revisa aquí, antes de enviar: un escaneo demasiado grande lo cortaría el
	// servidor con un 413 seco, y la misma regla de extensión que usa el servidor
	// evita que algo pase la pantalla de aquí y truene allá.
	const MAX_RESPONSIVA = 15 * 1024 * 1024;
	const EXTENSIONES = ['.pdf', '.jpg', '.jpeg', '.png'];

	function elegirResponsiva(e: Event & { currentTarget: HTMLInputElement }) {
		const campo = e.currentTarget;
		const archivo = campo.files?.[0];
		if (!archivo) {
			archivoNuevo = '';
			return;
		}
		const punto = archivo.name.lastIndexOf('.');
		const ext = punto > 0 ? archivo.name.slice(punto).toLowerCase() : '';
		const problema = !EXTENSIONES.includes(ext)
			? 'La responsiva debe ser PDF, JPG o PNG'
			: archivo.size === 0
				? 'El archivo está vacío'
				: archivo.size > MAX_RESPONSIVA
					? 'La responsiva pesa más de 15 MB'
					: '';
		if (problema) {
			errorLocal = problema;
			campo.value = '';
			archivoNuevo = '';
			return;
		}
		errorLocal = '';
		archivoNuevo = archivo.name;
		quitarResponsiva = false;
	}

	// Mandar un Excel a TI: se sube aparte del formulario y no toca esta ficha.
	let inputEnvio = $state<HTMLInputElement>();
	let enviando = $state(false);

	async function enviarExcel(e: Event & { currentTarget: HTMLInputElement }) {
		const archivo = e.currentTarget.files?.[0];
		if (!archivo) return;
		enviando = true;
		errorLocal = '';
		avisoLocal = '';
		try {
			const cuerpo = new FormData();
			cuerpo.append('archivo', archivo);
			const r = await fetch('/envios/subir', { method: 'POST', body: cuerpo });
			const datos = await r.json().catch(() => ({}));
			if (r.ok) avisoLocal = `Se envió “${archivo.name}” a TI.`;
			else errorLocal = datos.mensaje ?? 'No se pudo enviar el archivo.';
		} catch {
			errorLocal = 'No se pudo enviar el archivo; revisa la conexión.';
		}
		enviando = false;
		if (inputEnvio) inputEnvio.value = '';
	}

	function quitar() {
		if (inputResponsiva) inputResponsiva.value = '';
		if (archivoNuevo) archivoNuevo = '';
		else quitarResponsiva = true;
	}

	const titulo = inicial ? nombreCompleto(inicial) : 'Nuevo colaborador';
	const datos = $derived(
		JSON.stringify({ persona, foto, fotoEquipo, cpu, perifericos, quitarResponsiva })
	);

	// Las fotos se reducen en el navegador antes de guardarlas para que la base no crezca de más.
	async function elegirImagen(e: Event, maxLado: number, asignar: (v: string) => void) {
		const campo = e.currentTarget as HTMLInputElement;
		const archivo = campo.files?.[0];
		if (!archivo) return;
		try {
			asignar(await reducirImagen(archivo, maxLado));
			errorLocal = '';
		} catch {
			errorLocal = 'No se pudo leer la imagen';
		}
		campo.value = '';
	}

	function agregar() {
		const id = Date.now();
		perifericos.push({ id, tipo: '', marca: '', modelo: '', serie: '', otro: false });
		seleccionado = id;
	}

	function eliminar() {
		perifericos = perifericos.filter((p) => p.id !== seleccionado);
		seleccionado = null;
	}

	function cambiarTipo(p: Periferico, valor: string) {
		if (valor === OTRO) {
			p.otro = true;
			if (TIPOS_PERIFERICO.includes(p.tipo)) p.tipo = '';
		} else {
			p.otro = false;
			p.tipo = valor;
		}
	}

	function exportar() {
		exportarExcel(
			[
				{
					...persona,
					responsivaArchivo:
						archivoNuevo || (!quitarResponsiva && inicial?.responsivaArchivo) || null,
					equipos: [
						{ principal: true, ...cpu },
						...perifericos.map(({ tipo, marca, modelo, serie }) => ({
							principal: false,
							tipo,
							marca,
							modelo,
							serie
						}))
					]
				}
			],
			`inventario-${nombreCompleto(persona) || 'colaborador'}`
		);
	}

	// Imprime la responsiva guardada sin sacar a nadie de la ficha: se carga en un
	// iframe fuera de pantalla y se manda a imprimir.
	function imprimir() {
		if (!inicial) return;
		const url = `/colaboradores/${inicial.id}/responsiva`;
		document.getElementById('marco-impresion')?.remove();
		const marco = document.createElement('iframe');
		marco.id = 'marco-impresion';
		marco.setAttribute('aria-hidden', 'true');
		marco.style.cssText = 'position:fixed;left:-10000px;top:0;width:800px;height:1000px;border:0';
		marco.onload = () => {
			// El visor de PDF de Firefox necesita un momento antes de aceptar print().
			setTimeout(() => {
				try {
					marco.contentWindow?.focus();
					marco.contentWindow?.print();
				} catch {
					window.open(url, '_blank');
				}
			}, 1000);
			setTimeout(() => marco.remove(), 120_000);
		};
		marco.src = url;
		document.body.appendChild(marco);
	}

</script>

<svelte:head>
	<title>{titulo} · Inventario TI</title>
</svelte:head>

<form
	method="POST"
	action="?/guardar"
	enctype="multipart/form-data"
	use:enhance={() => {
		errorLocal = '';
		guardando = true;
		return async ({ result, update }) => {
			guardando = false;
			// Sin esto, un error que no sea fail() (413 por tamaño, 500, red caída)
			// hace que SvelteKit cambie la página entera por la de error y se pierda
			// todo lo capturado. Mejor avisar aquí y dejar la ficha intacta.
			if (result.type === 'error') {
				errorLocal = archivoNuevo
					? `No se pudo guardar; puede ser el tamaño de "${archivoNuevo}". Lo que capturaste sigue aquí: prueba con un escaneo más chico o avisa a TI.`
					: 'No se pudo guardar. Lo que capturaste sigue aquí; intenta de nuevo o avisa a TI.';
				return;
			}
			await update({ reset: false });
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
			<h1 class="text-xl font-semibold">{titulo}</h1>
		</div>
		<div class="flex flex-wrap items-center justify-end gap-3">
			{#if avisoLocal}<span class="text-xs text-primary">{avisoLocal}</span>{/if}
			{#if errorLocal}<span class="text-xs text-destructive">{errorLocal}</span>{/if}
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
			<!-- El archivo solo se guarda en el servidor para que TI lo revise; todavía
			     no se convierte en colaboradores. Va por fetch y no como parte de este
			     formulario, porque el HTML no permite un formulario dentro de otro. -->
			<label class="{botonSec} cursor-pointer" title="Mandar un Excel a TI para que lo revise">
				<Upload class="size-4" />
				{enviando ? 'Enviando…' : 'Enviar Excel a TI'}
				<input
					bind:this={inputEnvio}
					type="file"
					accept=".xlsx,.xlsm,.xls,.csv"
					class="sr-only"
					disabled={enviando}
					onchange={enviarExcel}
				/>
			</label>
			<button type="button" class={botonSec} onclick={exportar}>
				<Download class="size-4" /> Exportar a Excel
			</button>
			<button type="submit" class={botonPrimario} disabled={guardando}>
				{guardando ? 'Guardando…' : 'Guardar'}
			</button>
		</div>
	</div>

	<div class="mt-8 grid gap-6 lg:grid-cols-2">
		<div class="flex min-w-0 flex-col gap-6">
			<section class="rounded-lg border border-border bg-card p-6">
				<h2 class="text-sm font-semibold">Colaborador</h2>
				<div class="mt-4 flex flex-col gap-6 sm:flex-row">
					<label class="{cajaFoto} h-36 w-full sm:size-36">
						{#if foto}
							<img src={foto} alt="Foto del colaborador" class="size-full object-cover" />
						{:else}
							<span class="flex flex-col items-center gap-1 text-xs text-muted-foreground">
								<ImagePlus class="size-5" /> Foto
							</span>
						{/if}
						<input
							type="file"
							accept="image/*"
							class="sr-only"
							onchange={(e) => elegirImagen(e, 400, (v) => (foto = v))}
						/>
					</label>
					<div class="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
						<label class="flex flex-col gap-1.5">
							<span class={etiqueta}>Nombre</span>
							<input class={input} bind:value={persona.nombre} required />
						</label>
						<label class="flex flex-col gap-1.5">
							<span class={etiqueta}>Apellido paterno</span>
							<input class={input} bind:value={persona.apellidoPaterno} />
						</label>
						<label class="flex flex-col gap-1.5">
							<span class={etiqueta}>Apellido materno</span>
							<input class={input} bind:value={persona.apellidoMaterno} />
						</label>
						<label class="flex flex-col gap-1.5">
							<span class={etiqueta}>No. de empleado</span>
							<input class={input} bind:value={persona.numeroEmpleado} />
						</label>
						<label class="flex flex-col gap-1.5">
							<span class={etiqueta}>Área</span>
							<input class={input} bind:value={persona.area} />
						</label>
						<label class="flex flex-col gap-1.5">
							<span class={etiqueta}>Departamento</span>
							<input class={input} bind:value={persona.departamento} />
						</label>
						<label class="flex flex-col gap-1.5">
							<span class={etiqueta}>Puesto</span>
							<input class={input} bind:value={persona.puesto} />
						</label>
						<label class="flex flex-col gap-1.5">
							<span class={etiqueta}>Usuario</span>
							<input class={input} bind:value={persona.usuario} />
						</label>
						<label class="flex flex-col gap-1.5">
							<span class={etiqueta}>Teléfono móvil</span>
							<input type="tel" class={input} bind:value={persona.telefonoMovil} />
						</label>
						<label class="flex flex-col gap-1.5">
							<span class={etiqueta}>Teléfono fijo</span>
							<input type="tel" class={input} bind:value={persona.telefonoFijo} />
						</label>
					</div>
				</div>
			</section>

			<section class="rounded-lg border border-border bg-card p-6">
				<h2 class="text-sm font-semibold">Responsiva</h2>
				<p class="mt-1 text-xs text-muted-foreground">
					Documento firmado y escaneado (PDF, JPG o PNG, hasta 15 MB).
				</p>
				<label class="mt-4 flex max-w-xs flex-col gap-1.5">
					<span class={etiqueta}>No. de responsiva</span>
					<input class={input} bind:value={persona.numeroResponsiva} />
				</label>
				<div class="mt-4 flex min-w-0 items-center gap-2 text-sm">
					<FileText class="size-4 shrink-0 text-muted-foreground" />
					{#if archivoNuevo}
						<span class="truncate">{archivoNuevo}</span>
						<span class="shrink-0 text-xs text-muted-foreground">· se sube al guardar</span>
					{:else if inicial?.responsivaArchivo && !quitarResponsiva}
						<a
							href="/colaboradores/{inicial.id}/responsiva"
							target="_blank"
							class="truncate text-primary hover:underline"
						>
							{inicial.responsivaNombre ?? 'Ver responsiva'}
						</a>
					{:else}
						<span class="text-muted-foreground">
							{quitarResponsiva ? 'Se quitará al guardar' : 'Sin responsiva'}
						</span>
					{/if}
				</div>
				<div class="mt-3 flex flex-wrap gap-2">
					<label class="{botonSec} cursor-pointer">
						<Upload class="size-4" />
						{inicial?.responsivaArchivo || archivoNuevo ? 'Reemplazar' : 'Subir'}
						<input
							bind:this={inputResponsiva}
							type="file"
							name="responsiva"
							accept=".pdf,.jpg,.jpeg,.png"
							class="sr-only"
							onchange={elegirResponsiva}
						/>
					</label>
					{#if archivoNuevo || (inicial?.responsivaArchivo && !quitarResponsiva)}
						<button type="button" class={botonSec} onclick={quitar}>
							<X class="size-4" /> Quitar
						</button>
					{/if}
					{#if archivoGuardado}
						<button type="button" class={botonSec} onclick={imprimir}>
							<Printer class="size-4" /> Imprimir
						</button>
						<a href="/colaboradores/{inicial?.id}/responsiva?descargar=1" download class={botonSec}>
							<Download class="size-4" /> Descargar
						</a>
					{/if}
				</div>
			</section>
		</div>

		<div class="flex min-w-0 flex-col gap-6">
			<section class="rounded-lg border border-border bg-card p-6">
				<h2 class="text-sm font-semibold">Equipo principal</h2>
				<div class="mt-4 flex flex-col gap-6 sm:flex-row">
					<label class="{cajaFoto} h-36 w-full bg-white sm:w-48">
						{#if fotoEquipo}
							<img src={fotoEquipo} alt="Foto del equipo" class="size-full object-contain" />
						{:else}
							<span class="flex flex-col items-center gap-1 text-xs text-muted-foreground">
								<ImagePlus class="size-5" /> Foto del equipo
							</span>
						{/if}
						<input
							type="file"
							accept="image/*"
							class="sr-only"
							onchange={(e) => elegirImagen(e, 800, (v) => (fotoEquipo = v))}
						/>
					</label>
					<div class="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
						<div class="col-span-2 flex flex-col gap-1.5">
							<span class={etiqueta}>Tipo</span>
							<div
								role="radiogroup"
								aria-label="Tipo de equipo"
								class="inline-flex w-fit max-w-full flex-wrap rounded-lg border border-border bg-white p-0.5"
							>
								{#each TIPOS_EQUIPO as t (t)}
									<label
										class={[
											'cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition-colors has-focus-visible:ring-2 has-focus-visible:ring-ring/40',
											cpu.tipo === t
												? 'bg-primary text-primary-foreground'
												: 'text-foreground hover:bg-muted'
										]}
									>
										<input
											type="radio"
											name="tipo-equipo"
											value={t}
											bind:group={cpu.tipo}
											class="sr-only"
										/>
										{t}
									</label>
								{/each}
							</div>
						</div>
						<label class="flex flex-col gap-1.5">
							<span class={etiqueta}>Marca</span>
							<input class={input} bind:value={cpu.marca} />
						</label>
						<label class="flex flex-col gap-1.5">
							<span class={etiqueta}>Modelo</span>
							<input class={input} bind:value={cpu.modelo} />
						</label>
						<label class="col-span-2 flex flex-col gap-1.5">
							<span class={etiqueta}>No. Serie</span>
							<input class={input} bind:value={cpu.serie} />
						</label>
					</div>
				</div>
			</section>

			<section class="flex min-w-0 flex-col rounded-lg border border-border bg-card p-6">
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

				<div class="mt-4 overflow-x-auto rounded-lg border border-border">
					<table class="w-full text-sm">
						<thead class="bg-muted/60 text-left text-xs text-muted-foreground">
							<tr>
								<th class="min-w-40 px-3 py-2 font-medium">Tipo</th>
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
									<td class="p-1 align-top">
										<select
											class={celda}
											aria-label="Tipo de periférico"
											bind:value={() => (p.otro ? OTRO : p.tipo), (v) => cambiarTipo(p, v)}
										>
											<option value="">Elegir…</option>
											{#each TIPOS_PERIFERICO as t (t)}
												<option value={t}>{t}</option>
											{/each}
											<option value={OTRO}>Otro…</option>
										</select>
										{#if p.otro}
											<input
												class="{celda} mt-1"
												aria-label="¿Qué periférico es?"
												placeholder="¿Qué es?"
												bind:value={p.tipo}
											/>
										{/if}
									</td>
									{#each ['marca', 'modelo', 'serie'] as const as campo (campo)}
										<td class="p-1 align-top">
											<input class={celda} bind:value={p[campo]} />
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
	</div>
</form>

<Confirmar bind:abierto={confirmarBorrado} titulo="Eliminar colaborador">
	Se borrará a <span class="font-medium text-foreground">{titulo}</span> junto con todos sus equipos.
	Esta acción no se puede deshacer.
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
