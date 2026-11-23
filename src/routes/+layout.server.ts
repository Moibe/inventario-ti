import type { LayoutServerLoad } from './$types';

// El guard (sin sesión → /login, salvo el login y las invitaciones) vive en hooks.server.ts; aquí
// solo se pasa quién está dentro. `url` se lee a propósito: así SvelteKit vuelve a pedir este load
// en CADA navegación del cliente y cada navegación pasa por el guard. Sin eso el load se queda en
// caché, y si la sesión muere a medio uso el login se pinta con la barra del usuario viejo.
export const load: LayoutServerLoad = async ({ locals, url }) => {
	void url.pathname;
	return { usuario: locals.usuario };
};
