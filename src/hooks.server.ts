import type { Handle } from '@sveltejs/kit';
import {
	COOKIE_SESION,
	validarTokenSesion,
	ponerCookieSesion,
	borrarCookieSesion
} from '$lib/server/auth';

// Rellena locals.usuario en cada petición. El guard que manda a /login vive en
// el +layout.server.ts raíz.
export const handle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get(COOKIE_SESION);
	if (!token) {
		event.locals.usuario = null;
		event.locals.sesion = null;
		return resolve(event);
	}

	const { sesion, usuario } = await validarTokenSesion(token);
	if (sesion && usuario) {
		ponerCookieSesion(event.cookies, token, sesion.expiraEn); // mantiene la cookie al día
		event.locals.usuario = usuario;
		event.locals.sesion = sesion;
	} else {
		borrarCookieSesion(event.cookies);
		event.locals.usuario = null;
		event.locals.sesion = null;
	}

	return resolve(event);
};
