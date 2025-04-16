<script lang="ts">
  // Importações Essenciais
  import { savedItems, groups, knownTags } from "../../storage"; // ADICIONAR knownTags
  import { 
      createGroup, 
      updateGroup, 
      deleteGroup, 
      renameTagGlobally, 
      deleteTagGlobally, 
      deleteAllTagsGlobally, 
      deleteAllGroupsGlobally, // Descomentar quando implementado e exportado
      addKnownTagIfNotExists // ADICIONAR importação
  } from "../../storage";
  import type { SavedItem, Group } from "../../types";
  // Importar os novos tipos
  import type { SortDescriptor, FilterSettings, NamedFilterSet } from "../../types";
  import { onMount } from "svelte";
  import { toast } from "svelte-sonner";
  import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
  import { ptBR } from "date-fns/locale";
  import { getLocalTimeZone, type DateValue, parseDate } from "@internationalized/date";
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
  import { sortItems } from '../../lib/utils/sorting';
  // Importações de Componentes Customizados
  // import SavedItemsCardView from "./card/SavedItemsCardView.svelte"; // Remover
  import TagFilterDialog from "../components/TagFilterDialog.svelte"; 
  import GroupFilterDialog from "../components/GroupFilterDialog.svelte"; 
  // import EditTagDialog from "../components/EditTagDialog.svelte"; // Comentado 
  // import ConfirmDialog from "../components/ConfirmDialog.svelte"; // Comentado 
  import FilterSheet from "../components/FilterSheet.svelte";
  import SavedItemsCardsTab from "../components/SavedItemsCardsTab.svelte"; // <-- NOVO import
  // NOVO: Importar diálogos
  import SaveFilterDialog from "../components/SaveFilterDialog.svelte";
  import LoadFilterDialog from "../components/LoadFilterDialog.svelte";
  // Adicionar importações dos diálogos de gerenciamento
  import ManageGroupsDialog from "../components/ManageGroupsDialog.svelte";
  import ManageTagsDialog from "../components/ManageTagsDialog.svelte";
  // Importação do componente de tabela
  import SavedItemsTableView from "./table/SavedItemsTableView.svelte";

  // Novo estado para ordenação múltipla
  let sortDescriptors = $state<SortDescriptor[]>([
    { criterion: 'dateAdded', direction: 'desc' } // Padrão inicial
  ]);

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

  // --- Estados de Diálogos/Modais ---
  let showTagFilterDialog = $state(false);
  let showGroupFilterDialog = $state(false);
  let showRemoveTagDialog = $state(false);
  let tagToRemoveGlobally = $state("");
  let showEditTagDialog = $state(false);
  let tagToEditGlobally = $state("");
  let newTagNameGlobally = $state("");
  let showRemoveAllTagsDialog = $state(false);
  let showConfirmDialog = $state(false);
  let isFilterSheetOpen = $state(false);
  let showSaveFilterDialog = $state(false);
  let showLoadFilterDialog = $state(false);
  let showManageGroupsDialog = $state(false);
  let showManageTagsDialog = $state(false);

  // --- NOVO: Estado para Filtros Nomeados ---
  let namedFilterSets = $state<NamedFilterSet[]>([]);

  // --- Dados Derivados ---
  let availableTags = $derived($knownTags);
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
  let sortedItems = $derived(sortItems(filteredItems, sortDescriptors));

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
    // Resetar para o padrão de ordenação
    sortDescriptors = [{ criterion: 'dateAdded', direction: 'desc' }];
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

  // --- NOVO: Helper para obter configurações atuais ---
  function getCurrentSettingsObject(): FilterSettings {
    return {
      searchQuery,
      searchScope,
      includedTags,
      excludedTags,
      tagMatchLogic,
      includedGroups,
      excludedGroups,
      groupMatchLogic,
      selectedDateRange: selectedDateRange ? {
          start: selectedDateRange.start?.toString(),
          end: selectedDateRange.end?.toString()
      } : undefined,
      sortDescriptors
    };
  }

  // --- Carregar Filtros Salvos ao Montar --- (MODIFICADO)
  onMount(async () => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      try {
        // Carregar ambos: último filtro usado E filtros nomeados
        const result = await chrome.storage.sync.get([
          'savedItemsViewFilters', 
          'namedFilterSets'
        ]);
        
        // Carregar último filtro usado (lógica existente, ligeiramente melhorada)
        const lastUsedSettings = result.savedItemsViewFilters;
        if (lastUsedSettings) {
          // console.log('Carregando último filtro:', lastUsedSettings);
          searchQuery = typeof lastUsedSettings.searchQuery === 'string' ? lastUsedSettings.searchQuery : "";
          searchScope = ['content', 'tags', 'groups'].includes(lastUsedSettings.searchScope) ? lastUsedSettings.searchScope : 'content';
          includedTags = Array.isArray(lastUsedSettings.includedTags) ? lastUsedSettings.includedTags.filter((t: any) => typeof t === 'string') : [];
          excludedTags = Array.isArray(lastUsedSettings.excludedTags) ? lastUsedSettings.excludedTags.filter((t: any) => typeof t === 'string') : [];
          tagMatchLogic = lastUsedSettings.tagMatchLogic === 'OR' ? 'OR' : 'AND';
          includedGroups = Array.isArray(lastUsedSettings.includedGroups) ? lastUsedSettings.includedGroups.filter((g: any) => typeof g === 'string') : [];
          excludedGroups = Array.isArray(lastUsedSettings.excludedGroups) ? lastUsedSettings.excludedGroups.filter((g: any) => typeof g === 'string') : [];
          groupMatchLogic = lastUsedSettings.groupMatchLogic === 'OR' ? 'OR' : 'AND';
          sortDescriptors = Array.isArray(lastUsedSettings.sortDescriptors) && lastUsedSettings.sortDescriptors.length > 0
                           ? lastUsedSettings.sortDescriptors.filter((d: any) => d && typeof d.criterion === 'string' && ['asc', 'desc'].includes(d.direction))
                           : [{ criterion: 'dateAdded', direction: 'desc' }];
          if (sortDescriptors.length === 0) sortDescriptors = [{ criterion: 'dateAdded', direction: 'desc' }];

          if (lastUsedSettings.selectedDateRange?.start && typeof lastUsedSettings.selectedDateRange.start === 'string') {
              try {
                  const start = parseDate(lastUsedSettings.selectedDateRange.start);
                  const end = lastUsedSettings.selectedDateRange.end && typeof lastUsedSettings.selectedDateRange.end === 'string'
                                ? parseDate(lastUsedSettings.selectedDateRange.end)
                                : undefined;
                  selectedDateRange = { start, end };
              } catch (e) { console.error("Erro ao reconstruir DateRange do último filtro:", e); selectedDateRange = undefined; }
          } else { selectedDateRange = undefined; }
        }

        // Carregar filtros nomeados
        const loadedNamedFilters = result.namedFilterSets;
        if (Array.isArray(loadedNamedFilters)) {
          // Validar estrutura básica (poderia ser mais robusto)
          namedFilterSets = loadedNamedFilters.filter(f => f && typeof f.id === 'string' && typeof f.name === 'string' && f.settings);
          // console.log('Filtros nomeados carregados:', namedFilterSets);
        }

      } catch (error) {
          console.error("Erro ao carregar filtros do storage:", error);
      }
    }
  });

  // --- Salvar Filtros Automaticamente com $effect --- (MODIFICADO)
  $effect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      // Salvar último filtro usado
      const lastUsedSettingsToSave = getCurrentSettingsObject();
      chrome.storage.sync.set({ savedItemsViewFilters: lastUsedSettingsToSave });
      // console.log('Último filtro salvo:', lastUsedSettingsToSave); // Debug

      // Salvar filtros nomeados (já são atualizados nas funções abaixo)
      // Não precisamos salvar aqui, mas é bom ter o effect para o último filtro.
    }
  });

  // --- Funções para Gerenciar Filtros Nomeados ---
  async function saveNamedFilterSet(name: string) {
    if (!name.trim()) {
      toast.error("Por favor, insira um nome para o filtro.");
      return;
    }
    name = name.trim();
    const existingIndex = namedFilterSets.findIndex(set => set.name.toLowerCase() === name.toLowerCase());
    const currentSettings = getCurrentSettingsObject();

    let proceed = true;
    if (existingIndex > -1) {
      proceed = window.confirm(`Já existe um filtro chamado "${namedFilterSets[existingIndex].name}". Deseja sobrescrevê-lo?`);
    }

    if (proceed) {
      const newSet: NamedFilterSet = {
        id: existingIndex > -1 ? namedFilterSets[existingIndex].id : Date.now().toString(), // Reusa ID se sobrescrever
        name: name, // Mantém capitalização do usuário
        settings: currentSettings
      };

      let updatedSets: NamedFilterSet[];
      if (existingIndex > -1) {
        updatedSets = namedFilterSets.map((set, index) => index === existingIndex ? newSet : set);
      } else {
        updatedSets = [...namedFilterSets, newSet];
      }
      
      namedFilterSets = updatedSets.sort((a, b) => a.name.localeCompare(b.name)); // Atualiza estado local ordenado

      try {
        await chrome.storage.sync.set({ namedFilterSets: namedFilterSets });
        toast.success(`Filtro "${name}" salvo com sucesso.`);
      } catch (error) {
        toast.error("Erro ao salvar o filtro nomeado.");
        console.error("Erro ao salvar namedFilterSets:", error);
        // Reverter estado local? (Opcional)
      }
    }
    showSaveFilterDialog = false; // Fecha o diálogo após salvar
  }

  function applyNamedFilterSet(id: string) {
    const setToApply = namedFilterSets.find(set => set.id === id);
    if (!setToApply) {
      toast.error("Filtro selecionado não encontrado.");
      return;
    }

    const settings = setToApply.settings;
    // console.log("Aplicando filtro:", setToApply.name, settings);

    searchQuery = settings.searchQuery ?? "";
    searchScope = settings.searchScope ?? 'content';
    includedTags = settings.includedTags ?? [];
    excludedTags = settings.excludedTags ?? [];
    tagMatchLogic = settings.tagMatchLogic ?? 'AND';
    includedGroups = settings.includedGroups ?? [];
    excludedGroups = settings.excludedGroups ?? [];
    groupMatchLogic = settings.groupMatchLogic ?? 'AND';
    sortDescriptors = settings.sortDescriptors ?? [{ criterion: 'dateAdded', direction: 'desc' }];
    if (sortDescriptors.length === 0) sortDescriptors = [{ criterion: 'dateAdded', direction: 'desc' }];

    if (settings.selectedDateRange?.start) {
        try {
            const start = parseDate(settings.selectedDateRange.start);
            const end = settings.selectedDateRange.end ? parseDate(settings.selectedDateRange.end) : undefined;
            selectedDateRange = { start, end };
        } catch (e) { console.error("Erro ao aplicar DateRange:", e); selectedDateRange = undefined; }
    } else { selectedDateRange = undefined; }

    toast.info(`Filtro "${setToApply.name}" aplicado.`);
    isFilterSheetOpen = false; // Fecha o sheet ao aplicar um filtro salvo
    showLoadFilterDialog = false; // Fecha o diálogo após aplicar
  }

  async function deleteNamedFilterSet(id: string) {
    const setToDelete = namedFilterSets.find(set => set.id === id);
    if (!setToDelete) return;

    if (window.confirm(`Tem certeza que deseja excluir o filtro salvo "${setToDelete.name}"?`)) {
      const updatedSets = namedFilterSets.filter(set => set.id !== id);
      namedFilterSets = updatedSets; // Atualiza estado local

      try {
        await chrome.storage.sync.set({ namedFilterSets: updatedSets });
        toast.success(`Filtro "${setToDelete.name}" excluído.`);
      } catch (error) {
        toast.error("Erro ao excluir o filtro nomeado.");
        console.error("Erro ao salvar namedFilterSets após exclusão:", error);
         // Mantém o diálogo de carregar aberto após excluir
      }
    }
  }

  // --- NOVO: Funções para abrir os diálogos --- 
  function handleOpenSaveFilterDialog() {
    showSaveFilterDialog = true;
  }
  function handleOpenLoadFilterDialog() {
    showLoadFilterDialog = true;
  }

  // --- Adicionar Funções para abrir os diálogos de gerenciamento --- 
  function handleOpenManageGroupsDialog() {
    showManageGroupsDialog = true;
  }
  function handleOpenManageTagsDialog() {
    showManageTagsDialog = true;
  }

  // --- Funções de Gerenciamento para Diálogos --- (MODIFICADO com lógica real)
  async function handleGroupCreate(name: string, color?: string): Promise<Group | null> {
    try {
      const newGroup = await createGroup(name, color);
      if (newGroup) {
        return newGroup;
      } else {
        toast.warning(`Grupo "${name}" já existe ou ocorreu um erro.`);
        return null;
      }
    } catch (error) {
      console.error("Erro ao criar grupo:", error);
      toast.error(`Falha ao criar o grupo "${name}".`);
      return null;
    }
  }

  async function handleGroupUpdate(id: string, updates: { name?: string; color?: string }): Promise<boolean> {
    try {
      await updateGroup(id, updates);
      return true;
    } catch (error) {
      console.error("Erro ao atualizar grupo:", error);
      toast.error(`Falha ao atualizar o grupo.`);
      return false;
    }
  }

  async function handleGroupDelete(id: string): Promise<boolean> {
    try {
      await deleteGroup(id);
       includedGroups = includedGroups.filter(gId => gId !== id);
       excludedGroups = excludedGroups.filter(gId => gId !== id);
      return true;
    } catch (error) {
      console.error("Erro ao excluir grupo:", error);
      toast.error(`Falha ao excluir o grupo.`);
      return false;
    }
  }

  // NOVA FUNÇÃO para excluir todos os grupos (MODIFICADA)
  async function handleDeleteAllGroups(): Promise<boolean> {
    console.log("Tentativa de exclusão de TODOS os grupos...");
    try {
      // TODO: Implementar e exportar deleteAllGroupsGlobally em src/storage.ts
      await deleteAllGroupsGlobally(); 
      toast.success("Todos os grupos foram removidos.");
      includedGroups = []; 
      excludedGroups = [];
      showManageGroupsDialog = false; 
      return true;
      
      /* Lógica após implementação:
      toast.success("Todos os grupos foram removidos.");
      includedGroups = []; 
      excludedGroups = [];
      showManageGroupsDialog = false; 
      return true;
      */
    } catch (error) {
      console.error("Erro ao excluir todos os grupos:", error);
      toast.error("Erro ao remover todos os grupos.");
      return false;
    }
  }

  async function handleTagRename(oldName: string, newName: string): Promise<boolean> {
    try {
      await renameTagGlobally(oldName, newName);
      includedTags = includedTags.map(t => t === oldName ? newName : t);
      excludedTags = excludedTags.map(t => t === oldName ? newName : t);
      toast.success(`Tag "${oldName}" renomeada para "${newName}".`);
      return true;
    } catch (error) {
      console.error("Erro ao renomear tag globalmente:", error);
      toast.error(`Falha ao renomear a tag "${oldName}".`);
      return false;
    }
  }

  async function handleTagDelete(tagName: string): Promise<boolean> {
    try {
      await deleteTagGlobally(tagName);
      includedTags = includedTags.filter(t => t !== tagName);
      excludedTags = excludedTags.filter(t => t !== tagName);
      toast.success(`Tag "${tagName}" excluída de todos os itens.`);
      return true;
    } catch (error) {
      console.error("Erro ao excluir tag globalmente:", error);
      toast.error(`Falha ao excluir a tag "${tagName}".`);
      return false;
    }
  }

  // NOVA FUNÇÃO para excluir todas as tags (MODIFICADA)
  async function handleDeleteAllTags(): Promise<boolean> {
    console.log("Executando exclusão de TODAS as tags...");
    try {
      await deleteAllTagsGlobally();
      toast.success("Todas as tags foram removidas de todos os itens.");
      includedTags = [];
      excludedTags = [];
      showManageTagsDialog = false; 
      return true;
    } catch (error) {
      console.error("Erro ao excluir todas as tags globalmente:", error);
      toast.error("Erro ao remover todas as tags.");
      return false;
    }
  }

  // Função para adicionar tag (exemplo, pode já existir ou precisar ser criada)
  // Esta função seria chamada, por exemplo, ao criar um item com uma nova tag
  async function handleAddItem(itemData: Omit<SavedItem, 'id' | 'dateAdded'>) {
      // ... (lógica para criar o item em $savedItems) ...
      // Após criar o item, garantir que as novas tags sejam adicionadas à lista conhecida
      if (itemData.tags) {
          itemData.tags.forEach(tag => addKnownTagIfNotExists(tag));
      }
      // ...
  }

  let { viewMode = "cards" } = $props();

