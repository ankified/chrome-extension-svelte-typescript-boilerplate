<script lang="ts">
  import { savedItems, groups as groupsStore, createGroup } from "../../storage";
  import type { SavedItem, Group } from "../../types";
  import { Button } from "../../lib/components/ui/button/index.js";
  import { Input } from "../../lib/components/ui/input/index.js";
  import { ScrollArea } from "../../lib/components/ui/scroll-area/index.js";
  import { Check, Folder } from "@lucide/svelte";
  import chroma from 'chroma-js';

  // Receive itemId instead of the full item object
  let { itemId, allGroups = [], open = false, onClose = () => {} } = $props();

  // Correctly derive the item reactively from the store
  // Use $savedItems to access the reactive value of the store
  // $derived will automatically track changes in the savedItems store
  let item = $derived($savedItems.find((i: SavedItem) => i.id === itemId));

  let newGroupNameDialog = $state("");
  let newGroupDialogColor = $state("#3b82f6");
  const groupColors = [
      "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#6366f1", "#14b8a6"
  ];

  function getTextColorForBackground(bgColor: string): string {
    try {
      return chroma(bgColor).luminance() > 0.5 ? '#000000' : '#ffffff';
    } catch (e) {
      return '#000000';
    }
  }

  function addItemToGroup(localItemId: string, groupId: string) {
    savedItems.update(items =>
      items.map(i => {
        if (i.id === localItemId) { // Use localItemId from argument
          const currentGroupIds = Array.isArray(i.groupIds) ? i.groupIds : [];
          if (!currentGroupIds.includes(groupId)) {
            return { ...i, groupIds: [...currentGroupIds, groupId] };
          }
        }
        return i;
      })
    );
    groupsStore.update(currentGroups => // Use groupsStore to avoid name clash
      currentGroups.map(group => {
        if (group.id === groupId) {
          const currentItemIds = Array.isArray(group.itemIds) ? group.itemIds : [];
          if (!currentItemIds.includes(localItemId)) { // Use localItemId from argument
            return { ...group, itemIds: [...currentItemIds, localItemId] };
          }
        }
        return group;
      })
    );
  }

  function removeItemFromGroup(localItemId: string, groupId: string) {
    savedItems.update(items =>
      items.map(i => {
        if (i.id === localItemId) { // Use localItemId from argument
          const currentGroupIds = Array.isArray(i.groupIds) ? i.groupIds : [];
          return { ...i, groupIds: currentGroupIds.filter(gid => gid !== groupId) };
        }
        return i;
      })
    );
    groupsStore.update(currentGroups => // Use groupsStore to avoid name clash
      currentGroups.map(group => {
        if (group.id === groupId) {
          const currentItemIds = Array.isArray(group.itemIds) ? group.itemIds : [];
          return { ...group, itemIds: currentItemIds.filter(id => id !== localItemId) }; // Use localItemId from argument
        }
        return group;
      })
    );
  }

  async function handleCreateGroupInDialog() {
    // Check item derived value exists
    if (!newGroupNameDialog.trim() || !item) {
        console.warn("Cannot create group, item not found for ID:", itemId);
        return;
    }
    const createdGroup = await createGroup(newGroupNameDialog, newGroupDialogColor);
    if (createdGroup) {
      // Use itemId prop directly here
      addItemToGroup(itemId, createdGroup.id);
      newGroupNameDialog = "";
      newGroupDialogColor = "#3b82f6";
    }
  }
</script>

