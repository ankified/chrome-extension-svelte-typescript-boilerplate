<script lang="ts">
  import { savedItems, groups, notes, flashcards } from "../../storage";
  import type { SavedItem, Group, Note, Flashcard } from "../../types";
  import * as AlertDialog from "../../lib/components/ui/alert-dialog/index.js";
  import { Button } from "../../lib/components/ui/button/index.js";
  import * as Tooltip from "../../lib/components/ui/tooltip/index.js";
  import * as DropdownMenu from "../../lib/components/ui/dropdown-menu/index.js";
  import { Input } from "../../lib/components/ui/input/index.js";
  import * as Select from "../../lib/components/ui/select/index.js";
  import * as Tabs from "../../lib/components/ui/tabs/index.js";
  import { Info, Trash2, Edit, Tags, FileText, Layers, CalendarClock, Folder, Tag, X, Search, Filter, List, LayoutGrid, KanbanSquare, Waypoints } from "@lucide/svelte";
  import { toast } from "svelte-sonner";
  import { onMount } from "svelte";
  import SavedItemsCardView from "./card/SavedItemsCardView.svelte";

  let searchQuery = $state("");
  let selectedGroup = $state<string[]>([]);
  let selectedTags = $state<string[]>([]);
  let sortCriteria = $state<string[]>(["dateAdded"]);
  let sortDirection = $state<string[]>(["desc"]);

  let showRemoveTagDialog = $state(false);
  let tagToRemoveGlobally = $state("");
  let showEditTagDialog = $state(false);
  let tagToEditGlobally = $state("");
  let newTagNameGlobally = $state("");
  let showRemoveAllTagsDialog = $state(false);

  let filteredItems = $derived(filterItems($savedItems, searchQuery, selectedGroup.join(","), selectedTags));
  let sortedItems = $derived(sortItems(filteredItems, sortCriteria.join(","), sortDirection.join(",")));
  let availableTags = $derived(getAllTags($savedItems));

  function filterItems(items: SavedItem[] | undefined, query: string, groupId: string, tags: string[]) {
    if (!items) return [];
    return items.filter(item => {
      const lowerQuery = query.toLowerCase();
      const matchesQuery = !query ||
        item.title?.toLowerCase().includes(lowerQuery) ||
        item.url?.toLowerCase().includes(lowerQuery) ||
        (item.comments && item.comments.toLowerCase().includes(lowerQuery));
      let matchesGroup: boolean;
      if (groupId === "NO_GROUP") {
          matchesGroup = !item.groupIds || item.groupIds.length === 0;
      } else {
          matchesGroup = !groupId || (item.groupIds && item.groupIds.includes(groupId));
      }
      const matchesTags = tags.length === 0 ||
        (item.tags && Array.isArray(item.tags) &&
        tags.every(tag => item.tags.some(itemTag =>
          itemTag?.toLowerCase() === tag.toLowerCase()
         )));
      return matchesQuery && matchesGroup && matchesTags;
    });
  }

  function sortItems(items: SavedItem[], criteria: string, direction: string) {
    return [...items].sort((a, b) => {
      let comparison = 0;
      if (criteria === "dateAdded") {
        comparison = (a.dateAdded || 0) - (b.dateAdded || 0);
      } else if (criteria === "title") {
        comparison = (a.title || "").localeCompare(b.title || "");
      } else if (criteria === "url") {
         comparison = (a.url || "").localeCompare(b.url || "");
      } else if (criteria === "scheduledDate") {
         const dateA = a.readLater && a.scheduledDate ? a.scheduledDate : (direction === 'desc' ? -Infinity : Infinity);
         const dateB = b.readLater && b.scheduledDate ? b.scheduledDate : (direction === 'desc' ? -Infinity : Infinity);
         comparison = dateA - dateB;
      } else if (criteria === "noteCount") {
          comparison = (a.noteIds?.length || 0) - (b.noteIds?.length || 0);
      } else if (criteria === "flashcardCount") {
          comparison = (a.flashcardIds?.length || 0) - (b.flashcardIds?.length || 0);
      }
      return direction === "desc" ? -comparison : comparison;
    });
  }

  function getAllTags(items: SavedItem[] | undefined) {
    const tagsSet = new Set<string>();
    if (!items) return [];
    items.forEach(item => {
      if (item.tags && Array.isArray(item.tags)) {
        item.tags.forEach(tag => {
          if (typeof tag === 'string' && tag.trim()) {
            tagsSet.add(tag.trim());
          }
        });
      }
    });
    return Array.from(tagsSet).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  }

  function toggleTag(tag: string) {
    const lowerTag = tag.toLowerCase();
    const index = selectedTags.findIndex(t => t.toLowerCase() === lowerTag);
    if (index > -1) {
      selectedTags = selectedTags.filter((_, i) => i !== index);
    } else {
      const originalTag = availableTags.find(t => t.toLowerCase() === lowerTag) || tag;
      selectedTags = [...selectedTags, originalTag];
    }
  }

   function openRemoveTagDialog(tag: string) {
    tagToRemoveGlobally = tag;
    showRemoveTagDialog = true;
  }

  function confirmRemoveTag() {
    if (!tagToRemoveGlobally) return;
    const tagToRemoveLower = tagToRemoveGlobally.toLowerCase();
    let itemsUpdated = 0;
    savedItems.update(items => {
      const updatedItems = items.map(item => {
        if (item.tags && Array.isArray(item.tags)) {
          const originalLength = item.tags.length;
          const newTags = item.tags.filter(t => !(typeof t === 'string' && t.toLowerCase() === tagToRemoveLower));
          if (newTags.length < originalLength) {
            itemsUpdated++;
            return { ...item, tags: newTags };
          }
        }
        return item;
      });
      setTimeout(() => { (savedItems as any).forceSync?.(); }, 100);
      return updatedItems;
    });
    toast.success(`Tag "${tagToRemoveGlobally}" removida de ${itemsUpdated} ${itemsUpdated === 1 ? 'item' : 'itens'}.`);
    selectedTags = selectedTags.filter(t => t.toLowerCase() !== tagToRemoveLower);
    showRemoveTagDialog = false;
    tagToRemoveGlobally = "";
  }

  function openEditTagDialog(tag: string) {
    tagToEditGlobally = tag;
    newTagNameGlobally = tag;
    showEditTagDialog = true;
  }

  function confirmEditTag() {
    const oldTagLower = tagToEditGlobally.toLowerCase();
    const newTag = newTagNameGlobally.trim();
    if (!newTag || oldTagLower === newTag.toLowerCase()) {
      showEditTagDialog = false;
      tagToEditGlobally = "";
      newTagNameGlobally = "";
      return;
    }

    let itemsUpdated = 0;
    savedItems.update(items => {
      const updatedItems = items.map(item => {
        if (item.tags && Array.isArray(item.tags)) {
          let tagChanged = false;
          const newTags = item.tags.map(t => {
            if (typeof t === 'string' && t.toLowerCase() === oldTagLower) {
              tagChanged = true;
              return newTag;
            }
            return t;
          });
          if (tagChanged) {
            itemsUpdated++;
            return { ...item, tags: newTags };
          }
        }
        return item;
      });
      setTimeout(() => { (savedItems as any).forceSync?.(); }, 100);
      return updatedItems;
    });

    toast.success(`Tag "${tagToEditGlobally}" alterada para "${newTag}" em ${itemsUpdated} ${itemsUpdated === 1 ? 'item' : 'itens'}.`);

    const index = selectedTags.findIndex(t => t.toLowerCase() === oldTagLower);
    if (index > -1) {
      selectedTags = selectedTags.map((t, i) => (i === index ? newTag : t));
    }

    showEditTagDialog = false;
    tagToEditGlobally = "";
    newTagNameGlobally = "";
  }

  function removeAllTags() {
    showRemoveAllTagsDialog = true;
  }

  function confirmRemoveAllTags() {
    let itemsWithTags = 0;
    savedItems.update(items => {
      const updatedItems = items.map(item => {
        if (item.tags && Array.isArray(item.tags) && item.tags.length > 0) {
          itemsWithTags++;
          return { ...item, tags: [] };
        }
        return item;
      });
      setTimeout(() => { (savedItems as any).forceSync?.(); }, 100);
      return updatedItems;
    });
    toast.success(`Todas as tags foram removidas de ${itemsWithTags} ${itemsWithTags === 1 ? 'item' : 'itens'}.`);
    selectedTags = [];
    showRemoveAllTagsDialog = false;
  }

