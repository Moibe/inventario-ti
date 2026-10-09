import { fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { usuarios } from '$lib/server/db/schema';
import { hashContrasena, verificarContrasena } from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const yo = locals.usuario!;
	const [fila] = await db
		.select({ creadoEn: usuarios.creadoEn })
		.from(usuarios)
		.where(eq(usuarios.id, yo.id));
	return { usuario: yo.usuario, esAdmin: yo.esAdmin, creadoEn: fila?.creadoEn ?? null };
};

export const actions: Actions = {
	cambiarContrasena: async ({ request, locals }) => {
		const yo = locals.usuario!;
		const fd = await request.formData();
		const actual = String(fd.get('actual') ?? '');
		const nueva = String(fd.get('nueva') ?? '');
		const confirmacion = String(fd.get('confirmacion') ?? '');

		if (nueva.length < 8)
			return fail(400, { error: 'La contraseña nueva debe tener al menos 8 caracteres.' });
		if (nueva !== confirmacion) return fail(400, { error: 'Las contraseñas nuevas no coinciden.' });

		const [fila] = await db
			.select({ contrasenaHash: usuarios.contrasenaHash })
			.from(usuarios)
			.where(eq(usuarios.id, yo.id));
		if (!fila || !verificarContrasena(actual, fila.contrasenaHash))
			return fail(400, { error: 'La contraseña actual es incorrecta.' });

		await db
			.update(usuarios)
			.set({ contrasenaHash: hashContrasena(nueva) })
			.where(eq(usuarios.id, yo.id));
		return { cambiada: true };
	}
};
