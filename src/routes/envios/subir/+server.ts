import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { envios } from '$lib/server/db/schema';
import { borrarEnvio, guardarEnvio, revisarEnvio } from '$lib/server/envios';
import type { RequestHandler } from './$types';

// Cualquier cuenta con sesión puede mandar un archivo a TI; descargarlo es otra
// cosa y solo lo hace el superadmin (ver /envios).
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.usuario) error(401, 'Necesitas iniciar sesión.');

	const fd = await request.formData();
	const archivo = fd.get('archivo');
	if (!(archivo instanceof File)) return json({ mensaje: 'No llegó ningún archivo.' }, { status: 400 });

	const problema = revisarEnvio(archivo);
	if (problema) return json({ mensaje: problema }, { status: 400 });

	// Primero el disco; si falla, no queda una fila apuntando a nada.
	let enDisco: string;
	try {
		enDisco = await guardarEnvio(archivo);
	} catch {
		return json({ mensaje: 'No se pudo guardar el archivo en el servidor. Avisa a TI.' }, { status: 500 });
	}

	try {
		await db.insert(envios).values({
			archivo: enDisco,
			nombre: archivo.name,
			bytes: archivo.size,
			enviadoPor: locals.usuario.id
		});
	} catch {
		await borrarEnvio(enDisco);
		return json({ mensaje: 'No se pudo registrar el envío. Intenta de nuevo.' }, { status: 500 });
	}

	return json({ nombre: archivo.name });
};
