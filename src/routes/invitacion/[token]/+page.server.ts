import { error, fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { usuarios } from '$lib/server/db/schema';
import {
	validarTokenInvitacion,
	consumirInvitaciones,
	hashContrasena,
	generarTokenSesion,
	crearSesion,
	ponerCookieSesion
} from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

// Liga de un solo uso para activar la cuenta. Es pública: ver la excepción en
// el +layout.server.ts raíz.
export const load: PageServerLoad = async ({ params, locals }) => {
	// Si ya hay sesión (p. ej. el admin abrió por error la liga de otra persona)
	// no seguimos, para no cambiarle la sesión activa por la del invitado.
	if (locals.usuario) return { conSesion: true, usuario: null };

	const invitacion = await validarTokenInvitacion(params.token);
	if (!invitacion) error(404, 'Esta invitación no es válida o ya expiró.');
	return { conSesion: false, usuario: invitacion.usuario };
};

export const actions: Actions = {
	default: async ({ params, request, cookies, locals }) => {
		if (locals.usuario)
			return fail(409, { error: 'Ya tienes una sesión abierta. Ciérrala para usar esta liga.' });

		const invitacion = await validarTokenInvitacion(params.token);
		if (!invitacion) error(404, 'Esta invitación no es válida o ya expiró.');

		const fd = await request.formData();
		const contrasena = String(fd.get('contrasena') ?? '');
		const confirmacion = String(fd.get('confirmacion') ?? '');
		if (contrasena.length < 8)
			return fail(400, { error: 'La contraseña debe tener al menos 8 caracteres.' });
		if (contrasena !== confirmacion) return fail(400, { error: 'Las contraseñas no coinciden.' });

		await db
			.update(usuarios)
			.set({ contrasenaHash: hashContrasena(contrasena) })
			.where(eq(usuarios.id, invitacion.usuarioId));
		await consumirInvitaciones(invitacion.usuarioId);

		// Activar la cuenta ya deja a la persona adentro.
		const token = generarTokenSesion();
		const sesion = await crearSesion(token, invitacion.usuarioId);
		ponerCookieSesion(cookies, token, sesion.expiraEn);
		redirect(303, '/');
	}
};
