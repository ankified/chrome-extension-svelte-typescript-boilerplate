<script lang="ts">
  import { savedItems, addKnownTagIfNotExists } from "../../storage";
  import type { SavedItem } from "../../types";
  import { Button } from "../../lib/components/ui/button/index.js";
  import { Input } from "../../lib/components/ui/input/index.js";
  import { ScrollArea } from "../../lib/components/ui/scroll-area/index.js";
  import { Check, Tag } from "@lucide/svelte";

  let { itemId, allTags = [], availableSystemTags = [], onClose = () => {} } = $props();

  let item = $derived($savedItems.find((i: SavedItem) => i.id === itemId));

  let newTagInput = $state("");

  function toggleTagForItem(tag: string) {
    if (!item || !tag) return;
    const lowerCaseTag = tag.toLowerCase();
    const currentTags = Array.isArray(item.tags) ? item.tags : [];
    const tagIndex = currentTags.findIndex(t => t.toLowerCase() === lowerCaseTag);
    let updatedTags: string[];
    let isNewTagForSystem = false;
    if (tagIndex > -1) {
      updatedTags = currentTags.filter((_, index) => index !== tagIndex);
    } else {
      const existingSystemTag = availableSystemTags.find(t => t.toLowerCase() === lowerCaseTag);
      const tagToAddProperCase = existingSystemTag || tag;
      updatedTags = [...currentTags, tagToAddProperCase];
      if (!existingSystemTag) {
        isNewTagForSystem = true;
      }
    }
    savedItems.update(items =>
      items.map(i => i.id === item.id ? { ...i, tags: updatedTags } : i)
    );
    if (isNewTagForSystem) {
      addKnownTagIfNotExists(tag);
    }
  }

  function handleAddTagFromInput() {
    if (!newTagInput.trim() || !item) return;
    const tagToAdd = newTagInput.trim();
    toggleTagForItem(tagToAdd);
    newTagInput = '';
  }
</script>

{#if item}
<div class="max-w-[625px]">
  <div class="px-6 pt-6 pb-2">
    <h2 class="text-lg font-semibold text-center">Gerenciar Tags do Item</h2>
  </div>
  <div class="p-3 flex items-start space-x-3 border-b max-w-[625px] dark:border-gray-700 -mx-6 px-6">
    <div class="flex-grow min-w-0 overflow-hidden w-full">
      <a href={item.url} target="_blank" rel="noopener noreferrer" class="text-sm font-semibold text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer truncate block" title={item.title}>
        {item.title || "Sem título"}
      </a>
      <a href={item.url} target="_blank" rel="noopener noreferrer" class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 hover:text-blue-500 dark:hover:text-blue-300 cursor-pointer truncate block" title={item.url}>
        {item.url}
      </a>
    </div>
  </div>
  <div class="grid gap-4 py-4">
    <div class="flex items-center space-x-2">
      <Input 
        id="new-tag-input-{item.id}" 
        placeholder="Adicionar tag..." 
        bind:value={newTagInput} 
        onkeydown={(e) => { if(e.key === 'Enter') { handleAddTagFromInput(); } }}
      />
      <Button onclick={handleAddTagFromInput} disabled={!newTagInput.trim()}>Adicionar</Button>
    </div>
    <div class="text-sm font-medium mb-1 text-center text-muted-foreground">
      Tags Selecionadas: {Array.isArray(item.tags) ? item.tags.length : 0} / {availableSystemTags?.length ?? 0}
    </div>
    <div class="text-sm font-medium mb-1">Selecionar Tags:</div>
    {#if availableSystemTags && availableSystemTags.length > 0}
      <ScrollArea class="h-36 w-full rounded-md border p-2">
        <div class="flex flex-wrap gap-2">
          {#each availableSystemTags as systemTag (systemTag)}
            {@const isSelected = Array.isArray(item.tags) && item.tags.some((t: string) => t.toLowerCase() === systemTag.toLowerCase())}
            <button
              type="button"
              class={`tag-pill text-xs py-1 px-3 rounded-full flex items-center gap-1.5 cursor-pointer transition-all duration-150 ease-in-out relative border
                ${isSelected ? 'bg-primary text-primary-foreground border-primary-foreground/80 shadow-md' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border-transparent hover:opacity-80'}`}
              title={systemTag}
              onclick={() => toggleTagForItem(systemTag)}
            >
              {#if isSelected}
                <Check class="h-3.5 w-3.5 absolute -left-1 -top-1 bg-background text-foreground rounded-full p-0.5 border border-border" />
              {/if}
              <Tag class="h-3 w-3 opacity-75 flex-shrink-0" />
              {systemTag}
            </button>
          {/each}
        </div>
      </ScrollArea>
    {:else}
      <p class="text-xs text-muted-foreground italic">Nenhuma tag criada no sistema ainda.</p>
    {/if}
  </div>
</div>
{:else}
  <div class="p-4 text-center text-muted-foreground">Carregando item ou item não encontrado...</div>
{/if} 