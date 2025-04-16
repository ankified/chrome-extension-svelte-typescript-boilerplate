<script lang="ts">
	import * as Sidebar from "../components/ui/sidebar/index.js";
	import Bookmark from "@lucide/svelte/icons/bookmark";
	import StickyNote from "@lucide/svelte/icons/sticky-note";
	import School from "@lucide/svelte/icons/school";
	import Settings from "@lucide/svelte/icons/settings";
	import List from "@lucide/svelte/icons/list";
	import LayoutGrid from "@lucide/svelte/icons/layout-grid";
	import KanbanSquare from "@lucide/svelte/icons/kanban-square";
	import Waypoints from "@lucide/svelte/icons/waypoints";
	import type { ComponentProps } from "svelte";

	// Props: aba ativa e callback para troca de aba
	let { activeTab = "saved-cards", onTabChange = (tab: string) => {} } = $props();

	// Submenus de Itens Salvos
	const savedSubTabs = [
		{ id: "saved-table", label: "Tabela", icon: List },
		{ id: "saved-cards", label: "Cartões", icon: LayoutGrid },
		{ id: "saved-kanban", label: "Kanban", icon: KanbanSquare },
		{ id: "saved-flow", label: "Fluxo", icon: Waypoints },
	];

	// Abas principais
	const tabs = [
		{ id: "saved", label: "Itens Salvos", icon: Bookmark, subTabs: savedSubTabs },
		{ id: "notes", label: "Notas", icon: StickyNote },
		{ id: "flashcards", label: "Flashcards", icon: School },
		{ id: "settings", label: "Configurações", icon: Settings },
	];

	function handleTabClick(tabId: string) {
		if (tabId !== activeTab) onTabChange(tabId);
	}
</script>

<Sidebar.Root variant="inset">
	<Sidebar.Content>
		<Sidebar.Group>
			<Sidebar.GroupLabel>Navegação</Sidebar.GroupLabel>
			<Sidebar.GroupContent>
				<Sidebar.Menu>
					<!-- Itens Salvos com submenus -->
					<Sidebar.MenuItem>
						<Sidebar.MenuButton isActive={activeTab.startsWith('saved')}>
							{#snippet child({ props })}
								<button type="button" {...props} class="flex items-center w-full gap-3">
									<Bookmark class="size-5" />
									<span>Itens Salvos</span>
								</button>
							{/snippet}
						</Sidebar.MenuButton>
						<Sidebar.MenuSub>
							{#each savedSubTabs as sub}
								{@const Icon = sub.icon}
								<Sidebar.MenuSubItem>
									<Sidebar.MenuSubButton isActive={activeTab === sub.id} onclick={() => handleTabClick(sub.id)}>
										{#if Icon}
											<Icon class="size-4 mr-2" />
										{/if}
										<span>{sub.label}</span>
									</Sidebar.MenuSubButton>
								</Sidebar.MenuSubItem>
							{/each}
						</Sidebar.MenuSub>
					</Sidebar.MenuItem>
					<!-- Demais abas principais -->
					{#each tabs.slice(1) as tab}
						<Sidebar.MenuItem>
							<Sidebar.MenuButton isActive={activeTab === tab.id} onclick={() => handleTabClick(tab.id)}>
								{#snippet child({ props })}
									<button type="button" {...props} class="flex items-center w-full gap-3">
										<tab.icon class="size-5" />
										<span>{tab.label}</span>
									</button>
								{/snippet}
							</Sidebar.MenuButton>
						</Sidebar.MenuItem>
					{/each}
				</Sidebar.Menu>
			</Sidebar.GroupContent>
		</Sidebar.Group>
	</Sidebar.Content>
</Sidebar.Root>
