import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { extname, join } from 'node:path';
import { EXTENSIONES_ENVIO, MAX_ENVIO, revisarArchivo } from '$lib/limites';

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
/** Extensión reconocida, o null. Única fuente de verdad para validar y guardar. */
export function extensionEnvio(nombre: string) {
	const ext = extname(nombre).toLowerCase();
	return TIPOS_ENVIO[ext] ? ext : null;
}

/** Revisa tipo y tamaño; regresa el mensaje para el usuario, o null si está bien. */
export function revisarEnvio(archivo: File) {
	return revisarArchivo(archivo, MAX_ENVIO, EXTENSIONES_ENVIO, 'Excel (.xlsx, .xlsm, .xls) o .csv');
}

/** Escribe el archivo con un nombre único y regresa cómo quedó en disco. */
export async function guardarEnvio(archivo: File) {
	const ext = extensionEnvio(archivo.name);
	if (!ext) throw new Error('Tipo de archivo no permitido');

	await mkdir(CARPETA, { recursive: true });
	const nombre = `${randomUUID()}${ext}`;
	await writeFile(join(CARPETA, nombre), Buffer.from(await archivo.arrayBuffer()));
	return nombre;
}

export async function leerEnvio(nombre: string) {
	return readFile(join(CARPETA, nombre));
}

/** Borra sin fallar si el archivo ya no existe. */
export async function borrarEnvio(nombre: string | null | undefined) {
	if (!nombre) return;
	await unlink(join(CARPETA, nombre)).catch(() => {});
}