</script>

<!-- Aplicar flexbox column, altura total e remover padding/bg antigos -->
<div class="flex flex-col h-full p-4 md:p-6 space-y-0">
  <header class="mb-0 flex-shrink-0">
    <!-- Título removido -->
  </header>

  <!-- Tabs Root agora tem padding/margem controlados pelo flex container -->
  <Tabs.Root value="cards" class="w-full flex flex-col flex-grow overflow-hidden">
    <!-- Tab List não encolhe -->
    <Tabs.List class="grid w-full grid-cols-2 sm:grid-cols-4 mb-4 flex-shrink-0">
      <Tabs.Trigger value="table" class="flex items-center justify-center gap-1 text-xs sm:text-sm">
        <List class="h-4 w-4" /> Tabela
      </Tabs.Trigger>
      <Tabs.Trigger value="cards" class="flex items-center justify-center gap-1 text-xs sm:text-sm">
        <LayoutGrid class="h-4 w-4"/> Cartões
      </Tabs.Trigger>
      <Tabs.Trigger value="kanban" disabled class="flex items-center justify-center gap-1 text-xs sm:text-sm">
        <KanbanSquare class="h-4 w-4"/> Kanban
      </Tabs.Trigger>
      <Tabs.Trigger value="flow" disabled class="flex items-center justify-center gap-1 text-xs sm:text-sm">
        <Waypoints class="h-4 w-4"/> Fluxo
      </Tabs.Trigger>
    </Tabs.List>

    <Tabs.Content value="table" class="flex-grow overflow-y-auto p-1">
      <div class="text-center py-10 text-gray-500 dark:text-gray-400 border rounded-lg dark:border-gray-700">
        <p class="font-medium">Visualização em Tabela</p>
        <p class="text-sm">(Em desenvolvimento)</p>
      </div>
    </Tabs.Content>
    <!-- Tab Content para Cards: flex column, cresce e permite overflow interno -->
    <Tabs.Content value="cards" class="flex flex-col flex-grow overflow-hidden">
      <!-- Barra de pesquisa/filtros não encolhe -->
      <div class="flex flex-col md:flex-row gap-2 pb-4 flex-shrink-0 px-1">
        <div class="relative flex-grow">
          <Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input type="search" placeholder="Pesquisar itens..." class="pl-8 w-full" bind:value={searchQuery} />
        </div>
        <Select.Root type="multiple" bind:value={selectedGroup} onValueChange={(v: string[] | null) => { if (v !== null) selectedGroup = v; }}>
          <Select.Trigger class="w-full md:w-[180px]">
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="">Todos os Grupos</Select.Item>
            <Select.Item value="NO_GROUP">Sem Grupo</Select.Item>
            {#each $groups as group (group.id)}
              <Select.Item value={group.id}>{group.name}</Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            <Button variant="outline" class="w-full md:w-auto" disabled={availableTags.length === 0}>
              <Filter class="mr-2 h-4 w-4" />
              Filtrar Tags ({selectedTags.length})
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content class="w-60 max-h-80 overflow-y-auto">
            <DropdownMenu.Label>Filtrar por Tags</DropdownMenu.Label>
            <DropdownMenu.Separator />
            {#if availableTags.length > 0}
              {#each availableTags as tag}
                <DropdownMenu.CheckboxItem
                  checked={selectedTags.some(st => st.toLowerCase() === tag.toLowerCase())}
                  onCheckedChange={() => toggleTag(tag)}
                >
                  {tag}
                </DropdownMenu.CheckboxItem>
              {/each}
            {:else}
              <DropdownMenu.Item disabled>Nenhuma tag disponível</DropdownMenu.Item>
            {/if}
            {#if selectedTags.length > 0}
              <DropdownMenu.Separator />
              <DropdownMenu.Item onclick={() => selectedTags = []}>
                Limpar Seleção
              </DropdownMenu.Item>
            {/if}
          </DropdownMenu.Content>
        </DropdownMenu.Root>
        <Select.Root type="multiple" bind:value={sortCriteria} onValueChange={(v: string[] | null) => { if (v !== null) sortCriteria = v; }}>
          <Select.Trigger class="w-full md:w-[180px]">
            {sortCriteria[0] === 'dateAdded' ? 'Data Adição' : 
             sortCriteria[0] === 'title' ? 'Título' :
             sortCriteria[0] === 'url' ? 'URL' :
             sortCriteria[0] === 'scheduledDate' ? 'Data Agendada' :
             sortCriteria[0] === 'noteCount' ? 'Notas' :
             sortCriteria[0] === 'flashcardCount' ? 'Flashcards' : 'Ordenar por'}
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="dateAdded">Data Adição</Select.Item>
            <Select.Item value="title">Título</Select.Item>
            <Select.Item value="url">URL</Select.Item>
            <Select.Item value="scheduledDate">Data Agendada</Select.Item>
            <Select.Item value="noteCount">Nº Notas</Select.Item>
            <Select.Item value="flashcardCount">Nº Flashcards</Select.Item>
          </Select.Content>
        </Select.Root>
        <Select.Root type="multiple" bind:value={sortDirection} onValueChange={(v: string[] | null) => { if (v !== null) sortDirection = v; }}>
          <Select.Trigger class="w-full md:w-[120px]">
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="asc">Ascendente</Select.Item>
            <Select.Item value="desc">Descendente</Select.Item>
          </Select.Content>
        </Select.Root>
      </div>
      <!-- Área de Cards: cresce e tem rolagem interna -->
      <div class="flex-grow overflow-y-auto pr-1">
          <SavedItemsCardView data={sortedItems} groups={$groups} />
      </div>
    </Tabs.Content>
    <Tabs.Content value="kanban" class="flex-grow overflow-y-auto p-1">
       <div class="text-center py-10 text-gray-500 dark:text-gray-400 border rounded-lg dark:border-gray-700">
         <p class="font-medium">Visualização Kanban</p>
         <p class="text-sm">(Em desenvolvimento)</p>
       </div>
    </Tabs.Content>
    <Tabs.Content value="flow" class="flex-grow overflow-y-auto p-1">
       <div class="text-center py-10 text-gray-500 dark:text-gray-400 border rounded-lg dark:border-gray-700">
         <p class="font-medium">Visualização em Fluxo</p>
         <p class="text-sm">(Em desenvolvimento)</p>
       </div>
    </Tabs.Content>
  </Tabs.Root>


  <AlertDialog.Root bind:open={showRemoveTagDialog}>
    <AlertDialog.Content>
      <AlertDialog.Header>
        <AlertDialog.Title>Remover Tag Globalmente?</AlertDialog.Title>
        <AlertDialog.Description>
          Tem certeza que deseja remover a tag "{tagToRemoveGlobally}" de TODOS os itens salvos? Esta ação não pode ser desfeita.
        </AlertDialog.Description>
      </AlertDialog.Header>
      <AlertDialog.Footer>
        <AlertDialog.Cancel onclick={() => { tagToRemoveGlobally = ""; showRemoveTagDialog = false; }}>Cancelar</AlertDialog.Cancel>
        <AlertDialog.Action onclick={confirmRemoveTag}>Remover</AlertDialog.Action>
      </AlertDialog.Footer>
    </AlertDialog.Content>
  </AlertDialog.Root>

  <AlertDialog.Root bind:open={showEditTagDialog}>
    <AlertDialog.Content>
      <AlertDialog.Header>
        <AlertDialog.Title>Renomear Tag Globalmente</AlertDialog.Title>
        <AlertDialog.Description>
          Digite o novo nome para a tag "{tagToEditGlobally}". Isso afetará TODOS os itens que usam esta tag.
        </AlertDialog.Description>
      </AlertDialog.Header>
      <Input
        type="text"
        placeholder="Novo nome da tag"
        bind:value={newTagNameGlobally}
        class="mt-4"
        onkeydown={(e) => e.key === 'Enter' && confirmEditTag()}
      />
      <AlertDialog.Footer class="mt-4">
        <AlertDialog.Cancel onclick={() => { tagToEditGlobally = ""; newTagNameGlobally = ""; showEditTagDialog = false; }}>Cancelar</AlertDialog.Cancel>
        <AlertDialog.Action onclick={confirmEditTag} disabled={!newTagNameGlobally.trim() || newTagNameGlobally.trim().toLowerCase() === tagToEditGlobally.toLowerCase()}>Renomear</AlertDialog.Action>
      </AlertDialog.Footer>
    </AlertDialog.Content>
  </AlertDialog.Root>

  <AlertDialog.Root bind:open={showRemoveAllTagsDialog}>
    <AlertDialog.Content>
      <AlertDialog.Header>
        <AlertDialog.Title>Remover todas as tags?</AlertDialog.Title>
        <AlertDialog.Description>
          Tem certeza que deseja remover TODAS as tags de TODOS os itens salvos? Esta ação não pode ser desfeita.
        </AlertDialog.Description>
      </AlertDialog.Header>
      <AlertDialog.Footer>
        <AlertDialog.Cancel onclick={() => showRemoveAllTagsDialog = false}>Cancelar</AlertDialog.Cancel>
        <AlertDialog.Action class="bg-destructive text-destructive-foreground hover:bg-destructive/90" onclick={confirmRemoveAllTags}>Remover Tudo</AlertDialog.Action>
      </AlertDialog.Footer>
    </AlertDialog.Content>
  </AlertDialog.Root>

  <!-- Botões inferiores: não encolhem e têm margem superior -->
  <div class="mt-4 flex justify-end items-center gap-2 flex-shrink-0">
    <!-- Botão Gerenciar Grupos -->
    <Button
      variant="outline"
      onclick={() => toast.info('Gerenciamento de Grupos ainda não implementado.')}
      disabled={$groups.length === 0}
    >
      <Folder class="mr-2 h-4 w-4" />
      Gerenciar Grupos ({$groups.length})
    </Button>

    <!-- Restaurado DropdownMenu "Gerenciar Tags" -->
    <DropdownMenu.Root>
     <DropdownMenu.Trigger>
       <Button variant="outline" disabled={availableTags.length === 0}>
         <Tags class="mr-2 h-4 w-4" />
          Gerenciar Tags ({availableTags.length})
       </Button>
     </DropdownMenu.Trigger>
     <DropdownMenu.Content align="end" class="w-64 max-h-80 overflow-y-auto">
       <DropdownMenu.Label>Gerenciamento Global de Tags</DropdownMenu.Label>
       <DropdownMenu.Separator />
       {#if availableTags.length > 0}
          <DropdownMenu.Label class="text-xs font-normal text-muted-foreground px-2">Clique para Renomear ou Remover</DropdownMenu.Label>
          {#each availableTags as tag}
            <DropdownMenu.Sub>
              <DropdownMenu.SubTrigger>{tag}</DropdownMenu.SubTrigger>
              <DropdownMenu.SubContent>
                  <DropdownMenu.Item onclick={() => openEditTagDialog(tag)}>
                    <Edit class="mr-2 h-3.5 w-3.5"/> Renomear "{tag}"...
                  </DropdownMenu.Item>
                  <DropdownMenu.Separator/>
                  <DropdownMenu.Item class="text-red-600 dark:text-red-500 focus:text-red-700 dark:focus:text-red-500" onclick={() => openRemoveTagDialog(tag)}>
                    <Trash2 class="mr-2 h-3.5 w-3.5"/> Remover "{tag}" de tudo...
                  </DropdownMenu.Item>
              </DropdownMenu.SubContent>
            </DropdownMenu.Sub>
          {/each}
          <DropdownMenu.Separator />
          <DropdownMenu.Item
            class="text-red-600 dark:text-red-500 focus:text-red-700 dark:focus:text-red-500"
            onclick={removeAllTags}
          >
            <Trash2 class="mr-2 h-3.5 w-3.5"/> Remover TODAS as Tags...
          </DropdownMenu.Item>
       {:else}
         <DropdownMenu.Item disabled>Nenhuma tag para gerenciar</DropdownMenu.Item>
       {/if}
     </DropdownMenu.Content>
   </DropdownMenu.Root>
 </div>
</div>  
  