{#if item} <!-- Add a check to ensure item is loaded before rendering -->
<div class="max-w-[625px]">
  <div class="px-6 pt-6 pb-2">
    <h2 class="text-lg font-semibold text-center">Gerenciar Grupos do Item</h2>
  </div>
  <div class="p-3 flex items-start space-x-3 border-b max-w-[625px] dark:border-gray-700 -mx-6 px-6">
    <img src={`https://www.google.com/s2/favicons?domain=${item.url}&sz=32`} alt="Favicon" class="w-8 h-8 rounded flex-shrink-0 mt-1" />
    <div class="flex-grow min-w-0 overflow-hidden w-full">
      <a href={item.url} target="_blank" rel="noopener noreferrer" class="text-sm font-semibold text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer truncate block" title={item.title}>
        {item.title || "Sem título"}
      </a>
      <a href={item.url} target="_blank" rel="noopener noreferrer" class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 hover:text-blue-500 dark:hover:text-blue-300 cursor-pointer truncate block" title={item.url}>
        {item.url}
      </a>
    </div>
  </div>
  <div class="py-4">
    <!-- Use the derived item for the counter -->
    <div class="text-sm font-medium mb-3 text-center text-muted-foreground">
      Grupos Selecionados: {Array.isArray(item.groupIds) ? item.groupIds.length : 0} / {allGroups?.length ?? 0}
    </div>
    {#if allGroups && allGroups.length > 0}
      <ScrollArea class="h-40 w-full rounded-md border p-2 mb-4">
        <div class="flex flex-wrap gap-2">
          {#each allGroups as group (group.id)}
            <!-- Use the derived item here as well -->
            {@const isChecked = Array.isArray(item.groupIds) && item.groupIds.includes(group.id)}
            {@const bgColor = group.color || '#cccccc'}
            {@const textColor = getTextColorForBackground(bgColor)}
            <button
              type="button"
              class={`group-pill text-xs py-1 px-3 rounded-full flex items-center gap-1.5 cursor-pointer transition-all duration-150 ease-in-out relative border
                ${isChecked ? 'border-opacity-100 shadow-md' : 'border-opacity-0 hover:opacity-80'}`}
              style={`background-color: ${bgColor}; color: ${textColor}; border-color: ${isChecked ? textColor : 'transparent'};`}
              title={group.name}
              onclick={() => {
                if (isChecked) {
                  // Pass itemId prop to the function
                  removeItemFromGroup(itemId, group.id);
                } else {
                  // Pass itemId prop to the function
                  addItemToGroup(itemId, group.id);
                }
              }}
            >
              {#if isChecked}
                <Check class="h-3.5 w-3.5 absolute -left-1 -top-1 bg-primary text-primary-foreground rounded-full p-0.5" />
              {/if}
              <Folder class="h-3 w-3 opacity-75 flex-shrink-0" style={`fill: ${textColor};`} />
              {group.name}
            </button>
          {/each}
        </div>
      </ScrollArea>
    {:else}
      <p class="text-xs text-muted-foreground italic">Nenhum grupo criado ainda.</p>
    {/if}
    <div class="border-t dark:border-gray-700 pt-3">
      <div class="text-sm font-medium mb-2">Criar Novo Grupo</div>
      <div class="flex items-center space-x-2 mb-2">
        <Input type="text" class="flex-grow p-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white" placeholder="Nome do novo grupo" bind:value={newGroupNameDialog} />
        <Button type="button" size="sm" disabled={!newGroupNameDialog.trim()} onclick={handleCreateGroupInDialog}>Criar</Button>
      </div>
      <div class="flex flex-wrap gap-2 mb-2 justify-center">
        {#each groupColors as clr}
          <button type="button" class={`w-5 h-5 rounded-full border-2 transition-all ${newGroupDialogColor === clr ? 'border-white dark:border-gray-300 scale-110' : 'border-transparent opacity-70 hover:opacity-100'}`} style="background-color: {clr};" onclick={() => newGroupDialogColor = clr} aria-label={`Selecionar cor ${clr}`}></button>
        {/each}
      </div>
    </div>
  </div>
</div>
{:else}
  <!-- Optional: Show a loading or error state if item is not found -->
  <div class="p-4 text-center text-muted-foreground">Carregando item ou item não encontrado...</div>
{/if} 