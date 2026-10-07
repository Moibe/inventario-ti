import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { extname } from 'node:path';
import { db } from '$lib/server/db';
import { colaboradores } from '$lib/server/db/schema';
import { leerResponsiva, TIPOS } from '$lib/server/responsivas';
import type { RequestHandler } from './$types';

// Abre la responsiva escaneada en el navegador (inline: PDF o imagen).
export const GET: RequestHandler = async ({ params }) => {
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
	return new Response(new Uint8Array(contenido), {
		headers: {
			'content-type': TIPOS[extname(c.responsivaArchivo).toLowerCase()] ?? 'application/octet-stream',
			'content-disposition': `inline; filename*=UTF-8''${encodeURIComponent(nombre)}`
		}
	});
};
