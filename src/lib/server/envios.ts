import { mkdir, readFile, unlink } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { randomUUID } from 'node:crypto';
import { extname, join } from 'node:path';
import { MAX_ENVIO } from '$lib/limites';

export { MAX_ENVIO };

// Los archivos que el capturista manda a TI. Viven en disco, no en la base, en
// una carpeta ignorada por git para que sobreviva a los pulls del deploy.
const CARPETA = process.env.ENVIOS_DIR ?? './envios';

export const TIPOS_ENVIO: Record<string, string> = {
	'.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	'.xlsm': 'application/vnd.ms-excel.sheet.macroEnabled.12',
	'.xls': 'application/vnd.ms-excel',
	'.csv': 'text/csv'
};
/**
 * Lo que adapter-node acepta por petición, leído del mismo BODY_SIZE_LIMIT que
 * él usa. Sirve para avisar con nombre y apellido cuando el tope del servidor se
 * quedó por debajo del de la app: si no, corta la petición a medias y el usuario
 * solo ve "no se pudo guardar". Regresa null si no hay tope.
 */
export function topeDelServidor(): number | null {
	const valor = (process.env.BODY_SIZE_LIMIT ?? '').trim();
	if (!valor) return 512 * 1024; // el default de adapter-node
	if (valor === '0' || valor.toLowerCase() === 'infinity') return null;
	const m = /^(\d+)([kmg]?)$/i.exec(valor);
	if (!m) return null;
	const multiplicador = { '': 1, k: 1024, m: 1024 ** 2, g: 1024 ** 3 }[m[2].toLowerCase()] ?? 1;
	return Number(m[1]) * multiplicador;
}

/** Extensión reconocida, o null. Única fuente de verdad para validar y guardar. */
export function extensionEnvio(nombre: string) {
	const ext = extname(nombre).toLowerCase();
	return TIPOS_ENVIO[ext] ? ext : null;
}

/**
 * Escribe el cuerpo de la petición a disco por partes, contando lo que pasa.
 *
 * No se usa `request.formData()` porque eso junta el archivo completo en memoria
 * (y luego lo vuelve a copiar): con un Excel de 139 MB son cientos de megas de
 * golpe en un servidor compartido con otras apps. Así la memoria se queda plana
 * sin importar el tamaño.
 */
export async function guardarEnvioEnPartes(cuerpo: ReadableStream<Uint8Array>, nombre: string) {
	const ext = extensionEnvio(nombre);
	if (!ext) throw new Error('Tipo de archivo no permitido');

	await mkdir(CARPETA, { recursive: true });
	const archivo = `${randomUUID()}${ext}`;
	const ruta = join(CARPETA, archivo);

	let bytes = 0;
	// El `content-length` lo manda el cliente y puede mentir; el tope de verdad
	// se aplica aquí, sobre lo que realmente va llegando.
	const limitador = new Transform({
		transform(trozo, _codificacion, listo) {
			bytes += trozo.length;
			if (bytes > MAX_ENVIO) listo(new Error('DEMASIADO_GRANDE'));
			else listo(null, trozo);
		}
	});

	try {
		await pipeline(
			Readable.fromWeb(cuerpo as Parameters<typeof Readable.fromWeb>[0]),
			limitador,
			createWriteStream(ruta)
		);
	} catch (e) {
		await unlink(ruta).catch(() => {});
		throw e;
	}
	if (bytes === 0) {
		await unlink(ruta).catch(() => {});
		throw new Error('VACIO');
	}
	return { archivo, bytes };
}

export async function leerEnvio(nombre: string) {
	return readFile(join(CARPETA, nombre));
}

/** Borra sin fallar si el archivo ya no existe. */
export async function borrarEnvio(nombre: string | null | undefined) {
	if (!nombre) return;
	await unlink(join(CARPETA, nombre)).catch(() => {});
}
