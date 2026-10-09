import { error, fail } from '@sveltejs/kit';
import { asc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { usuarios } from '$lib/server/db/schema';
import { crearInvitacion, generarTokenInvitacion } from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

function soloAdmin(locals: App.Locals) {
	if (!locals.usuario?.esAdmin) error(403, 'Solo el superadmin administra las cuentas.');
}

export const load: PageServerLoad = async ({ locals }) => {
	soloAdmin(locals);
	const lista = await db
		.select({
			id: usuarios.id,
			usuario: usuarios.usuario,
			esAdmin: usuarios.esAdmin,
			creadoEn: usuarios.creadoEn,
			contrasenaHash: usuarios.contrasenaHash
		})
		.from(usuarios)
		.orderBy(asc(usuarios.usuario));

	// `sinActivar`: la cuenta existe pero su dueño aún no abre su invitación. El
	// hash nunca sale hacia el navegador.
	return {
		usuarios: lista.map(({ contrasenaHash, ...u }) => ({
			...u,
			sinActivar: contrasenaHash === null
		})),
		yo: locals.usuario!.id
	};
};

export const actions: Actions = {
	// El admin no escribe contraseñas ajenas: crea la cuenta y entrega una liga de
	// un solo uso para que la persona ponga la suya.
	crear: async ({ request, locals, url }) => {
		soloAdmin(locals);
		const fd = await request.formData();
		const usuario = String(fd.get('usuario') ?? '').trim();
		const esAdmin = fd.get('esAdmin') != null;
		if (!usuario) return fail(400, { errorCrear: 'El usuario es obligatorio.', usuario });

		let usuarioId: number;
		try {
			const [fila] = await db
				.insert(usuarios)
				.values({ usuario, contrasenaHash: null, esAdmin })
				.returning({ id: usuarios.id });
			usuarioId = fila.id;
		} catch {
			return fail(409, { errorCrear: `El usuario "${usuario}" ya existe.`, usuario });
		}

		const token = generarTokenInvitacion();
		await crearInvitacion(token, usuarioId);
		return { liga: `${url.origin}/invitacion/${token}`, para: usuario };
	},

	// Nueva liga para una cuenta que aún no se activa (se perdió o expiró).
	reinvitar: async ({ request, locals, url }) => {
		soloAdmin(locals);
		const id = Number((await request.formData()).get('id'));
		if (!Number.isInteger(id)) return fail(400, { errorLiga: 'Usuario inválido.' });

		const [u] = await db
			.select({ usuario: usuarios.usuario, contrasenaHash: usuarios.contrasenaHash })
			.from(usuarios)
			.where(eq(usuarios.id, id));
		if (!u) return fail(404, { errorLiga: 'Usuario no encontrado.' });
		if (u.contrasenaHash !== null)
			return fail(409, { errorLiga: 'Esa cuenta ya está activa; no necesita invitación.' });

		const token = generarTokenInvitacion();
		await crearInvitacion(token, id);
		return { liga: `${url.origin}/invitacion/${token}`, para: u.usuario };
	},

	eliminar: async ({ request, locals }) => {
		soloAdmin(locals);
		const id = Number((await request.formData()).get('id'));
		if (!Number.isInteger(id)) return fail(400, { errorBorrar: 'Usuario inválido.' });
		if (locals.usuario!.id === id)
			return fail(409, { errorBorrar: 'No puedes borrar tu propia cuenta.' });

		// Sin admins nadie podría volver a administrar nada.
		const admins = await db.select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.esAdmin, true));
		const borrado = await db
			.select({ esAdmin: usuarios.esAdmin })
			.from(usuarios)
			.where(eq(usuarios.id, id));
		if (borrado[0]?.esAdmin && admins.length <= 1)
			return fail(409, { errorBorrar: 'Es el único superadmin; no se puede borrar.' });

		await db.delete(usuarios).where(eq(usuarios.id, id));
		return { borrado: true };
	}
};
