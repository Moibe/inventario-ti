import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

// Guard de toda la app: sin sesión no se ve nada, salvo el login y las ligas de
// invitación (quien todavía no activa su cuenta no puede tener sesión).
export const load: LayoutServerLoad = async ({ locals, url }) => {
	const publica = url.pathname === '/login' || url.pathname.startsWith('/invitacion/');
	if (!locals.usuario && !publica) redirect(303, '/login');
	return { usuario: locals.usuario };
};
