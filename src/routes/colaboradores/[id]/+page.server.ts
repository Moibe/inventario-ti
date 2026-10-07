import { error, fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { colaboradores, equipos } from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';

type Equipo = { tipo: string; marca: string; modelo: string; serie: string };
type Datos = {
	persona: { nombre: string; area: string; departamento: string; puesto: string };
	foto: string | null;
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
		let datos: Datos;
		try {
			datos = JSON.parse(String((await request.formData()).get('datos')));
		} catch {
			return fail(400, { mensaje: 'Datos inválidos' });
		}

		const persona = {
			nombre: String(datos.persona?.nombre ?? '').trim(),
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

		redirect(303, '/');
	},

	eliminar: async ({ params }) => {
		const id = leerId(params.id);
		if (id !== null) await db.delete(colaboradores).where(eq(colaboradores.id, id));
		redirect(303, '/');
	}
};
