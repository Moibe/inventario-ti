import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { envios } from '$lib/server/db/schema';
import { borrarEnvio, guardarEnvioEnPartes } from '$lib/server/envios';
import { enMb, EXTENSIONES_ENVIO, extensionDe, MAX_ENVIO, topeEnMb } from '$lib/limites';
import type { RequestHandler } from './$types';

// Cualquier cuenta con sesión puede mandar un archivo a TI; descargarlo es otra
// cosa y solo lo hace el superadmin (ver /envios).
//
// El archivo llega como cuerpo crudo (no multipart) y con el nombre en la query:
// así se puede escribir a disco por partes en vez de juntarlo entero en memoria.
export const POST: RequestHandler = async ({ request, url, locals }) => {
	if (!locals.usuario) error(401, 'Necesitas iniciar sesión.');

	// La protección CSRF de SvelteKit solo cubre los content-type de formulario,
	// y este no lo es, así que el origen se revisa aquí. (La cookie es SameSite
	// lax, o sea que de todos modos no viajaría desde otro sitio; esto es el
	// segundo cerrojo.)
	const origen = request.headers.get('origin');
	if (origen && origen !== url.origin) error(403, 'Origen no permitido.');

	const nombre = (url.searchParams.get('nombre') ?? '').trim();
	if (!nombre) return json({ mensaje: 'No llegó el nombre del archivo.' }, { status: 400 });
	if (!EXTENSIONES_ENVIO.includes(extensionDe(nombre)))
		return json(
			{ mensaje: 'El archivo debe ser Excel (.xlsx, .xlsm, .xls) o .csv' },
			{ status: 400 }
		);

	// Rechazo temprano por lo que el cliente dice que pesa; lo que de verdad
	// llegue se vuelve a medir mientras se escribe.
	const declarado = Number(request.headers.get('content-length') ?? '0');
	if (declarado > MAX_ENVIO)
		return json(
			{ mensaje: `El archivo pesa ${enMb(declarado)} y el máximo son ${topeEnMb(MAX_ENVIO)}.` },
			{ status: 413 }
		);
	if (!request.body) return json({ mensaje: 'No llegó ningún archivo.' }, { status: 400 });

	// Primero el disco; si falla, no queda una fila apuntando a nada.
	let guardado: { archivo: string; bytes: number };
	try {
		guardado = await guardarEnvioEnPartes(request.body, nombre);
	} catch (e) {
		const causa = e instanceof Error ? e.message : '';
		if (causa === 'DEMASIADO_GRANDE')
			return json(
				{ mensaje: `El archivo pasa del máximo de ${topeEnMb(MAX_ENVIO)}.` },
				{ status: 413 }
			);
		if (causa === 'VACIO') return json({ mensaje: 'El archivo está vacío' }, { status: 400 });
		return json(
			{ mensaje: 'No se pudo guardar el archivo en el servidor. Avisa a TI.' },
			{ status: 500 }
		);
	}

	try {
		await db.insert(envios).values({
			archivo: guardado.archivo,
			nombre,
			bytes: guardado.bytes,
			enviadoPor: locals.usuario.id
		});
	} catch {
		await borrarEnvio(guardado.archivo);
		return json({ mensaje: 'No se pudo registrar el envío. Intenta de nuevo.' }, { status: 500 });
	}

	return json({ nombre, bytes: guardado.bytes });
};
