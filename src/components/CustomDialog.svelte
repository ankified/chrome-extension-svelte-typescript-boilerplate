<script lang="ts">
	import type { Snippet } from 'svelte';
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';

	type $$Props = {
		open?: boolean;
		onClose?: () => void;
		children: Snippet; // Main content
		title?: Snippet;
		footer?: Snippet;
	};

	let {
		open = $bindable(),
		onClose = () => {},
		children,
		title = undefined,
		footer = undefined
	} = $props();

	// svelte-ignore non_reactive_update
	let dialogPanel: HTMLDivElement;

	function close() {
		open = false;
		onClose();
	}

	function handlePanelClick(event: MouseEvent) {
		event.stopPropagation();
	}

	onMount(() => {
		const handleKeydown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				close();
			}
		};

		window.addEventListener('keydown', handleKeydown);

		return () => {
			window.removeEventListener('keydown', handleKeydown);
		};
	});
</script>

{#if open}
	<div
		class="fixed inset-0 z-50001 bg-black/60 backdrop-blur-sm"
		transition:fly={{ duration: 150 }}
		onclick={close}
	>
		<div
			bind:this={dialogPanel}
			class="fixed left-[50%] top-[50%] z-50 grid !w-lg max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 rounded-lg"
			role="dialog"
			aria-modal="true"
			aria-labelledby="dialog-title"
			tabindex="-1"
			onclick={handlePanelClick}
		>
			{#if title}
				<div id="dialog-title" class="flex flex-col space-y-1.5 text-center sm:text-left">
					{@render title()}
				</div>
			{/if}

			<div class="text-sm text-muted-foreground">
				{@render children()}
			</div>

			{#if footer}
				<div class="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
					{@render footer()}
				</div>
			{/if}
		</div>
	</div>
{/if}