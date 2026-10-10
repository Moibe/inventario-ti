import { error, fail } from '@sveltejs/kit';
import { desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { envios } from '$lib/server/db/schema';
import { borrarEnvio } from '$lib/server/envios';
import type { Actions, PageServerLoad } from './$types';

function soloAdmin(locals: App.Locals) {
	if (!locals.usuario?.esAdmin) error(403, 'Solo el superadmin ve los archivos enviados.');
}

export const load: PageServerLoad = async ({ locals }) => {
	soloAdmin(locals);
	const lista = await db.query.envios.findMany({
		with: { usuario: { columns: { usuario: true } } },
		orderBy: desc(envios.creadoEn)
	});
	return {
		envios: lista.map((e) => ({
			id: e.id,
			nombre: e.nombre,
			bytes: e.bytes,
			creadoEn: e.creadoEn,
			// La cuenta pudo borrarse después de mandar el archivo.
			de: e.usuario?.usuario ?? 'cuenta borrada'
		}))
	};
};

export const actions: Actions = {
	eliminar: async ({ request, locals }) => {
		soloAdmin(locals);
		const id = Number((await request.formData()).get('id'));
		if (!Number.isInteger(id)) return fail(400, { mensaje: 'Archivo inválido.' });

		const [borrado] = await db
			.delete(envios)
			.where(eq(envios.id, id))
			.returning({ archivo: envios.archivo });
		await borrarEnvio(borrado?.archivo);
		return { borrado: true };
	}
};
