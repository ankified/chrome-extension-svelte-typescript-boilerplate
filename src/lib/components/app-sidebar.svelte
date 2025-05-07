<script lang="ts">
	import * as Sidebar from "../components/ui/sidebar/index.js";
	import * as Collapsible from "../components/ui/collapsible/index.js";
	import * as Tooltip from "../components/ui/tooltip/index.js";
	import { cn } from "../utils.js"; // Restaurar importação
	import ProjectSwitcher from "./project-switcher.svelte"; // Importar o novo componente

	// Ícones Lucide existentes e que serão mantidos/reutilizados
	import Bookmark from "@lucide/svelte/icons/bookmark"; // Será substituído ou removido se não for mais usado diretamente
	import StickyNote from "@lucide/svelte/icons/sticky-note";
	import School from "@lucide/svelte/icons/school";
	import SettingsIcon from "@lucide/svelte/icons/settings"; // Renomeado para evitar conflito com a const settings
	import KanbanSquare from "@lucide/svelte/icons/kanban-square";
	import Waypoints from "@lucide/svelte/icons/waypoints";
	// List e LayoutGrid foram movidos para Options.svelte para o ToggleGroup

	// Novos Ícones Lucide para a nova estrutura
	import Home from "@lucide/svelte/icons/home";
	import Library from "@lucide/svelte/icons/library";
	import FileText from "@lucide/svelte/icons/file-text";
	import Rss from "@lucide/svelte/icons/rss";
	import BookMarked from "@lucide/svelte/icons/book-marked";
	import Globe from "@lucide/svelte/icons/globe";
	import HardDrive from "@lucide/svelte/icons/hard-drive";
	import CalendarDays from "@lucide/svelte/icons/calendar-days";
	import Lightbulb from "@lucide/svelte/icons/lightbulb";
	import NotebookPen from "@lucide/svelte/icons/notebook-pen";
	import AlertTriangle from "@lucide/svelte/icons/alert-triangle";
	import ChevronDown from '@lucide/svelte/icons/chevron-down'; 

	// Props: aba ativa e callback para troca de aba
	// O valor padrão de activeTab pode ser 'home' ou o primeiro item da nova navegação.
	let { activeTab = "home", onTabChange = (tabId: string) => {} } = $props(); 

	// Definição da estrutura dos itens de menu
	interface NavItem {
		id: string;
		label: string;
		icon?: any; // Usando 'any' para os ícones para simplificar a tipagem com Lucide
		collapsible?: boolean; 
		defaultOpen?: boolean;
		subItems?: NavItem[];
		isGroupLabel?: boolean; 
	}

	// Estado local para controlar quais itens colapsáveis estão abertos.
	// Usaremos o ID do item como chave.
	let openCollapsibles = $state<Record<string, boolean>>({});

	// Nova estrutura de dados para o corpo principal do menu
	const mainNavigation: NavItem[] = [
		{
			id: "home",
			label: "Início",
			icon: Home,
		},
		{
			id: "base-conhecimento-group", 
			label: "Base de conhecimento",
			icon: Library, 
			collapsible: true,
			defaultOpen: true, // Mantido, mas será controlado por openCollapsibles[item.id]
			subItems: [
				{ id: "kb-vademecum", label: "Vade-mécum", icon: FileText },
				{ id: "kb-updates", label: "Atualizações", icon: Rss },
				{ id: "kb-wiki", label: "Wiki", icon: BookMarked },
			],
		},
		{ id: "saved-items-label", label: "Itens salvos", isGroupLabel: true },
		{ id: "saved-web", label: "Web", icon: Globe },
		{ id: "saved-local", label: "Local", icon: HardDrive },

		{ id: "project-label", label: "Projeto", isGroupLabel: true },
		{ id: "project-kanban", label: "Kanban", icon: KanbanSquare },
		{ id: "project-flow", label: "Fluxo", icon: Waypoints },
		{ id: "project-schedule", label: "Cronograma", icon: CalendarDays },

		{ id: "personal-label", label: "Pessoal", isGroupLabel: true },
		{ id: "personal-heuristics", label: "Heurísticas", icon: Lightbulb },
		{
			id: "personal-notes-group", 
			label: "Notas",
			icon: StickyNote, 
			collapsible: true,
			defaultOpen: false, // Mantido, mas será controlado por openCollapsibles[item.id]
			subItems: [
				{ id: "personal-notes-short", label: "Notas curtas", icon: FileText },
				{ id: "personal-notes-annotations", label: "Anotações", icon: NotebookPen },
			],
		},
		{ id: "personal-flashcards", label: "Flashcards", icon: School },
	];

	// Nova estrutura de dados para o footer do menu
	const footerNavigation: NavItem[] = [
		{ id: "settings", label: "Configurações", icon: SettingsIcon },
		{ id: "alerts", label: "Alertas", icon: AlertTriangle },
	];

	// Inicializar o estado dos colapsáveis com base em defaultOpen
	function initializeCollapsibles(items: NavItem[]) {
		for (const item of items) {
			if (item.collapsible) {
				openCollapsibles[item.id] = !!item.defaultOpen;
			}
			if (item.subItems) {
				initializeCollapsibles(item.subItems); // Recursivo, se houver colapsáveis aninhados (não é o caso atual)
			}
		}
	}
	initializeCollapsibles(mainNavigation); // Chamar na inicialização

	function handleTabClick(tabId: string) {
		if (tabId !== activeTab) onTabChange(tabId);
	}

	function toggleCollapsible(itemId: string) {
		openCollapsibles[itemId] = !openCollapsibles[itemId];
	}

	// As definições antigas 'tabs' e 'savedSubTabs' foram implicitamente removidas 
	// ao não serem mais referenciadas e por esta nova estrutura substituí-las.

	const baseMenuButtonClasses = "flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none transition-[width,height,padding] focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent active:text-sidebar-accent-foreground ring-sidebar-ring";
	const activeMenuButtonClasses = "bg-sidebar-accent text-sidebar-accent-foreground font-medium";
