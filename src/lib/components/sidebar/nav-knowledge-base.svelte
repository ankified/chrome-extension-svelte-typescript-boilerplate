<script lang="ts">
	import * as Sidebar from "../ui/sidebar/index.js";
	import * as Collapsible from "../ui/collapsible/index.js";
	import * as Tooltip from "../ui/tooltip/index.js";
	import { cn } from "../../utils.js";
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import type { NavItem } from '../../../types.js'; // Importar NavItem

	// Definição local de NavItem removida

	// Props esperadas pelo componente
	let {
		item, // O objeto NavItem para a seção "Base de conhecimento"
		activeTab,
		openCollapsibles, // O objeto $state que guarda os estados abertos/fechados
		handleTabClick, // Função para mudar a aba ativa
		toggleCollapsible, // Receber a função de callback
		baseMenuButtonClasses, // Classes CSS base para botões de menu
		activeMenuButtonClasses // Classes CSS para o botão de menu ativo
	} = $props<{
		item: NavItem;
		activeTab: string;
		openCollapsibles: Record<string, boolean>;
		handleTabClick: (tabId: string) => void;
		toggleCollapsible: (itemId: string) => void; // Adicionar tipo da prop
		baseMenuButtonClasses: string;
		activeMenuButtonClasses: string;
	}>();

</script>

{#if item.collapsible && item.subItems}
	<Sidebar.MenuItem class="p-0 m-0 block w-full">
		<Collapsible.Root 
			open={openCollapsibles[item.id]} 
			onOpenChange={() => toggleCollapsible(item.id)} 
			class="w-full"
		>
			<Tooltip.Root>
				<Tooltip.Trigger>
					<Collapsible.Trigger
						class={cn(
							baseMenuButtonClasses,
							(item.subItems.some((sub: NavItem) => sub.id === activeTab) || openCollapsibles[item.id]) && activeMenuButtonClasses,
							"group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-2 [&>svg]:size-4 [&>svg]:shrink-0"
						)}
						aria-label={item.label}
					>
						{#if item.icon}<item.icon class="size-4 shrink-0" />{/if}
						<span class="flex-1 text-sm text-left truncate">{item.label}</span>
						<ChevronDown class="ml-auto h-4 w-4 shrink-0 transition-transform duration-200 {openCollapsibles[item.id] ? 'rotate-180' : ''}" />
					</Collapsible.Trigger>
				</Tooltip.Trigger>
				<Tooltip.Content side="right" sideOffset={5}>{item.label}</Tooltip.Content>
			</Tooltip.Root>
			<Collapsible.Content>
				<Sidebar.MenuSub class="ml-4 space-y-1 py-1">
					{#each item.subItems as subItem (subItem.id)}
						<Sidebar.MenuSubItem>
							<Sidebar.MenuSubButton isActive={activeTab === subItem.id} class="w-full">
								{#snippet child(props: Record<string, any>)}
									<button 
										type="button" 
										class="flex items-center w-full gap-2" 
										onclick={() => handleTabClick(subItem.id)}
										{...props}
									>
										{#if subItem.icon}<subItem.icon {...props} class="size-4 shrink-0" />{/if}
										<span class="text-sm truncate">{subItem.label}</span>
									</button>
								{/snippet}
							</Sidebar.MenuSubButton>
						</Sidebar.MenuSubItem>
					{/each}
				</Sidebar.MenuSub>
			</Collapsible.Content>
		</Collapsible.Root>
	</Sidebar.MenuItem>
{:else if !item.collapsible}
	<!-- Caso para itens de nível superior não colapsáveis (ex: "Início") -->
	<Sidebar.MenuItem>
		<Sidebar.MenuButton isActive={activeTab === item.id} onclick={() => handleTabClick(item.id)} class="w-full flex">
			{#snippet child(props: Record<string, any>)}
				{#if item.icon}<item.icon {...props} class="size-4 shrink-0" />{/if}
				<span class="text-sm text-left truncate">{item.label}</span>
			{/snippet}
			{#snippet tooltipContent()}{item.label}{/snippet}
		</Sidebar.MenuButton>
	</Sidebar.MenuItem>
{/if} 