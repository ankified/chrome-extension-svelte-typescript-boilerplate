<script lang="ts">
	import * as Sidebar from "../components/ui/sidebar/index.js";
	import * as Collapsible from "../components/ui/collapsible/index.js";
	import * as Tooltip from "../components/ui/tooltip/index.js";
	import { cn } from "../utils.js";
	import ProjectSwitcher from "./project-switcher.svelte";

	// Importar os novos componentes de navegação
	import NavKnowledgeBase from "./sidebar/nav-knowledge-base.svelte";
	import NavSavedItems from "./sidebar/nav-saved-items.svelte";
	import NavProject from "./sidebar/nav-project.svelte";
	import NavPersonal from "./sidebar/nav-personal.svelte";
	import NavFooter from "./sidebar/nav-footer.svelte";

	// Importar NavItem de src/types.ts
	import type { NavItem } from "../../types.js";

	// Ícones Lucide (alguns podem se tornar específicos dos sub-componentes, mas é bom ter os gerais aqui)
	import Home from "@lucide/svelte/icons/home";
	import Library from "@lucide/svelte/icons/library";
	import Bookmark from "@lucide/svelte/icons/bookmark";
	import KanbanSquare from "@lucide/svelte/icons/kanban-square";
	import Lightbulb from "@lucide/svelte/icons/lightbulb";
	import StickyNote from "@lucide/svelte/icons/sticky-note"; // Para Notas dentro de Pessoal
	import School from "@lucide/svelte/icons/school";
	import SettingsIcon from "@lucide/svelte/icons/settings";
	import AlertTriangle from "@lucide/svelte/icons/alert-triangle";
	import ChevronDown from '@lucide/svelte/icons/chevron-down'; // Usado nos subcomponentes

	// Ícones para subitens (podem ser movidos para os componentes específicos ou mantidos aqui se preferir centralizar)
	import FileText from "@lucide/svelte/icons/file-text";
	import Rss from "@lucide/svelte/icons/rss";
	import BookMarked from "@lucide/svelte/icons/book-marked";
	import Globe from "@lucide/svelte/icons/globe";
	import HardDrive from "@lucide/svelte/icons/hard-drive";
	import Waypoints from "@lucide/svelte/icons/waypoints";
	import CalendarDays from "@lucide/svelte/icons/calendar-days";
	import NotebookPen from "@lucide/svelte/icons/notebook-pen";
	

	let { activeTab = "home", onTabChange = (tabId: string) => {} } = $props(); 

	let openCollapsibles = $state<Record<string, boolean>>({});

	const mainNavigation: NavItem[] = [
		{
			id: "home",
			label: "Início",
			icon: Home,
			collapsible: false,
		},
		{
			id: "base-conhecimento-group",
			label: "Base de conhecimento",
			icon: Library,
			collapsible: true,
			defaultOpen: false,
			subItems: [
				{ id: "kb-vademecum", label: "Vade-mecum", icon: FileText },
				{ id: "kb-updates", label: "Atualizações", icon: Rss },
				{ id: "kb-wiki", label: "Wiki", icon: BookMarked },
			],
		},
		{ 
			id: "saved-items-menu", 
			label: "Itens salvos",
			icon: Bookmark, 
			collapsible: true,
			defaultOpen: false, 
			subItems: [
				{ id: "saved-web", label: "Web", icon: Globe },
				{ id: "saved-local", label: "Local", icon: HardDrive },
			],
		},
		{ 
			id: "project-menu", 
			label: "Projeto",
			icon: KanbanSquare, 
			collapsible: true,
			defaultOpen: false, 
			subItems: [
				{ id: "project-kanban", label: "Kanban", icon: KanbanSquare }, // Ícone pode ser diferente para o subitem se desejado
				{ id: "project-flow", label: "Fluxo", icon: Waypoints },
				{ id: "project-schedule", label: "Cronograma", icon: CalendarDays },
			],
		},
		{ 
			id: "personal-menu", 
			label: "Pessoal",
			icon: Lightbulb, // Ícone principal para "Pessoal"
			collapsible: true,
			defaultOpen: false, 
			subItems: [
				{ id: "personal-heuristics", label: "Heurísticas", icon: Lightbulb }, // Subitem Heurísticas
				{
					id: "personal-notes-group",
					label: "Notas",
					icon: StickyNote,
					collapsible: true,
					defaultOpen: false, 
					subItems: [
						{ id: "personal-notes-short", label: "Notas curtas", icon: FileText },
						{ id: "personal-notes-annotations", label: "Anotações", icon: NotebookPen },
					],
				},
				{ id: "personal-flashcards", label: "Flashcards", icon: School },
			],
		},
	];

	const footerNavigation: NavItem[] = [
		{ id: "settings", label: "Configurações", icon: SettingsIcon },
		{ id: "alerts", label: "Alertas", icon: AlertTriangle },
	];

	function initializeCollapsibles(items: NavItem[]) {
		for (const item of items) {
			if (item.collapsible) {
				openCollapsibles[item.id] = !!item.defaultOpen;
			}
			if (item.subItems) {
				initializeCollapsibles(item.subItems);
			}
		}
	}
	initializeCollapsibles(mainNavigation);

	function handleTabClick(tabId: string) {
		if (tabId !== activeTab) {
			onTabChange(tabId);
		}
	}

	// Função para o pai modificar o estado
	function toggleCollapsible(itemId: string) {
		openCollapsibles[itemId] = !openCollapsibles[itemId];
	}

	// toggleCollapsible não é mais diretamente usado no template de app-sidebar, 
	// mas bind:open nos subcomponentes cuidará disso se openCollapsibles for passado e modificado lá.
	// Ou, se os subcomponentes não modificarem openCollapsibles diretamente, precisaríamos de uma forma de eles chamarem toggleCollapsible.
	// A abordagem mais simples é que eles gerenciem `open` para seus `Collapsible.Root` com `bind:open={openCollapsibles[item.id]}`.
	// Para que isso funcione, `openCollapsibles` precisa ser um `$state` ou ser passado de uma forma que permita two-way binding.
	// Sendo `$state`, já é reativo. Os componentes filhos podem usar `bind:open={openCollapsibles[item.id]}`.

	const baseMenuButtonClasses = "flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none transition-[width,height,padding] focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent active:text-sidebar-accent-foreground ring-sidebar-ring";
	const activeMenuButtonClasses = "bg-sidebar-accent text-sidebar-accent-foreground font-medium";

	// Separar o item "Início" para renderização direta
	const homeItem = mainNavigation.find(item => item.id === 'home');
	const otherMainNavigation = mainNavigation.filter(item => item.id !== 'home');

