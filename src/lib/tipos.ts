/** Lo que la sesión sabe de quien está dentro. Vive fuera de $lib/server para
 *  que los componentes del navegador también puedan usar el tipo. */
export type UsuarioSesion = { id: number; usuario: string; esAdmin: boolean };
