import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
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

/** Valida y guarda el archivo; regresa el nombre con el que quedó en disco. */
export async function guardarResponsiva(colaboradorId: number, archivo: File) {
	const ext = extname(archivo.name).toLowerCase();
	if (!TIPOS[ext]) throw new Error('La responsiva debe ser PDF, JPG o PNG');
	if (archivo.size > MAX_BYTES) throw new Error('La responsiva pesa más de 15 MB');

	await mkdir(CARPETA, { recursive: true });
	const nombre = `${colaboradorId}-${Date.now()}${ext}`;
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
