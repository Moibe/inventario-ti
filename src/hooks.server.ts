import { json, redirect, type Handle, type RequestEvent } from '@sveltejs/kit';
import {
	COOKIE_SESION,
	validarTokenSesion,
	ponerCookieSesion,
	borrarCookieSesion
} from '$lib/server/auth';

// Lo único que se ve sin sesión: el login y las ligas de invitación (quien todavía no activa su
// cuenta no puede tener sesión). Los archivos de static/ y de /_app/ (el JS y el CSS del propio
// login) no pasan por este hook: los sirve adapter-node (o Vite en dev) antes.
const esPublica = (ruta: string) => ruta === '/login' || ruta.startsWith('/invitacion/');

// ¿La pidió el navegador al navegar, o SvelteKit por él (__data.json, actions con use:enhance)?
// A esas se les contesta con un redirect al login. A un fetch del JS propio (p. ej. el de
// /envios/subir) no: seguiría el redirect en silencio hasta el HTML del login, con status 200, y
// la ficha diría "Se envió" sin haber enviado nada. A ese se le da 401 con el mismo { mensaje }
// que usan los endpoints.
function esNavegacion(event: RequestEvent) {
	return (
		event.isDataRequest ||
		event.request.headers.get('x-sveltekit-action') === 'true' ||
		(event.request.headers.get('accept') ?? '').includes('text/html')
	);
}

// Rellena locals.usuario y es el guard de TODA la app. Tiene que vivir aquí y no en el
// +layout.server.ts: el load de un layout solo corre al pintar una página, pero una form action
// (POST /ruta?/accion) o un +server.ts se ejecutan sin pasar por él. Con el guard en el layout,
// cualquiera en la red podía borrar o editar colaboradores sin entrar.
export const handle: Handle = async ({ event, resolve }) => {
	event.locals.usuario = null;
	event.locals.sesion = null;

	const token = event.cookies.get(COOKIE_SESION);
	if (token) {
		const { sesion, usuario } = await validarTokenSesion(token);
		if (sesion && usuario) {
			ponerCookieSesion(event.cookies, token, sesion.expiraEn); // mantiene la cookie al día
			event.locals.usuario = usuario;
			event.locals.sesion = sesion;
		} else {
			borrarCookieSesion(event.cookies);
		}
	}

	if (!event.locals.usuario && !esPublica(event.url.pathname)) {
		if (!esNavegacion(event)) return json({ mensaje: 'Necesitas iniciar sesión.' }, { status: 401 });
		redirect(303, '/login');
	}

	return resolve(event);
};
