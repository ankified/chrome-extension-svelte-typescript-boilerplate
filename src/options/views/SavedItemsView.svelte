<script lang="ts">
  // Importações Essenciais
  import { savedItems, groups } from "../../storage"; // remover notes, flashcards se não usados aqui
  import type { SavedItem, Group } from "../../types";
  import { onMount } from "svelte";
  import { toast } from "svelte-sonner";
  import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
  import { ptBR } from "date-fns/locale";
  import { getLocalTimeZone, type DateValue } from "@internationalized/date";
  import type { DateRange } from 'bits-ui';
  import { Input } from "../../lib/components/ui/input/index.js";
  // import { cn } from "../../lib/utils"; // Remover se não usado em outro lugar

  // Importações de UI Shadcn/Lucide
  import * as AlertDialog from "../../lib/components/ui/alert-dialog/index.js";
  import { Button } from "../../lib/components/ui/button/index.js";
  // import * as Tooltip from "../../lib/components/ui/tooltip/index.js"; // Remover
  import * as DropdownMenu from "../../lib/components/ui/dropdown-menu/index.js"; // Manter (Gerenciamento Global no AlertDialog)
  // import { Input } from "../../lib/components/ui/input/index.js"; // Remover
  import * as Select from "../../lib/components/ui/select/index.js"; // Manter (Sheet)
  import * as Tabs from "../../lib/components/ui/tabs/index.js";
  // import * as Sheet from "../../lib/components/ui/sheet/index.js"; // FilterSheet é importado separadamente
  import { Separator } from "../../lib/components/ui/separator/index.js"; // Manter (Sheet, AlertDialog)
  // import { Badge } from "../../lib/components/ui/badge/index.js"; // Remover
  import * as Popover from "../../lib/components/ui/popover/index.js"; // Manter (Sheet)
  import { RangeCalendar } from "../../lib/components/ui/range-calendar/index.js"; // Manter (Sheet)
  // import * as ToggleGroup from "../../lib/components/ui/toggle-group/index.js"; // Remover
  import {
      Info, Trash2, Edit, Tags, FileText, Layers, CalendarClock, Folder, Tag, // Remover X, Search, Filter, TextSearch
      List, LayoutGrid, KanbanSquare, Waypoints, CalendarIcon, FilterX // Manter CalendarIcon (Sheet), FilterX (Sheet)
  } from "@lucide/svelte";

  // Importações de Componentes Customizados
  // import SavedItemsCardView from "./card/SavedItemsCardView.svelte"; // Remover
  import TagFilterDialog from "../components/TagFilterDialog.svelte"; 
  import GroupFilterDialog from "../components/GroupFilterDialog.svelte"; 
  // import EditTagDialog from "../components/EditTagDialog.svelte"; // Comentado 
  // import ConfirmDialog from "../components/ConfirmDialog.svelte"; // Comentado 
  import FilterSheet from "../components/FilterSheet.svelte";
  import SavedItemsCardsTab from "../components/SavedItemsCardsTab.svelte"; // <-- NOVO import

  // --- Estados de Filtros e Ordenação ---
  let searchQuery = $state("");
  let searchScope = $state<'content' | 'tags' | 'groups'>('content');
  let includedTags = $state<string[]>([]);
  let excludedTags = $state<string[]>([]);
  let tagMatchLogic: 'AND' | 'OR' = $state('AND'); // Lógica para inclusão de tags
  let includedGroups = $state<string[]>([]);
  let excludedGroups = $state<string[]>([]);
  let groupMatchLogic: 'AND' | 'OR' = $state('AND'); // Lógica para inclusão de grupos
  let selectedDateRange = $state<DateRange | undefined>(undefined);
  let currentSortCriterion = $state<string>('dateAdded');
  let currentSortDirection = $state<string>('desc');

  // --- Estados de Diálogos/Modais ---
  let showTagFilterDialog = $state(false); // Para novo diálogo de tags
  let showGroupFilterDialog = $state(false); // Para novo diálogo de grupos
  let showRemoveTagDialog = $state(false); // Este é usado por um AlertDialog local, mantém
  let tagToRemoveGlobally = $state(""); // Mantém o estado
  let showEditTagDialog = $state(false); // Mantém o estado, mas o diálogo não será chamado daqui por enquanto
  let tagToEditGlobally = $state(""); // Mantém o estado
  let newTagNameGlobally = $state(""); // Gerenciamento global
  let showRemoveAllTagsDialog = $state(false); // Este é usado por um AlertDialog local, mantém
  let showConfirmDialog = $state(false); // Estado geral de confirmação (pode ser usado por outros diálogos no futuro)
  let isFilterSheetOpen = $state(false);

  // --- Dados Derivados ---
  let availableTags = $derived(getAllTags($savedItems));
  let filteredItems = $derived(
    filterItems(
      $savedItems,
      searchQuery,
      searchScope,
      includedTags,
      excludedTags,
      tagMatchLogic,
      includedGroups,
      excludedGroups,
      groupMatchLogic,
      selectedDateRange
    )
  );
  let sortedItems = $derived(sortItems(filteredItems, currentSortCriterion, currentSortDirection));

  // --- Funções de Filtragem e Ordenação ---

  function filterItems(
    items: SavedItem[] | undefined,
    query: string,
    scope: 'content' | 'tags' | 'groups',
    includedTagsParam: string[],
    excludedTagsParam: string[],
    currentTagMatchLogic: 'AND' | 'OR',
    includedGroupIds: string[],
    excludedGroupIds: string[],
    currentGroupMatchLogic: 'AND' | 'OR',
    dateRange: DateRange | undefined
  ): SavedItem[] {
    if (!items) return [];
    const lowerQuery = query.toLowerCase();
    const rangeStart = dateRange?.start ? startOfDay(dateRange.start.toDate(getLocalTimeZone())) : null;
    const rangeEnd = dateRange?.end ? endOfDay(dateRange.end.toDate(getLocalTimeZone())) : null;

    return items.filter(item => {
      // 1. Filtro por Query de Texto (considerando o escopo)
      let matchesQuery = true;
      if (query) {
        if (scope === 'content') {
          matchesQuery = Boolean(
            item.title?.toLowerCase().includes(lowerQuery) ||
            item.url?.toLowerCase().includes(lowerQuery) ||
            (item.comments && item.comments.toLowerCase().includes(lowerQuery))
          );
        } else if (scope === 'tags') {
          matchesQuery = !!item.tags && item.tags.some(tag => typeof tag === 'string' && tag.toLowerCase().includes(lowerQuery));
        } else if (scope === 'groups') {
          matchesQuery = !!item.groupIds && item.groupIds.some(gId => {
            const groupName = $groups?.find(g => g.id === gId)?.name;
            return !!groupName && groupName.toLowerCase().includes(lowerQuery);
          });
        }
      }

      // 2. Filtro por Grupos Incluídos (com lógica AND/OR)
      let matchesIncludedGroupFilter = true;
      if (includedGroupIds.length > 0) {
        if (includedGroupIds.includes('NO_GROUP')) {
           matchesIncludedGroupFilter = !item.groupIds || item.groupIds.length === 0;
        } else if (item.groupIds && item.groupIds.length > 0) {
            if (currentGroupMatchLogic === 'AND') {
                matchesIncludedGroupFilter = includedGroupIds.every(incGid => item.groupIds!.includes(incGid));
            } else { // OR
                matchesIncludedGroupFilter = includedGroupIds.some(incGid => item.groupIds!.includes(incGid));
            }
        } else {
             matchesIncludedGroupFilter = false; // Tem grupos incluídos, mas item não tem grupo
        }
      }


      // 3. Filtro por Grupos Excluídos
      const matchesExcludedGroupFilter = excludedGroupIds.length === 0 ||
        !item.groupIds || // Itens sem grupo passam no filtro de exclusão
        !excludedGroupIds.some(excludedGroupId => item.groupIds!.includes(excludedGroupId));


      // 4. Filtro por Tags Incluídas (com lógica AND/OR)
      const matchesIncludedTagsFilter = includedTagsParam.length === 0 || (
        item.tags && Array.isArray(item.tags) && item.tags.length > 0 && (
          currentTagMatchLogic === 'AND'
            ? includedTagsParam.every(incTag => item.tags!.some(itemTag => itemTag?.toLowerCase() === incTag.toLowerCase()))
            : includedTagsParam.some(incTag => item.tags!.some(itemTag => itemTag?.toLowerCase() === incTag.toLowerCase()))
        )
      );

      // 5. Filtro por Tags Excluídas
      const matchesExcludedTagsFilter = excludedTagsParam.length === 0 ||
        !item.tags || // Itens sem tags passam no filtro de exclusão
        !excludedTagsParam.some(excludedTag =>
          item.tags!.some(itemTag => itemTag?.toLowerCase() === excludedTag.toLowerCase())
        );

      // 6. Filtro por Data
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
        matchesDate = !rangeStart; // Se não há data de início, não filtra por data
      }

      // Retorno final
      return matchesQuery &&
             matchesIncludedGroupFilter && matchesExcludedGroupFilter &&
             matchesIncludedTagsFilter && matchesExcludedTagsFilter &&
             matchesDate;
    });
  }

  function sortItems(items: SavedItem[], criteria: string, direction: string): SavedItem[] {
    return [...items].sort((a, b) => {
      let comparison = 0;
      // (Lógica de comparação existente permanece igual)
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

  // --- Funções Auxiliares ---

  function getAllTags(items: SavedItem[] | undefined): string[] {
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

  // Funções toggleTag e toggleGroup foram removidas (agora dentro dos diálogos)

   function openRemoveTagDialog(tag: string) { // Esta é usada pelo AlertDialog local, mantém
    tagToRemoveGlobally = tag;
    showRemoveTagDialog = true;
  }

  function confirmRemoveTag() { // Esta é usada pelo AlertDialog local, mantém
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
    // Remover dos arrays de filtro também
    includedTags = includedTags.filter(t => t.toLowerCase() !== tagToRemoveLower);
    excludedTags = excludedTags.filter(t => t.toLowerCase() !== tagToRemoveLower);
    showRemoveTagDialog = false;
    tagToRemoveGlobally = "";
  }

  function openEditTagDialog(tag: string) { // Chamada pelo AlertDialog, não pelo Sheet
    tagToEditGlobally = tag;
    newTagNameGlobally = tag; 
    showEditTagDialog = true; // Agora controla o AlertDialog local
  }

  function confirmEditTag() { 
     // ... (lógica existente)
     showEditTagDialog = false;
  }

  function removeAllTags() { // Esta é usada pelo AlertDialog local, mantém
    showRemoveAllTagsDialog = true;
  }

  function confirmRemoveAllTags() { // Esta é usada pelo AlertDialog local, mantém
    // ... (lógica existente)
  }

  function clearFiltersAndSort() {
    searchQuery = "";
    searchScope = 'content';
    includedTags = [];
    excludedTags = [];
    tagMatchLogic = 'AND';
    includedGroups = [];
    excludedGroups = [];
    groupMatchLogic = 'AND';
    selectedDateRange = undefined;
    currentSortCriterion = "dateAdded";
    currentSortDirection = "desc";
    toast.info("Filtros e ordenação redefinidos.");
    isFilterSheetOpen = false; // Fecha o sheet ao limpar
  }

  function toDateOrNull(dateValue: DateValue | undefined): Date | null {
    return dateValue ? dateValue.toDate(getLocalTimeZone()) : null;
  }

  // --- Funções de Callback para SavedItemsCardsTab ---
  function handleSearchQueryChange(query: string) {
      searchQuery = query;
  }
  function handleSearchScopeChange(scope: 'content' | 'tags' | 'groups') {
      searchScope = scope;
  }
  function handleOpenFilterSheet() {
      isFilterSheetOpen = true;
  }
  function handleClearSearch() {
      searchQuery = '';
  }
  function handleRemoveIncludedGroup(groupId: string) {
      includedGroups = includedGroups.filter(id => id !== groupId);
  }
  function handleRemoveExcludedGroup(groupId: string) {
      excludedGroups = excludedGroups.filter(id => id !== groupId);
  }
  function handleRemoveIncludedTag(tag: string) {
      includedTags = includedTags.filter(t => t !== tag);
  }
  function handleRemoveExcludedTag(tag: string) {
      excludedTags = excludedTags.filter(t => t !== tag);
  }
  function handleClearDateRange() {
      selectedDateRange = undefined;
  }

</script>

<div class="flex flex-col h-full p-4 md:p-6 space-y-0">
  <header class="mb-0 flex-shrink-0">
    <!-- {/* Título removido anteriormente */} -->
  </header>

  <Tabs.Root value="cards" class="w-full flex flex-col flex-grow overflow-hidden">
    <!-- {/* Navegação por Abas */} -->
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

    <!-- {/* Conteúdo da Aba Tabela */} -->
     <Tabs.Content value="table" class="flex-grow overflow-y-auto p-1">
      <div class="text-center py-10 text-gray-500 dark:text-gray-400 border rounded-lg dark:border-gray-700">
        <p class="font-medium">Visualização em Tabela</p>
        <p class="text-sm">(Em desenvolvimento)</p>
      </div>
    </Tabs.Content>

    <!-- {/* Conteúdo da Aba Cartões - AGORA USA O COMPONENTE */} -->
    <Tabs.Content value="cards" class="flex flex-col flex-grow overflow-hidden">
        <SavedItemsCardsTab
          searchQuery={searchQuery}
          searchScope={searchScope}
          {includedTags}
          {excludedTags}
          {includedGroups}
          {excludedGroups}
          {selectedDateRange}
          sortedItems={sortedItems}
          groups={$groups}
          
          onSearchQueryChange={handleSearchQueryChange}
          onSearchScopeChange={handleSearchScopeChange}
          onOpenFilterSheet={handleOpenFilterSheet}
          onClearSearch={handleClearSearch}
          onRemoveIncludedGroup={handleRemoveIncludedGroup}
          onRemoveExcludedGroup={handleRemoveExcludedGroup}
          onRemoveIncludedTag={handleRemoveIncludedTag}
          onRemoveExcludedTag={handleRemoveExcludedTag}
          onClearDateRange={handleClearDateRange}
        />
        <!-- CONTEÚDO HTML ANTERIOR REMOVIDO DAQUI -->
    </Tabs.Content>

    <!-- {/* Conteúdo das Abas Kanban e Fluxo */} -->
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

  <!-- {/* **** DIÁLOGOS **** */} -->

  {#if showTagFilterDialog}
      <TagFilterDialog
        open={showTagFilterDialog}
        initialIncludedTags={includedTags}
        initialExcludedTags={excludedTags}
        initialTagMatchLogic={tagMatchLogic}
        availableTags={availableTags}
        onClose={() => showTagFilterDialog = false}
        onApply={(e) => {
          includedTags = e.included;
          excludedTags = e.excluded;
          tagMatchLogic = e.logic;
          showTagFilterDialog = false;
        }}
      />
    {/if}

    {#if showGroupFilterDialog}
      <GroupFilterDialog
        open={showGroupFilterDialog}
        initialIncludedGroups={includedGroups}
        initialExcludedGroups={excludedGroups}
        initialGroupMatchLogic={groupMatchLogic}
        availableGroups={$groups ?? []}
        onClose={() => showGroupFilterDialog = false}
        onApply={(e) => {
          includedGroups = e.included;
          excludedGroups = e.excluded;
          groupMatchLogic = e.logic;
          showGroupFilterDialog = false;
        }}
      />
    {/if}

  <!-- {/* Diálogos de Gerenciamento Global de Tags (AlertDialogs locais) */} -->
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
        <!-- Input movido para cá do componente EditTagDialog (comentado) -->
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

  <!-- FilterSheet Externo -->
  <FilterSheet 
    open={isFilterSheetOpen}
    {includedTags}
    {excludedTags}
    {includedGroups}
    {excludedGroups}
    {selectedDateRange}
    {currentSortCriterion}
    {currentSortDirection}
    searchQuery={searchQuery}
    availableTags={availableTags}
    availableGroups={$groups ?? []}
    
    onClose={() => isFilterSheetOpen = false}
    onTagFilterOpen={() => {
      showTagFilterDialog = true;
      isFilterSheetOpen = false;
    }}
    onGroupFilterOpen={() => {
      showGroupFilterDialog = true;
      isFilterSheetOpen = false;
    }}
    onDateChange={(range: DateRange | undefined) => selectedDateRange = range}
    onSortCriterionChange={(criterion: string) => currentSortCriterion = criterion}
    onSortDirectionChange={(direction: string) => currentSortDirection = direction}
    onClearFilters={clearFiltersAndSort}
    onManageGroupClick={() => toast.info('Gerenciamento de Grupos ainda não implementado.')} 
    onEditTagClick={(tag: string) => openEditTagDialog(tag)} 
    onRemoveTagClick={(tag: string) => openRemoveTagDialog(tag)} 
    onRemoveAllTagsClick={removeAllTags} 
  />

</div>
