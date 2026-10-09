<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		abierto = $bindable(false),
		titulo,
		children,
		acciones,
		onCerrar
	}: {
		abierto: boolean;
		titulo: string;
		children: Snippet;
		acciones: Snippet;
		/** Para cuando el padre decide si está abierto (y no se usa bind:abierto). */
		onCerrar?: () => void;
	} = $props();

	// Si el padre manda onCerrar, él manda: tocar `abierto` aquí dejaría dos
	// fuentes de verdad peleándose.
	const cerrar = () => (onCerrar ? onCerrar() : (abierto = false));
</script>

<svelte:window onkeydown={(e) => abierto && e.key === 'Escape' && cerrar()} />

{#if abierto}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<button
			type="button"
			aria-label="Cerrar"
			class="absolute inset-0 bg-foreground/20 backdrop-blur-[2px]"
			onclick={cerrar}
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
