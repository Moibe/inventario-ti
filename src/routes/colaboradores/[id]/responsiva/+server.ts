import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { extname } from 'node:path';
import { db } from '$lib/server/db';
import { colaboradores } from '$lib/server/db/schema';
import { leerResponsiva, TIPOS } from '$lib/server/responsivas';
import type { RequestHandler } from './$types';

// RFC 5987: encodeURIComponent deja pasar ' ( ) *, que ahí no son válidos.
const codificarNombre = (nombre: string) =>
	encodeURIComponent(nombre).replace(
		/['()*]/g,
		(c) => '%' + c.charCodeAt(0).toString(16).toUpperCase()
	);

// Abre la responsiva escaneada en el navegador (inline: PDF o imagen); con
// `?descargar` la manda como archivo para guardar.
export const GET: RequestHandler = async ({ params, url, locals }) => {
	// El guard de +layout.server.ts solo protege páginas: un endpoint tiene que
	// revisar la sesión por su cuenta o quedaría abierto a toda la red.
	if (!locals.usuario) error(401, 'Necesitas iniciar sesión.');

	const id = Number(params.id);
	if (!Number.isInteger(id)) error(404, 'No encontrada');

	const c = await db.query.colaboradores.findFirst({
		where: eq(colaboradores.id, id),
		columns: { responsivaArchivo: true, responsivaNombre: true }
	});
	if (!c?.responsivaArchivo) error(404, 'Este colaborador no tiene responsiva');

	const contenido = await leerResponsiva(c.responsivaArchivo).catch(() => null);
	if (!contenido) error(404, 'No se encontró el archivo de la responsiva');

	const nombre = c.responsivaNombre ?? c.responsivaArchivo;
	const disposicion = url.searchParams.has('descargar') ? 'attachment' : 'inline';
	return new Response(new Uint8Array(contenido), {
		headers: {
			'content-type': TIPOS[extname(c.responsivaArchivo).toLowerCase()] ?? 'application/octet-stream',
			'content-disposition': `${disposicion}; filename*=UTF-8''${codificarNombre(nombre)}`,
			'x-content-type-options': 'nosniff'
		}
	});
};
