import { redirect } from '@sveltejs/kit';
import { borrarCookieSesion, cerrarSesion } from '$lib/server/auth';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, cookies }) => {
	if (locals.sesion) await cerrarSesion(locals.sesion.id);
	borrarCookieSesion(cookies);
	redirect(303, '/login');
};
