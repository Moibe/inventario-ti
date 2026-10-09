import { error, fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { colaboradores, equipos } from '$lib/server/db/schema';
import { borrarResponsiva, guardarResponsiva, revisarResponsiva } from '$lib/server/responsivas';
import type { Actions, PageServerLoad } from './$types';

type Equipo = { tipo: string; marca: string; modelo: string; serie: string };

/** `nuevo` o el id numérico de un colaborador existente. */
function leerId(param: string) {
	if (param === 'nuevo') return null;
	const id = Number(param);
	if (!Number.isInteger(id)) error(404, 'Colaborador no encontrado');
	return id;
}

const texto = (v: unknown) => String(v ?? '').trim();

const limpiar = (e: Partial<Equipo>): Equipo => ({
	tipo: texto(e.tipo),
	marca: texto(e.marca),
	modelo: texto(e.modelo),
	serie: texto(e.serie)
});

// Las fotos llegan del navegador ya reducidas (JPEG en data URL); esto solo
// descarta lo que no tenga esa forma o venga desproporcionado.
const MAX_FOTO = 2_000_000;
const esImagen = (v: string) =>
	/^data:image\/(jpeg|png|webp);base64,/.test(v) && v.length <= MAX_FOTO;

const CAMPOS_TEXTO = [
	'nombre',
	'apellidoPaterno',
	'apellidoMaterno',
	'usuario',
	'numeroEmpleado',
	'telefonoMovil',
	'telefonoFijo',
	'area',
	'departamento',
	'puesto',
	'numeroResponsiva'
] as const;

export const load: PageServerLoad = async ({ params }) => {
	const id = leerId(params.id);
	if (id === null) return { colaborador: null };

	const colaborador = await db.query.colaboradores.findFirst({
		where: eq(colaboradores.id, id),
		with: { equipos: true }
	});
	if (!colaborador) error(404, 'Colaborador no encontrado');
	return { colaborador };
};

export const actions: Actions = {
	guardar: async ({ params, request }) => {
		const id = leerId(params.id);
		const formulario = await request.formData();
		let datos: Record<string, unknown>;
		try {
			datos = JSON.parse(String(formulario.get('datos')));
		} catch {
			return fail(400, { mensaje: 'Datos inválidos' });
		}
		if (!datos || typeof datos !== 'object' || Array.isArray(datos))
			return fail(400, { mensaje: 'Datos inválidos' });

		// Todo se valida antes de tocar disco o base, para no guardar a medias.
		const archivo = formulario.get('responsiva');
		const responsiva = archivo instanceof File && archivo.size > 0 ? archivo : null;
		if (responsiva) {
			const problema = revisarResponsiva(responsiva);
			if (problema) return fail(400, { mensaje: problema });
		}

		// Solo se escriben las columnas que vengan en el envío: una pestaña abierta
		// desde antes de un despliegue manda menos campos, y si se sobrescribiera
		// todo borraría en silencio lo que esa versión no conoce.
		const p: Record<string, unknown> = { ...((datos.persona as object) ?? {}) };
		// En el formato anterior `apellido` era el paterno.
		if (!('apellidoPaterno' in p) && 'apellido' in p) p.apellidoPaterno = p.apellido;

		type Columnas = typeof colaboradores.$inferInsert;
		const persona: Partial<Columnas> = {};
		const asignar = (campo: keyof Columnas, valor: string | null) => {
			(persona as Record<string, string | null>)[campo] = valor;
		};

		for (const campo of CAMPOS_TEXTO) if (campo in p) asignar(campo, texto(p[campo]));

		for (const campo of ['foto', 'fotoEquipo'] as const) {
			if (!(campo in datos)) continue;
			const valor = (datos[campo] as string) || null;
			if (valor && !esImagen(valor)) return fail(400, { mensaje: 'La foto no es válida' });
			asignar(campo, valor);
		}

		const faltaNombre = id === null ? !persona.nombre : 'nombre' in persona && !persona.nombre;
		if (faltaNombre) return fail(400, { mensaje: 'El nombre es obligatorio' });

		const anterior =
			id === null
				? undefined
				: await db.query.colaboradores.findFirst({
						where: eq(colaboradores.id, id),
						columns: { responsivaArchivo: true },
						with: { equipos: { columns: { principal: true, tipo: true } } }
					});
		if (id !== null && !anterior) error(404, 'Colaborador no encontrado');

		// El equipo principal es CPU o Laptop. Si el envío no lo trae (formato
		// anterior), se conserva el que ya estaba en vez de degradarlo a CPU.
		const cpuDatos = (datos.cpu as Partial<Equipo>) ?? {};
		const tipoPrevio = anterior?.equipos.find((e) => e.principal)?.tipo;
		const tipo =
			cpuDatos.tipo === 'Laptop' || cpuDatos.tipo === 'CPU'
				? cpuDatos.tipo
				: tipoPrevio === 'Laptop'
					? 'Laptop'
					: 'CPU';
		const cpu = { ...limpiar(cpuDatos), tipo };

		// Las filas que quedaron totalmente vacías no se guardan.
		const perifericos = ((datos.perifericos as Partial<Equipo>[]) ?? [])
			.map(limpiar)
			.filter((x) => x.tipo || x.marca || x.modelo || x.serie);

		// El archivo se escribe ANTES de la transacción y con un nombre que no
		// depende del id: si falla el disco, no queda media alta en la base.
		let archivoNuevo: string | null = null;
		if (responsiva) {
			try {
				archivoNuevo = await guardarResponsiva(responsiva);
			} catch {
				return fail(500, {
					mensaje: 'No se pudo guardar el archivo de la responsiva en el servidor. Avisa a TI.'
				});
			}
			asignar('responsivaArchivo', archivoNuevo);
			asignar('responsivaNombre', responsiva.name);
		} else if (datos.quitarResponsiva) {
			asignar('responsivaArchivo', null);
			asignar('responsivaNombre', null);
		}

		// better-sqlite3 es síncrono: la transacción no puede llevar awaits.
		let guardadoId: number | null;
		try {
			guardadoId = db.transaction((tx) => {
				let colaboradorId = id;
				if (colaboradorId === null) {
					// `nombre` ya se exigió arriba para un alta nueva.
					const nombre = persona.nombre ?? '';
					colaboradorId = tx
						.insert(colaboradores)
						.values({ ...persona, nombre })
						.returning()
						.get().id;
				} else {
					const actualizado = tx
						.update(colaboradores)
						.set(persona)
						.where(eq(colaboradores.id, colaboradorId))
						.returning()
						.get();
					if (!actualizado) return null;
					tx.delete(equipos).where(eq(equipos.colaboradorId, colaboradorId)).run();
				}
				tx.insert(equipos)
					.values([
						{ ...cpu, colaboradorId, principal: true },
						...perifericos.map((x) => ({ ...x, colaboradorId, principal: false }))
					])
					.run();
				return colaboradorId;
			});
		} catch {
			await borrarResponsiva(archivoNuevo);
			return fail(500, { mensaje: 'No se pudo guardar. Intenta de nuevo o avisa a TI.' });
		}
		if (guardadoId === null) {
			await borrarResponsiva(archivoNuevo);
			error(404, 'Colaborador no encontrado');
		}

		// Ya confirmado el cambio, el archivo anterior sobra.
		if (archivoNuevo || datos.quitarResponsiva) await borrarResponsiva(anterior?.responsivaArchivo);

		redirect(303, '/');
	},

	eliminar: async ({ params }) => {
		const id = leerId(params.id);
		if (id !== null) {
			const [borrado] = await db
				.delete(colaboradores)
				.where(eq(colaboradores.id, id))
				.returning({ responsivaArchivo: colaboradores.responsivaArchivo });
			await borrarResponsiva(borrado?.responsivaArchivo);
		}
		redirect(303, '/');
	}
};
