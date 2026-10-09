/** Nombre y apellidos en un solo texto, sin dobles espacios si falta alguno. */
export function nombreCompleto(p: {
	nombre: string;
	apellidoPaterno: string;
	apellidoMaterno: string;
}) {
	return [p.nombre, p.apellidoPaterno, p.apellidoMaterno].filter(Boolean).join(' ');
}

/**
 * Minúsculas y sin acentos, para comparar y buscar: en una nómina en español
 * nadie teclea "Pérez" ni "Núñez" con acento al buscar.
 */
export const sinAcentos = (t: string) =>
	t
		.normalize('NFD')
		.replace(/\p{M}/gu, '')
		.toLowerCase()
		.trim();
