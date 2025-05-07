<script lang="ts">
	import * as Sidebar from "../ui/sidebar/index.js";
	import type { NavItem } from '../../../types.js'; // Importar NavItem
	// Não precisamos de Collapsible ou ChevronDown para o footer, assumindo que são itens simples.
	// import * as Tooltip from "../ui/tooltip/index.js"; // Tooltip ainda é usado por MenuButton

	// Definição local de NavItem removida

	let {
		navItems, // Array de NavItems para o footer
		activeTab,
		handleTabClick
		// Não precisa de openCollapsibles, baseMenuButtonClasses, activeMenuButtonClasses se os botões do footer não usarem essa lógica
	} = $props<{
		navItems: NavItem[];
		activeTab: string;
		handleTabClick: (tabId: string) => void;
	}>();

</script>

<Sidebar.Menu class="space-y-1">
	{#each navItems as item (item.id)}
		<Sidebar.MenuItem>
			<Sidebar.MenuButton isActive={activeTab === item.id} class="w-full flex">
				{#snippet child(props: Record<string, any>)}
					<button 
						type="button" 
						class="flex items-center w-full gap-2" 
						onclick={() => handleTabClick(item.id)}
						{...props}
					>
						{#if item.icon}<item.icon {...props} class="size-4 shrink-0" />{/if}
						<span class="text-sm text-left truncate">{item.label}</span>
					</button>
				{/snippet}
				{#snippet tooltipContent()}{item.label}{/snippet}
			</Sidebar.MenuButton>
		</Sidebar.MenuItem>
	{/each}
</Sidebar.Menu> 