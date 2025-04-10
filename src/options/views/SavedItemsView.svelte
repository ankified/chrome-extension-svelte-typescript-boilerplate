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
  import * as Sheet from "../../lib/components/ui/sheet/index.js";
  import { Separator } from "../../lib/components/ui/separator/index.js";
  import { Badge } from "../../lib/components/ui/badge/index.js";
  import * as Command from "../../lib/components/ui/command/index.js";
  import { Checkbox } from "../../lib/components/ui/checkbox/index.js";
  import * as Popover from "../../lib/components/ui/popover/index.js";
  import { RangeCalendar } from "../../lib/components/ui/range-calendar/index.js";
  import { cn } from "../../lib/utils";
  import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
  import { ptBR } from "date-fns/locale";
  import type { DateRange } from "bits-ui";
  import { CalendarDays } from "@lucide/svelte";
  import { CalendarIcon } from "@lucide/svelte";
  import { getLocalTimeZone, today, type DateValue } from "@internationalized/date";
  import * as ToggleGroup from "../../lib/components/ui/toggle-group/index.js";
  import { TextSearch } from "@lucide/svelte";

  let searchQuery = $state("");
  let selectedGroup = $state<string[]>([]);
  let selectedTags = $state<string[]>([]);
  let sortCriteria = $state<string[]>(["dateAdded"]);
  let sortDirection = $state<string[]>(["desc"]);

  let currentSortCriterion = $state<string>('dateAdded');
  let currentSortDirection = $state<string>('desc');

  let showRemoveTagDialog = $state(false);
  let tagToRemoveGlobally = $state("");
  let showEditTagDialog = $state(false);
  let tagToEditGlobally = $state("");
  let newTagNameGlobally = $state("");
  let showRemoveAllTagsDialog = $state(false);

  let selectedDateRange = $state<DateRange | undefined>(undefined);

  let searchScope = $state<'content' | 'tags' | 'groups'>('content');

  let filteredItems = $derived(filterItems($savedItems, searchQuery, selectedGroup, selectedTags, selectedDateRange, searchScope));
  let sortedItems = $derived(sortItems(filteredItems, currentSortCriterion, currentSortDirection));
  let availableTags = $derived(getAllTags($savedItems));

  // Estado para controlar o Command.Dialog de Grupos
  let showGroupCommandDialog = $state(false);

  // Estado para controlar o Command.Dialog de Tags
  let showTagCommandDialog = $state(false);

  function filterItems(
    items: SavedItem[] | undefined,
    query: string,
    selectedGroupIds: string[],
    tags: string[],
    dateRange: DateRange | undefined,
    scope: 'content' | 'tags' | 'groups'
  ) {
    if (!items) return [];
    const lowerQuery = query.toLowerCase();
    const rangeStart = dateRange?.start ? startOfDay(dateRange.start.toDate(getLocalTimeZone())) : null;
    const rangeEnd = dateRange?.end ? endOfDay(dateRange.end.toDate(getLocalTimeZone())) : null;

    return items.filter(item => {
      let matchesQuery = true;
      if (query) {
        if (scope === 'content') {
          matchesQuery =
            item.title?.toLowerCase().includes(lowerQuery) ||
            item.url?.toLowerCase().includes(lowerQuery) ||
            (item.comments && item.comments.toLowerCase().includes(lowerQuery));
        } else if (scope === 'tags') {
          matchesQuery = !!item.tags && item.tags.some(tag => typeof tag === 'string' && tag.toLowerCase().includes(lowerQuery));
        } else if (scope === 'groups') {
          matchesQuery = !!item.groupIds && item.groupIds.some(gId => {
            const groupName = $groups?.find(g => g.id === gId)?.name;
            return !!groupName && groupName.toLowerCase().includes(lowerQuery);
          });
        }
      }

      let matchesGroup = true;
      if (selectedGroupIds.length > 0) {
        if (selectedGroupIds.includes('NO_GROUP')) {
          matchesGroup = !item.groupIds || item.groupIds.length === 0;
        } else {
          matchesGroup = !!item.groupIds && item.groupIds.some(gId => selectedGroupIds.includes(gId));
        }
      }

      const matchesTagsFilter = tags.length === 0 ||
        (item.tags && Array.isArray(item.tags) &&
        tags.every(tag => item.tags.some(itemTag =>
          itemTag?.toLowerCase() === tag.toLowerCase()
         )));

      let matchesDate = true;
      if (rangeStart && item.dateAdded) {
        try {
          const itemDate = new Date(item.dateAdded);
          if (rangeEnd) {
            matchesDate = isWithinInterval(itemDate, { start: rangeStart, end: rangeEnd });
          } else {
            matchesDate = itemDate >= rangeStart;
          }
        } catch (e) {
          console.error("Erro ao processar data do item:", item.dateAdded, e);
          matchesDate = false;
        }
      } else {
        matchesDate = !rangeStart;
      }

      return matchesQuery && matchesGroup && matchesTagsFilter && matchesDate;
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

  function toggleGroup(groupId: string) {
    if (groupId === 'NO_GROUP') {
      if (selectedGroup.includes('NO_GROUP')) {
        selectedGroup = [];
      } else {
        selectedGroup = ['NO_GROUP'];
      }
    } else {
      const index = selectedGroup.indexOf(groupId);
      if (index > -1) {
        selectedGroup = selectedGroup.filter(id => id !== groupId);
      } else {
        selectedGroup = [...selectedGroup.filter(id => id !== 'NO_GROUP'), groupId];
      }
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

  function clearFiltersAndSort() {
    searchQuery = "";
    selectedGroup = [];
    selectedTags = [];
    selectedDateRange = undefined;
    currentSortCriterion = "dateAdded";
    currentSortDirection = "desc";
    sortCriteria = ["dateAdded"];
    sortDirection = ["desc"];
    toast.info("Filtros e ordenação redefinidos.");
  }

  // Helper para blur seguro
  function safeBlur(element: Element | null) {
    if (element instanceof HTMLElement) {
      element.blur();
    }
  }

  // Helper para converter DateValue | undefined para Date | null
  function toDateOrNull(dateValue: DateValue | undefined): Date | null {
    return dateValue ? dateValue.toDate(getLocalTimeZone()) : null;
  }

</script>

<div class="flex flex-col h-full p-4 md:p-6 space-y-0">
  <header class="mb-0 flex-shrink-0">
    <!-- Título removido -->
  </header>

  <Tabs.Root value="cards" class="w-full flex flex-col flex-grow overflow-hidden">
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

    <Tabs.Content value="cards" class="flex flex-col flex-grow overflow-hidden">
      <div class="flex flex-col md:flex-row gap-2 pb-4 flex-shrink-0 px-1 items-center">
        <div class="relative flex-grow w-full md:w-auto">
          <Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input type="search" placeholder="Pesquisar..." class="pl-8 w-full" bind:value={searchQuery} />
        </div>

        <ToggleGroup.Root type="single" variant="outline" size="sm" bind:value={searchScope} class="w-full md:w-auto justify-center md:justify-start">
          <Tooltip.Provider delayDuration={300}>
            <Tooltip.Root>
              <Tooltip.Trigger>
                <ToggleGroup.Item value="content" aria-label="Buscar em Conteúdo">
                <TextSearch class="h-4 w-4" />
              </ToggleGroup.Item>
            </Tooltip.Trigger>
            <Tooltip.Content>
              <p>Buscar em Título, URL e Comentários</p>
            </Tooltip.Content>
          </Tooltip.Root>
          </Tooltip.Provider>
          <Tooltip.Provider delayDuration={300}>
          <Tooltip.Root>
            <Tooltip.Trigger>
              <ToggleGroup.Item value="tags" aria-label="Buscar em Tags">
                <Tags class="h-4 w-4" />
              </ToggleGroup.Item>
             </Tooltip.Trigger>
            <Tooltip.Content>
              <p>Buscar em Tags</p>
            </Tooltip.Content>
          </Tooltip.Root>
          </Tooltip.Provider>
          <Tooltip.Provider delayDuration={300}>
          <Tooltip.Root>
            <Tooltip.Trigger>
              <ToggleGroup.Item value="groups" aria-label="Buscar em Grupos">
                <Folder class="h-4 w-4" />
              </ToggleGroup.Item>
            </Tooltip.Trigger>
            <Tooltip.Content>
              <p>Buscar em Nomes de Grupos</p>
            </Tooltip.Content>
          </Tooltip.Root>
          </Tooltip.Provider>
        </ToggleGroup.Root>

        <Sheet.Root>
          <Sheet.Trigger>
            <Button variant="outline" size="icon" class="md:ml-2 w-full md:w-auto flex-shrink-0">
              <Filter class="h-4 w-4" />
              <span class="sr-only">Abrir Filtros e Ordenação</span>
            </Button>
          </Sheet.Trigger>
          <Sheet.Content side="right" class="w-[300px] sm:w-[400px] flex flex-col">
            <Sheet.Header>
              <Sheet.Title>Filtros e Ordenação</Sheet.Title>
              <Sheet.Description>
                Refine sua visualização de itens salvos.
              </Sheet.Description>
            </Sheet.Header>

            <div class="py-4 space-y-4 flex-grow overflow-y-auto">
              <Separator />
              <h4 class="text-sm font-medium leading-none mb-2">Filtros</h4>

              <!-- Botão para abrir o Command.Dialog de Tags -->
              <Button variant="outline" class="w-full justify-between" onclick={() => showTagCommandDialog = true} disabled={availableTags.length === 0}>
                 <span>
                   {#if selectedTags.length === 0}
                     Todas as Tags
                   {:else}
                     Tags ({selectedTags.length})
                   {/if}
                 </span>
                 <Tags class="ml-2 h-4 w-4 opacity-50" />
              </Button>
              <!-- Fim do Botão Trigger de Tags -->

              <Button variant="outline" class="w-full justify-between mt-2" onclick={() => showGroupCommandDialog = true}>
                 <span>
                   {#if selectedGroup.length === 0}
                     Todos os Grupos
                   {:else if selectedGroup.includes('NO_GROUP')}
                     Sem Grupo
                   {:else}
                     Grupos ({selectedGroup.length})
                   {/if}
                 </span>
                 <Folder class="ml-2 h-4 w-4 opacity-50" />
              </Button>

              <!-- Adicionar DateRangePicker -->
              <div class="mt-2">
                <Popover.Root>
                  <Popover.Trigger>
                    <Button
                      variant="outline"
                      class={cn(
                        "w-full justify-start text-left font-normal",
                        !selectedDateRange && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon class="mr-2 h-4 w-4" />
                      <!-- Correção: Converter para Date antes de formatar -->
                      {@const startDate = toDateOrNull(selectedDateRange?.start)}
                      {@const endDate = toDateOrNull(selectedDateRange?.end)}
                      {#if startDate}
                        {#if endDate}
                          {format(startDate, "LLL dd, y", { locale: ptBR })} - {format(endDate, "LLL dd, y", { locale: ptBR })}
                        {:else}
                          {format(startDate, "LLL dd, y", { locale: ptBR })}
                        {/if}
                      {:else}
                        <span>Selecione um período</span>
                      {/if}
                    </Button>
                  </Popover.Trigger>
                  <Popover.Content class="w-auto p-0" align="start">
                     <!-- Correção: Usar locale="pt-BR" -->
                    <RangeCalendar bind:value={selectedDateRange} locale="pt-BR" numberOfMonths={2} />
                  </Popover.Content>
                </Popover.Root>
              </div>
              <!-- Fim do DateRangePicker -->

              <Separator />
              <h4 class="text-sm font-medium leading-none mb-2">Ordenação</h4>
              <div class="grid grid-cols-2 gap-2">
                <Select.Root type="single" bind:value={currentSortCriterion} onValueChange={(v: string | null) => { if (v) { currentSortCriterion = v; sortCriteria = [v]; } }}>
                  <Select.Trigger class="w-full">
                      {currentSortCriterion === 'dateAdded' ? 'Data Adição' :
                       currentSortCriterion === 'title' ? 'Título' :
                       currentSortCriterion === 'url' ? 'URL' :
                       currentSortCriterion === 'scheduledDate' ? 'Data Agendada' :
                       currentSortCriterion === 'noteCount' ? 'Nº Notas' :
                       currentSortCriterion === 'flashcardCount' ? 'Nº Flashcards' : 'Ordenar por'}
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
                <Select.Root type="single" bind:value={currentSortDirection} onValueChange={(v: string | null) => { if (v) { currentSortDirection = v; sortDirection = [v]; } }}>
                  <Select.Trigger class="w-full">
                      {currentSortDirection === 'asc' ? 'Ascendente' : 'Descendente'}
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value="asc">Ascendente</Select.Item>
                    <Select.Item value="desc">Descendente</Select.Item>
                  </Select.Content>
                </Select.Root>
              </div>
            </div>

            <Sheet.Footer class="mt-auto flex flex-col sm:flex-row sm:justify-between gap-2 pt-4 border-t">
               <Button variant="outline" class="w-full sm:w-auto" onclick={clearFiltersAndSort}>Limpar Filtros</Button>
              <Sheet.Close>
                <Button variant="outline" class="w-full sm:w-auto">Fechar</Button>
              </Sheet.Close>
            </Sheet.Footer>
          </Sheet.Content>
        </Sheet.Root>
      </div>

      <!-- Início: Container para Badges de Filtros Ativos (Refatorado) -->
      {#if searchQuery || selectedGroup.length > 0 || selectedTags.length > 0 || selectedDateRange?.start}
        <div class="flex flex-wrap gap-1 mb-2 px-1 items-center">
          {#if searchQuery}
            <Badge variant="secondary" class="inline-flex items-center gap-1">
              Busca: "{searchQuery}"
              <Button
                variant="ghost"
                size="sm"
                class="p-0 h-auto w-auto rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 ml-1"
                onclick={() => searchQuery = ""}
                aria-label="Remover filtro de busca"
              >
                <X class="h-3 w-3" />
              </Button>
            </Badge>
          {/if}

          <!-- Refatorado: Badges individuais para Grupos -->
          {#if selectedGroup.includes('NO_GROUP')}
             <Badge variant="secondary" class="inline-flex items-center gap-1">
               Grupo: Sem Grupo
               <Button
                 variant="ghost"
                 size="sm"
                 class="p-0 h-auto w-auto rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 ml-1"
                 onclick={() => toggleGroup('NO_GROUP')}
                 aria-label="Remover filtro Sem Grupo"
               >
                 <X class="h-3 w-3" />
               </Button>
             </Badge>
          {/if}
          {#each selectedGroup.filter(gId => gId !== 'NO_GROUP') as groupId (groupId)}
            {@const groupName = $groups?.find(g => g.id === groupId)?.name || '?'}
             <Badge variant="secondary" class="inline-flex items-center gap-1">
               Grupo: {groupName}
               <Button
                 variant="ghost"
                 size="sm"
                 class="p-0 h-auto w-auto rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 ml-1"
                 onclick={() => toggleGroup(groupId)}
                 aria-label={`Remover filtro do grupo ${groupName}`}
               >
                 <X class="h-3 w-3" />
               </Button>
             </Badge>
          {/each}
          <!-- Fim Refatorado Grupos -->

          <!-- Refatorado: Badges individuais para Tags -->
          {#each selectedTags as tag (tag)}
            <Badge variant="secondary" class="inline-flex items-center gap-1">
              Tag: {tag}
              <Button
                variant="ghost"
                size="sm"
                class="p-0 h-auto w-auto rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 ml-1"
                onclick={() => toggleTag(tag)}
                aria-label={`Remover filtro da tag ${tag}`}
              >
                <X class="h-3 w-3" />
              </Button>
            </Badge>
          {/each}
           <!-- Fim Refatorado Tags -->

          {#if selectedDateRange?.start}
             {@const startDate = toDateOrNull(selectedDateRange?.start)}
             {@const endDate = toDateOrNull(selectedDateRange?.end)}
             {#if startDate}
               <Badge variant="secondary" class="inline-flex items-center gap-1">
                 Data: {
                   format(startDate, "dd/MM/yy", { locale: ptBR }) + 
                   (endDate ? ` - ${format(endDate, "dd/MM/yy", { locale: ptBR })}` : ' em diante')
                 }
                 <Button
                   variant="ghost"
                   size="sm"
                   class="p-0 h-auto w-auto rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 ml-1"
                   onclick={() => selectedDateRange = undefined}
                   aria-label="Remover filtro de data"
                 >
                   <X class="h-3 w-3" />
                 </Button>
               </Badge>
             {/if}
           {/if}
        </div>
      {/if}
      <!-- Fim: Container para Badges de Filtros Ativos -->

      <div class="flex-grow overflow-y-auto border rounded-lg dark:border-gray-700">
        {#if sortedItems.length > 0}
          <SavedItemsCardView data={sortedItems} groups={$groups} />
        {:else}
          <div class="text-center py-10 text-gray-500 dark:text-gray-400 border rounded-lg dark:border-gray-700">
            <p class="font-medium">Nenhum item encontrado</p>
            <p class="text-sm">(Verifique os filtros aplicados)</p>
          </div>
        {/if}
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

  <!-- **** DIÁLOGOS **** -->

  <!-- Command.Dialog para Grupos -->
  <Command.Dialog bind:open={showGroupCommandDialog}>
     <Command.Input placeholder="Buscar grupo..." />
     <Command.List class="max-h-[300px] overflow-y-auto overflow-x-hidden">
       <Command.Empty>Nenhum grupo encontrado.</Command.Empty>
       <Command.Group>
          <Command.Item value="__ALL__" onSelect={() => {selectedGroup = []; safeBlur(document.activeElement); showGroupCommandDialog = false;}} class="cursor-pointer">
           Todos os Grupos
          </Command.Item>
          <Command.Item value="NO_GROUP" onSelect={((e: CustomEvent) => { e.preventDefault(); toggleGroup('NO_GROUP'); }) as () => void} class="cursor-pointer">
            <Checkbox
              class="mr-2"
              checked={selectedGroup.includes('NO_GROUP')}
              aria-labelledby={`group-label-NO_GROUP-dialog`}
              onCheckedChange={() => toggleGroup('NO_GROUP')}
              id={`group-check-NO_GROUP-dialog`}
            />
            <label for={`group-check-NO_GROUP-dialog`} id={`group-label-NO_GROUP-dialog`} class="cursor-pointer flex-grow">Sem Grupo</label>
          </Command.Item>
       </Command.Group>
       <Command.Separator />
        {#if $groups && $groups.length > 0}
         <Command.Group heading="Grupos Criados">
           {#each $groups as group (group.id)}
             <Command.Item
               value={group.name}
               onSelect={((e: CustomEvent) => { e.preventDefault(); toggleGroup(group.id); }) as () => void}
               class="cursor-pointer flex items-center w-full"
             >
               <Checkbox
                 class="mr-2 flex-shrink-0"
                 checked={selectedGroup.includes(group.id)}
                 aria-labelledby={`group-label-${group.id}-dialog`}
                 onCheckedChange={() => toggleGroup(group.id)}
                 id={`group-check-${group.id}-dialog`}
               />
               <label for={`group-check-${group.id}-dialog`} class="flex items-center flex-grow truncate cursor-pointer" id={`group-label-${group.id}-dialog`}>
                  {#if group.color}
                    <span class="w-2 h-2 rounded-full mr-2 flex-shrink-0" style="background-color: {group.color}"></span>
                  {:else}
                    <span class="w-2 h-2 mr-2 flex-shrink-0"></span>
                  {/if}
                  <span class="truncate flex-grow">{group.name}</span>
               </label>
             </Command.Item>
           {/each}
         </Command.Group>
         {:else}
          <Command.Group>
            <Command.Item disabled={true}>Nenhum grupo criado.</Command.Item>
          </Command.Group>
        {/if}
     </Command.List>
   </Command.Dialog>

  <!-- Command.Dialog para Tags -->
  <Command.Dialog bind:open={showTagCommandDialog}>
     <Command.Input placeholder="Buscar tag..." />
     <Command.List class="max-h-[300px] overflow-y-auto overflow-x-hidden">
       <Command.Empty>Nenhuma tag encontrada.</Command.Empty>
       <Command.Group>
          <Command.Item value="__ALL__" onSelect={() => {selectedTags = []; safeBlur(document.activeElement); showTagCommandDialog = false;}} class="cursor-pointer">
           Todas as Tags
          </Command.Item>
       </Command.Group>
       <Command.Separator />
        {#if availableTags.length > 0}
         <Command.Group heading="Tags Disponíveis">
           {#each availableTags as tag}
             <Command.Item
               value={tag}
               onSelect={((e: CustomEvent) => { e.preventDefault(); toggleTag(tag); }) as () => void}
               class="cursor-pointer flex items-center w-full"
             >
               <Checkbox
                 class="mr-2 flex-shrink-0"
                 checked={selectedTags.some(st => st.toLowerCase() === tag.toLowerCase())}
                 aria-labelledby={`tag-label-${tag}-dialog`}
                 onCheckedChange={() => toggleTag(tag)}
                 id={`tag-check-${tag}-dialog`}
               />
               <label for={`tag-check-${tag}-dialog`} class="flex-grow truncate cursor-pointer" id={`tag-label-${tag}-dialog`}>
                 {tag}
               </label>
             </Command.Item>
           {/each}
         </Command.Group>
         {:else}
          <Command.Group>
            <Command.Item disabled={true}>Nenhuma tag disponível.</Command.Item>
          </Command.Group>
        {/if}
     </Command.List>
   </Command.Dialog>

  <AlertDialog.Root bind:open={showRemoveTagDialog}>
    <AlertDialog.Content>
      <AlertDialog.Header>
        <AlertDialog.Title>Confirmar Remoção Global da Tag</AlertDialog.Title>
        <AlertDialog.Description>
          Tem certeza que deseja remover a tag "{tagToRemoveGlobally}" de <strong>todos</strong> os itens salvos? Esta ação não pode ser desfeita.
        </AlertDialog.Description>
      </AlertDialog.Header>
      <AlertDialog.Footer>
        <AlertDialog.Cancel onclick={() => { showRemoveTagDialog = false; tagToRemoveGlobally = ""; }}>Cancelar</AlertDialog.Cancel>
        <AlertDialog.Action onclick={confirmRemoveTag}>Remover Tag</AlertDialog.Action>
      </AlertDialog.Footer>
    </AlertDialog.Content>
  </AlertDialog.Root>

  <AlertDialog.Root bind:open={showEditTagDialog}>
    <AlertDialog.Content>
      <AlertDialog.Header>
        <AlertDialog.Title>Editar Tag Globalmente</AlertDialog.Title>
        <AlertDialog.Description>
          Renomeie a tag "{tagToEditGlobally}" em todos os itens onde ela aparece.
        </AlertDialog.Description>
      </AlertDialog.Header>
      <div class="py-4">
        <Input type="text" bind:value={newTagNameGlobally} placeholder="Novo nome da tag" />
      </div>
      <AlertDialog.Footer>
        <AlertDialog.Cancel onclick={() => { showEditTagDialog = false; tagToEditGlobally = ""; newTagNameGlobally = ""; }}>Cancelar</AlertDialog.Cancel>
        <AlertDialog.Action onclick={confirmEditTag} disabled={!newTagNameGlobally.trim() || newTagNameGlobally.trim().toLowerCase() === tagToEditGlobally.toLowerCase()}>Salvar Alterações</AlertDialog.Action>
      </AlertDialog.Footer>
    </AlertDialog.Content>
  </AlertDialog.Root>

  <AlertDialog.Root bind:open={showRemoveAllTagsDialog}>
    <AlertDialog.Content>
      <AlertDialog.Header>
        <AlertDialog.Title>Confirmar Remoção de Todas as Tags</AlertDialog.Title>
        <AlertDialog.Description>
          Tem certeza que deseja remover <strong>todas</strong> as tags de <strong>todos</strong> os itens salvos? Esta ação não pode ser desfeita.
        </AlertDialog.Description>
      </AlertDialog.Header>
      <AlertDialog.Footer>
        <AlertDialog.Cancel onclick={() => showRemoveAllTagsDialog = false}>Cancelar</AlertDialog.Cancel>
        <AlertDialog.Action onclick={confirmRemoveAllTags}>Remover Todas as Tags</AlertDialog.Action>
      </AlertDialog.Footer>
    </AlertDialog.Content>
  </AlertDialog.Root>

  <div class="mt-4 flex justify-end items-center gap-2 flex-shrink-0">
    <Button
      variant="outline"
      onclick={() => toast.info('Gerenciamento de Grupos ainda não implementado.')}
      disabled={$groups.length === 0}
    >
      <Folder class="mr-2 h-4 w-4" />
      Gerenciar Grupos ({$groups.length})
    </Button>

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
  