</script>

<Sidebar.Root collapsible="icon" variant="inset">
	<Sidebar.Content class="flex flex-col h-full">
		<ProjectSwitcher /> 
		<div class="flex-1 overflow-y-auto p-2 space-y-1">
			<Sidebar.Group>
				<Sidebar.GroupContent>
					<Sidebar.Menu>
			{#if homeItem}
				<Sidebar.MenuItem>
					<Sidebar.MenuButton isActive={activeTab === homeItem.id} class="w-full flex">
						{#snippet child(props: Record<string, any>)}
							<button 
								type="button" 
								class="flex items-center w-full gap-2" 
								onclick={() => handleTabClick(homeItem.id)}
								{...props}
							>
								{#if homeItem.icon}<homeItem.icon {...props} class="size-4 shrink-0" />{/if}
								<span class="text-sm text-left truncate">{homeItem.label}</span>
							</button>
						{/snippet}
						{#snippet tooltipContent()}{homeItem.label}{/snippet}
					</Sidebar.MenuButton>
				</Sidebar.MenuItem>
			{/if}
			</Sidebar.Menu>
		</Sidebar.GroupContent>
		</Sidebar.Group>
			{#each otherMainNavigation as navSection (navSection.id)}
				{#if navSection.id === 'base-conhecimento-group'}
					<NavKnowledgeBase 
						item={navSection} 
						{activeTab} 
						{openCollapsibles} 
						{handleTabClick} 
						{toggleCollapsible}
						{baseMenuButtonClasses} 
						{activeMenuButtonClasses} 
					/>
				{:else if navSection.id === 'saved-items-menu'}
					<NavSavedItems 
						item={navSection} 
						{activeTab} 
						{openCollapsibles} 
						{handleTabClick} 
						{toggleCollapsible}
						{baseMenuButtonClasses} 
						{activeMenuButtonClasses} 
					/>
				{:else if navSection.id === 'project-menu'}
					<NavProject 
						item={navSection} 
						{activeTab} 
						{openCollapsibles} 
						{handleTabClick} 
						{toggleCollapsible}
						{baseMenuButtonClasses} 
						{activeMenuButtonClasses} 
					/>
				{:else if navSection.id === 'personal-menu'}
					<NavPersonal 
						item={navSection} 
						{activeTab} 
						{openCollapsibles} 
						{handleTabClick} 
						{toggleCollapsible}
						{baseMenuButtonClasses} 
						{activeMenuButtonClasses} 
					/>
				{/if}
			{/each}
		</div>

		<Sidebar.Footer class="mt-auto p-2 border-t">
			<NavFooter navItems={footerNavigation} {activeTab} {handleTabClick} />
		</Sidebar.Footer>
	</Sidebar.Content>
</Sidebar.Root>
