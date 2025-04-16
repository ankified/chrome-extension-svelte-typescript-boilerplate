<script lang="ts">
	import * as Sidebar from "../components/ui/sidebar/index.js";
	import Bookmark from "@lucide/svelte/icons/bookmark";
	import StickyNote from "@lucide/svelte/icons/sticky-note";
	import School from "@lucide/svelte/icons/school";
	import Settings from "@lucide/svelte/icons/settings";
	import type { ComponentProps } from "svelte";

	// Props: aba ativa e callback para troca de aba
	let { activeTab = "saved", onTabChange = (tab: string) => {} } = $props();

	// Abas principais
	const tabs = [
		{ id: "saved", label: "Itens Salvos", icon: Bookmark },
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
					{#each tabs as tab}
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
