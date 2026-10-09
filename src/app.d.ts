// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { UsuarioSesion } from '$lib/tipos';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			usuario: UsuarioSesion | null;
			sesion: { id: string; usuarioId: number; expiraEn: number } | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
