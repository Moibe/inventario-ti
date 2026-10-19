import type { UsuarioSesion } from '$lib/tipos';

/**
 * Quién puede mandar un Excel a TI desde la ficha.
 *
 * Por ahora solo el superadmin (decisión del 2026-10-19, "por el momento"): al
 * capturista ni se le muestra el botón ni puede usar la ruta. Esta función es el
 * único interruptor, y la pantalla y el servidor la consultan los dos: ocultar el
 * botón sin cerrar la ruta dejaría la función abierta a quien arme la petición.
 *
 * Para volver a abrirlo a todos los que tengan sesión: `return !!usuario`.
 */
export const puedeEnviarExcel = (usuario: UsuarioSesion | null) => !!usuario?.esAdmin;
