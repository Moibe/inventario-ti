import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { extname } from 'node:path';
import { db } from '$lib/server/db';
import { envios } from '$lib/server/db/schema';
import { leerEnvio, TIPOS_ENVIO } from '$lib/server/envios';
import type { RequestHandler } from './$types';

// RFC 5987: encodeURIComponent deja pasar ' ( ) *, que ahí no son válidos.
const codificarNombre = (nombre: string) =>
	encodeURIComponent(nombre).replace(
		/['()*]/g,
		(c) => '%' + c.charCodeAt(0).toString(16).toUpperCase()
	);

// Descargar lo que mandó el capturista es cosa del superadmin.
export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.usuario?.esAdmin) error(403, 'Solo el superadmin descarga los archivos enviados.');

	const id = Number(params.id);
	if (!Number.isInteger(id)) error(404, 'No encontrado');

	const [envio] = await db.select().from(envios).where(eq(envios.id, id));
	if (!envio) error(404, 'No encontrado');

	const contenido = await leerEnvio(envio.archivo).catch(() => null);
	if (!contenido) error(404, 'El archivo ya no está en el servidor');

	return new Response(new Uint8Array(contenido), {
		headers: {
			'content-type':
				TIPOS_ENVIO[extname(envio.archivo).toLowerCase()] ?? 'application/octet-stream',
			'content-disposition': `attachment; filename*=UTF-8''${codificarNombre(envio.nombre)}`,
			'x-content-type-options': 'nosniff'
		}
	});
};
