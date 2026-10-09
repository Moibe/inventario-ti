import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { extname, join } from 'node:path';

// Las responsivas escaneadas pesan demasiado para la base: van a disco, junto a
// local.db, en una carpeta ignorada por git (sobrevive a los pulls del deploy).
const CARPETA = process.env.RESPONSIVAS_DIR ?? './responsivas';

export const TIPOS: Record<string, string> = {
	'.pdf': 'application/pdf',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.png': 'image/png'
};
export const MAX_BYTES = 15 * 1024 * 1024;

/**
 * Extensión reconocida del archivo, o null. Es la única fuente de verdad: si el
 * controlador y el guardado la calcularan distinto (p. ej. un archivo llamado
 * ".pdf"), uno aceptaría lo que el otro rechaza y reventaría a medio guardado.
 */
export function extensionResponsiva(nombre: string) {
	const ext = extname(nombre).toLowerCase();
	return TIPOS[ext] ? ext : null;
}

/** Revisa tipo y tamaño; regresa el mensaje para el usuario, o null si está bien. */
export function revisarResponsiva(archivo: File) {
	if (!extensionResponsiva(archivo.name)) return 'La responsiva debe ser PDF, JPG o PNG';
	if (archivo.size > MAX_BYTES) return 'La responsiva pesa más de 15 MB';
	return null;
}

/**
 * Escribe el archivo y regresa el nombre con el que quedó en disco. El nombre no
 * depende del id del colaborador, así que puede escribirse ANTES de tocar la base.
 */
export async function guardarResponsiva(archivo: File) {
	const ext = extensionResponsiva(archivo.name);
	if (!ext) throw new Error('La responsiva debe ser PDF, JPG o PNG');

	await mkdir(CARPETA, { recursive: true });
	const nombre = `${randomUUID()}${ext}`;
	await writeFile(join(CARPETA, nombre), Buffer.from(await archivo.arrayBuffer()));
	return nombre;
}

export async function leerResponsiva(nombre: string) {
	return readFile(join(CARPETA, nombre));
}

/** Borra sin fallar si el archivo ya no existe. */
export async function borrarResponsiva(nombre: string | null | undefined) {
	if (!nombre) return;
	await unlink(join(CARPETA, nombre)).catch(() => {});
}