</script>

<Sidebar.Root collapsible="icon" variant="inset">
	
	<Sidebar.Content class="flex flex-col h-full">
		<!-- Integrar o Project Switcher aqui -->
		<ProjectSwitcher /> 

		<div class="flex-1 overflow-y-auto p-2 space-y-1">
			{#each mainNavigation as item (item.id)}
				{#if item.isGroupLabel}
					<Sidebar.GroupLabel class="px-3 py-2 text-xs font-medium text-muted-foreground">{item.label}</Sidebar.GroupLabel>
				{:else if item.collapsible && item.subItems}
					<Sidebar.MenuItem class="p-0 m-0 block w-full">
						<Collapsible.Root bind:open={openCollapsibles[item.id]} class="w-full">
							<Tooltip.Root>
								<Tooltip.Trigger>
									<Collapsible.Trigger 
										class={cn(
											baseMenuButtonClasses,
											(item.subItems.some(sub => sub.id === activeTab) || openCollapsibles[item.id]) && activeMenuButtonClasses,
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
											<Sidebar.MenuSubButton isActive={activeTab === subItem.id} onclick={() => handleTabClick(subItem.id)} class="w-full">
												{#snippet child({props})}
													{#if subItem.icon}<subItem.icon {...props} class="size-4 shrink-0" />{/if}
													<span class="text-sm truncate">{subItem.label}</span>
												{/snippet}
											</Sidebar.MenuSubButton>
										</Sidebar.MenuSubItem>
									{/each}
								</Sidebar.MenuSub>
							</Collapsible.Content>
						</Collapsible.Root>
					</Sidebar.MenuItem>
				{:else}
					<Sidebar.MenuItem>
						<Sidebar.MenuButton isActive={activeTab === item.id} onclick={() => handleTabClick(item.id)} class="w-full flex">
							{#snippet child({props})}
								{#if item.icon}<item.icon {...props} class="size-4 shrink-0" />{/if}
								<span class="text-sm text-left truncate">{item.label}</span>
							{/snippet}
							{#snippet tooltipContent()}{item.label}{/snippet}
						</Sidebar.MenuButton>
					</Sidebar.MenuItem>
				{/if}
			{/each}
		</div>

		<Sidebar.Footer class="mt-auto p-2 border-t">
			<Sidebar.Menu class="space-y-1">
				{#each footerNavigation as item (item.id)}
				<Sidebar.MenuItem>
					<Sidebar.MenuButton isActive={activeTab === item.id} onclick={() => handleTabClick(item.id)} class="w-full flex">
						{#snippet child({props})}
							{#if item.icon}<item.icon {...props} class="size-4 shrink-0" />{/if}
							<span class="text-sm text-left truncate">{item.label}</span>
						{/snippet}
						{#snippet tooltipContent()}{item.label}{/snippet}
					</Sidebar.MenuButton>
				</Sidebar.MenuItem>
				{/each}
			</Sidebar.Menu>
		</Sidebar.Footer>
	</Sidebar.Content>
</Sidebar.Root>
