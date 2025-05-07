<script lang="ts">
	import * as Sidebar from "../ui/sidebar/index.js";
	import * as Collapsible from "../ui/collapsible/index.js";
	import * as Tooltip from "../ui/tooltip/index.js";
	import { cn } from "../../utils.js";
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import type { NavItem } from '../../../types.js';

	let {
		item, // NavItem para "Projeto"
		activeTab,
		openCollapsibles,
		handleTabClick,
		toggleCollapsible,
		baseMenuButtonClasses,
		activeMenuButtonClasses
	} = $props<{
		item: NavItem;
		activeTab: string;
		openCollapsibles: Record<string, boolean>;
		handleTabClick: (tabId: string) => void;
		toggleCollapsible: (itemId: string) => void;
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
{/if} 