<script lang="ts">
	import { page } from '$app/state';
	import LayoutGrid from '@lucide/svelte/icons/layout-grid';
	import Monitor from '@lucide/svelte/icons/monitor';
	import Search from '@lucide/svelte/icons/search';

	const navItems = [
		{ href: '/', label: 'Inicio', icon: LayoutGrid },
		{ href: '/equipos', label: 'Equipos', icon: Monitor }
	];
</script>

<header class="sticky top-0 z-40 border-b border-border bg-white">
	<div class="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-6">
		<div class="flex items-center gap-6">
			<a href="/" class="text-sm font-semibold tracking-tight text-foreground">
				Inventario <span class="text-primary">TI</span>
			</a>

			<nav class="flex items-center gap-2">
				{#each navItems as item (item.href)}
					{@const active =
						item.href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(item.href)}
					<a
						href={item.href}
						class={[
							'flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-medium transition-colors',
							active ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted'
						]}
					>
						<item.icon class="size-4" />
						{item.label}
					</a>
				{/each}
			</nav>
		</div>

		<button
			type="button"
			aria-label="Buscar"
			class="flex size-8 items-center justify-center rounded-lg border border-border bg-white transition-colors hover:bg-muted"
		>
			<Search class="size-4" />
		</button>
	</div>
</header>
