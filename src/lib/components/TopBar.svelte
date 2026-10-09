<script lang="ts">
	import { page } from '$app/state';
	import LayoutGrid from '@lucide/svelte/icons/layout-grid';
	import FileSpreadsheet from '@lucide/svelte/icons/file-spreadsheet';
	import Users from '@lucide/svelte/icons/users';
	import LogOut from '@lucide/svelte/icons/log-out';
	import type { UsuarioSesion } from '$lib/tipos';

	let { usuario }: { usuario: UsuarioSesion } = $props();

	// Las pantallas de administración solo existen para el superadmin.
	const navItems = $derived(
		[
			{ href: '/', label: 'Inicio', icon: LayoutGrid, soloAdmin: false },
			{ href: '/envios', label: 'Archivos enviados', icon: FileSpreadsheet, soloAdmin: true },
			{ href: '/usuarios', label: 'Usuarios', icon: Users, soloAdmin: true }
		].filter((x) => usuario.esAdmin || !x.soloAdmin)
	);
</script>

<header class="sticky top-0 z-40 border-b border-border bg-white">
	<div
		class="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 py-3"
	>
		<div class="flex flex-wrap items-center gap-x-6 gap-y-2">
			<a href="/" class="text-sm font-semibold tracking-tight text-foreground">
				Inventario <span class="text-primary">TI</span>
			</a>

			<nav class="flex flex-wrap items-center gap-2">
				{#each navItems as item (item.href)}
					{@const activo =
						item.href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(item.href)}
					<a
						href={item.href}
						class={[
							'flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-medium transition-colors',
							activo ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted'
						]}
					>
						<item.icon class="size-4" />
						{item.label}
					</a>
				{/each}
			</nav>
		</div>

		<div class="flex items-center gap-3">
			<a href="/mi-cuenta" class="text-right transition-opacity hover:opacity-70">
				<p class="text-sm font-medium text-foreground">{usuario.usuario}</p>
				<p class="text-xs text-muted-foreground">
					{usuario.esAdmin ? 'Superadmin' : 'Capturista'}
				</p>
			</a>
			<form method="POST" action="/logout">
				<button
					type="submit"
					aria-label="Cerrar sesión"
					title="Cerrar sesión"
					class="flex size-8 items-center justify-center rounded-lg border border-border bg-white transition-colors hover:bg-muted"
				>
					<LogOut class="size-4" />
				</button>
			</form>
		</div>
	</div>
</header>
