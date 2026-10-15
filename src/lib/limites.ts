// Límites de subida. Viven aquí, fuera de $lib/server, porque el navegador y el
// servidor tienen que usar exactamente los mismos: si se separan, el navegador
// deja pasar algo que el servidor rechaza y el usuario se queda sin explicación.

export const MAX_RESPONSIVA = 15 * 1024 * 1024;
export const EXTENSIONES_RESPONSIVA = ['.pdf', '.jpg', '.jpeg', '.png'];

// Generoso a propósito: el Excel que manda el capturista trae imágenes pegadas
// (el primero pesó 139 MB). El archivo se escribe a disco por partes, así que
// este número no se traduce en memoria ocupada en el servidor.
// OJO: el .env del servidor necesita BODY_SIZE_LIMIT por encima de este número
// (adapter-node corta la petición antes de que llegue a la app). Ver .env.example.
export const MAX_ENVIO = 250 * 1024 * 1024;
export const EXTENSIONES_ENVIO = ['.xlsx', '.xlsm', '.xls', '.csv'];

/** Extensión en minúsculas, o '' si no tiene. Un archivo llamado ".pdf" no cuenta. */
export function extensionDe(nombre: string) {
	const punto = nombre.lastIndexOf('.');
	return punto > 0 ? nombre.slice(punto).toLowerCase() : '';
}

/** Tamaño de un archivo, como se escribe en español. */
export const enMb = (bytes: number) =>
	bytes < 1024 * 1024
		? `${Math.max(1, Math.round(bytes / 1024))} KB`
		: `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;

/** Un tope siempre es redondo, así que se escribe sin decimales. */
export const topeEnMb = (bytes: number) => `${Math.round(bytes / 1024 / 1024)} MB`;

/** Mensaje para el usuario, o null si el archivo está bien. */
export function revisarArchivo(
	archivo: { name: string; size: number },
	max: number,
	extensiones: string[],
	queEs: string
) {
	const ext = extensionDe(archivo.name);
	if (!extensiones.includes(ext))
		return `No se puede enviar un archivo ${ext || 'sin extensión'}: debe ser ${queEs}`;
	if (archivo.size === 0) return 'El archivo está vacío';
	if (archivo.size > max)
		return `“${archivo.name}” pesa ${enMb(archivo.size)} y el máximo son ${topeEnMb(max)}. Avisa a TI si necesitas mandar uno más grande.`;
	return null;
}
