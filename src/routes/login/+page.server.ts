import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { usuarios } from '$lib/server/db/schema';
import {
	verificarContrasena,
	generarTokenSesion,
	crearSesion,
	ponerCookieSesion
} from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.usuario) redirect(303, '/');
	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const fd = await request.formData();
		const usuario = String(fd.get('usuario') ?? '').trim();
		const contrasena = String(fd.get('contrasena') ?? '');
		if (!usuario || !contrasena)
			return fail(400, { error: 'Escribe tu usuario y tu contraseña.', usuario });

		const [u] = await db.select().from(usuarios).where(eq(usuarios.usuario, usuario));
		// El mismo mensaje para usuario inexistente, contraseña mala o cuenta sin
		// activar: así no se puede averiguar qué cuentas existen probando nombres.
		if (!u || !verificarContrasena(contrasena, u.contrasenaHash))
			return fail(400, { error: 'Usuario o contraseña incorrectos.', usuario });

		const token = generarTokenSesion();
		const sesion = await crearSesion(token, u.id);
		ponerCookieSesion(cookies, token, sesion.expiraEn);
		redirect(303, '/');
	}
};