</script>

{#if viewMode === 'table'}
  <div class="flex flex-col flex-grow h-full min-h-0 overflow-hidden p-0 pt-2">
    <SavedItemsTableView data={sortedItems} />
  </div>
{:else if viewMode === 'cards'}
  <div class="flex flex-col flex-grow h-full min-h-0 overflow-hidden p-0 pt-2">
    <SavedItemsCardsTab
      searchQuery={searchQuery}
      searchScope={searchScope}
      {includedTags}
      {excludedTags}
      {includedGroups}
      {excludedGroups}
      {selectedDateRange}
      sortedItems={sortedItems}
      groups={$groups ?? []}
      availableSystemTags={availableTags}
      sortDescriptors={sortDescriptors}
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
  </div>
{:else if viewMode === 'kanban'}
  <div class="text-center py-10 text-gray-500 dark:text-gray-400 border rounded-lg dark:border-gray-700 flex-grow overflow-y-auto p-1">
    <p class="font-medium">Visualização Kanban</p>
    <p class="text-sm">(Em desenvolvimento)</p>
  </div>
{:else if viewMode === 'flow'}
  <div class="text-center py-10 text-gray-500 dark:text-gray-400 border rounded-lg dark:border-gray-700 flex-grow overflow-y-auto p-1">
    <p class="font-medium">Visualização em Fluxo</p>
    <p class="text-sm">(Em desenvolvimento)</p>
  </div>
{/if}

<div class="flex flex-col h-full min-h-0 p-1 md:p-2 space-y-0">
  <header class="mb-0 flex-shrink-0">
    <!-- {/* Título removido anteriormente */} -->
  </header>

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

  {#if showSaveFilterDialog}
    <SaveFilterDialog
       bind:open={showSaveFilterDialog}
       onSave={saveNamedFilterSet} 
    />
  {/if}

  {#if showLoadFilterDialog}
     <LoadFilterDialog
        bind:open={showLoadFilterDialog}
        filterSets={namedFilterSets}
        onApply={applyNamedFilterSet}
        onDelete={deleteNamedFilterSet}
     />
  {/if}

  <FilterSheet 
    open={isFilterSheetOpen}
    {includedTags}
    {excludedTags}
    {includedGroups}
    {excludedGroups}
    {selectedDateRange}
    bind:sortDescriptors={sortDescriptors}
    searchQuery={searchQuery}
    availableTags={availableTags}
    availableGroups={$groups ?? []}
    namedFilterSets={namedFilterSets}
    
    onClose={() => isFilterSheetOpen = false}
    onTagFilterOpen={() => {
      showTagFilterDialog = true;
    }}
    onGroupFilterOpen={() => {
      showGroupFilterDialog = true;
    }}
    onDateChange={(range: DateRange | undefined) => selectedDateRange = range}
    onClearFilters={clearFiltersAndSort}
    onOpenSaveFilterDialog={handleOpenSaveFilterDialog} 
    onOpenLoadFilterDialog={handleOpenLoadFilterDialog}
    onOpenManageGroupsDialog={handleOpenManageGroupsDialog}
    onOpenManageTagsDialog={handleOpenManageTagsDialog}
  />

  {#if showManageGroupsDialog}
    <ManageGroupsDialog
       bind:open={showManageGroupsDialog}
       allGroups={$groups ?? []}
       onCreate={handleGroupCreate}
       onUpdate={handleGroupUpdate}
       onDelete={handleGroupDelete}
       onDeleteAll={handleDeleteAllGroups}
    />
  {/if}

  {#if showManageTagsDialog}
     <ManageTagsDialog
        bind:open={showManageTagsDialog}
        allTags={availableTags}
        onRename={handleTagRename}
        onDelete={handleTagDelete}
        onDeleteAll={handleDeleteAllTags}
     />
  {/if}

</div>
