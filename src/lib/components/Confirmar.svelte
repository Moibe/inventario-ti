<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		abierto = $bindable(false),
		titulo,
		children,
		acciones
	}: { abierto: boolean; titulo: string; children: Snippet; acciones: Snippet } = $props();
</script>

<svelte:window onkeydown={(e) => abierto && e.key === 'Escape' && (abierto = false)} />

{#if abierto}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<button
			type="button"
			aria-label="Cerrar"
			class="absolute inset-0 bg-foreground/20 backdrop-blur-[2px]"
			onclick={() => (abierto = false)}
		></button>
		<div
			role="dialog"
			aria-modal="true"
			class="relative w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-lg"
		>
			<h2 class="text-sm font-semibold">{titulo}</h2>
			<div class="mt-2 text-sm text-muted-foreground">{@render children()}</div>
			<div class="mt-6 flex justify-end gap-2">{@render acciones()}</div>
		</div>
	</div>
{/if}
