import { error, fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { colaboradores, equipos } from '$lib/server/db/schema';
import {
	borrarResponsiva,
	guardarResponsiva,
	MAX_BYTES,
	TIPOS
} from '$lib/server/responsivas';
import type { Actions, PageServerLoad } from './$types';

type Equipo = { tipo: string; marca: string; modelo: string; serie: string };
type Datos = {
	persona: {
		nombre: string;
		apellido: string;
		usuario: string;
		numeroEmpleado: string;
		area: string;
		departamento: string;
		puesto: string;
	};
	foto: string | null;
	quitarResponsiva?: boolean;
	cpu: Equipo;
	perifericos: Equipo[];
};

/** `nuevo` o el id numérico de un colaborador existente. */
function leerId(param: string) {
	if (param === 'nuevo') return null;
	const id = Number(param);
	if (!Number.isInteger(id)) error(404, 'Colaborador no encontrado');
	return id;
}

const limpiar = (e: Partial<Equipo>): Equipo => ({
	tipo: String(e.tipo ?? '').trim(),
	marca: String(e.marca ?? '').trim(),
	modelo: String(e.modelo ?? '').trim(),
	serie: String(e.serie ?? '').trim()
});

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
		let datos: Datos;
		try {
			datos = JSON.parse(String(formulario.get('datos')));
		} catch {
			return fail(400, { mensaje: 'Datos inválidos' });
		}

		// Se valida antes de tocar la base, para no guardar a medias.
		const archivo = formulario.get('responsiva');
		const responsiva = archivo instanceof File && archivo.size > 0 ? archivo : null;
		if (responsiva) {
			const ext = responsiva.name.slice(responsiva.name.lastIndexOf('.')).toLowerCase();
			if (!TIPOS[ext]) return fail(400, { mensaje: 'La responsiva debe ser PDF, JPG o PNG' });
			if (responsiva.size > MAX_BYTES)
				return fail(400, { mensaje: 'La responsiva pesa más de 15 MB' });
		}

		const persona = {
			nombre: String(datos.persona?.nombre ?? '').trim(),
			apellido: String(datos.persona?.apellido ?? '').trim(),
			usuario: String(datos.persona?.usuario ?? '').trim(),
			numeroEmpleado: String(datos.persona?.numeroEmpleado ?? '').trim(),
			area: String(datos.persona?.area ?? '').trim(),
			departamento: String(datos.persona?.departamento ?? '').trim(),
			puesto: String(datos.persona?.puesto ?? '').trim(),
			foto: datos.foto || null
		};
		if (!persona.nombre) return fail(400, { mensaje: 'El nombre es obligatorio' });

		const cpu = { ...limpiar(datos.cpu ?? {}), tipo: 'CPU' };
		// Las filas que quedaron totalmente vacías no se guardan.
		const perifericos = (datos.perifericos ?? [])
			.map(limpiar)
			.filter((p) => p.tipo || p.marca || p.modelo || p.serie);

		const anterior =
			id === null
				? undefined
				: await db.query.colaboradores.findFirst({
						where: eq(colaboradores.id, id),
						columns: { responsivaArchivo: true }
					});

		// better-sqlite3 es síncrono: la transacción no puede llevar awaits.
		const guardadoId = db.transaction((tx) => {
			let colaboradorId = id;
			if (colaboradorId === null) {
				colaboradorId = tx.insert(colaboradores).values(persona).returning().get().id;
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
					...perifericos.map((p) => ({ ...p, colaboradorId, principal: false }))
				])
				.run();
			return colaboradorId;
		});
		if (guardadoId === null) error(404, 'Colaborador no encontrado');

		// El archivo se escribe ya con el id definitivo; el anterior se borra al final.
		if (responsiva || datos.quitarResponsiva) {
			const nuevo = responsiva ? await guardarResponsiva(guardadoId, responsiva) : null;
			await db
				.update(colaboradores)
				.set({ responsivaArchivo: nuevo, responsivaNombre: responsiva?.name ?? null })
				.where(eq(colaboradores.id, guardadoId));
			await borrarResponsiva(anterior?.responsivaArchivo);
		}

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
