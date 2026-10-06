<script lang="ts">
	import '../app.css';
	import favicon from '#lib/assets/favicon.svg';
	import TopBar from '#lib/components/TopBar.svelte';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Inventario TI</title>
</svelte:head>

<div class="flex min-h-screen flex-col bg-background">
	<TopBar />

	<main class="mx-auto w-full max-w-7xl flex-1 px-6 py-8">
		{@render children()}
	</main>

	<footer class="border-t border-border py-6">
		<p class="text-center text-xs text-muted-foreground">
			© 2026 Grupo CSI. Todos los derechos reservados.
		</p>
	</footer>
</div>
