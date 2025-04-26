<script lang="ts">
  import { createSvelteTable } from '../../../lib/components/ui/data-table/index';
  import * as Table from '../../../lib/components/ui/table/index';
  import { FlexRender } from '../../../lib/components/ui/data-table/index';
  import type { ColumnDef, SortingState } from '@tanstack/table-core';
  import { getCoreRowModel, getSortedRowModel, getExpandedRowModel, getFilteredRowModel } from '@tanstack/table-core';
  import * as Popover from '../../../lib/components/ui/popover/index';
  import Calendar from '../../../lib/components/ui/calendar/calendar.svelte';
  import Button from '../../../lib/components/ui/button/button.svelte';
  import GroupFilterDialog from '../../components/GroupFilterDialog.svelte';
  import TagFilterDialog from '../../components/TagFilterDialog.svelte';
  import Badge from '../../../lib/components/ui/badge/badge.svelte';
  import type { SavedItem, Group } from '../../../types';
  import * as storage from '../../../storage';
  import { savedItems, groups as groupsStore, knownTags as tagsStore, notes as notesStore, flashcards as flashcardsStore } from '../../../storage';
  import { getLocalTimeZone, today, type DateValue } from "@internationalized/date";
  import type { DateRange } from 'bits-ui';
  import { RangeCalendar } from '../../../lib/components/ui/range-calendar/index.js';
  import Bookmark from '@lucide/svelte/icons/bookmark';
  import Clock from '@lucide/svelte/icons/clock';
  import Funnel from '@lucide/svelte/icons/funnel';
  import * as ToggleGroup from '../../../lib/components/ui/toggle-group/index';
  import ChevronUp from '@lucide/svelte/icons/chevron-up';
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import ArrowUpDown from '@lucide/svelte/icons/arrow-up-down';
  import { Card, CardHeader, CardTitle, CardContent } from '../../../lib/components/ui/card';
  import * as Dialog from '../../../lib/components/ui/dialog/index';
  import NoteCard from '../../../lib/components/NoteCard.svelte';
  import FlashcardCard from '../../../lib/components/FlashcardCard.svelte';
  import Input from '../../../lib/components/ui/input/input.svelte';
  import * as Select from "../../../lib/components/ui/select/index.js";
  import CalendarSearch from '@lucide/svelte/icons/calendar-search';
  import DialogButtonNotas from './DialogButtonNotas.svelte';
  import DialogButtonFlashcards from './DialogButtonFlashcards.svelte';
  import * as DropdownMenu from '../../../lib/components/ui/dropdown-menu/index';
  import { fly } from 'svelte/transition';
  import { toast } from 'svelte-sonner';
  import * as AlertDialog from '../../../lib/components/ui/alert-dialog/index';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import Folder from '@lucide/svelte/icons/folder';
  import Tags from '@lucide/svelte/icons/tags';
  import ExternalLink from '@lucide/svelte/icons/external-link';
  import BulkGroupAssignDialog from './BulkGroupAssignDialog.svelte';
  import BulkTagAssignDialog from './BulkTagAssignDialog.svelte';

  let { columns = [], data = [] } = $props();
  $inspect("data",data)

  let typeFilter = $state('all');

  let rowSelection = $state({});
  let sorting = $state<SortingState>([]);
  let expanded = $state({});

  let itemFilter = $state('');
  let groupFilter = $state<string[]>([]);
  let tagFilter = $state<string[]>([]);
  let dateFilter = $state<DateRange | undefined>(undefined);
  let scheduledDateFilter = $state<DateRange | undefined>(undefined);
  let statusFilter = $state<string>('');
  let datePopoverOpen = $state(false);
  let scheduledDatePopoverOpen = $state(false);
  let statusDropdownOpen = $state(false);
  let groupDialogOpen = $state(false);
  let tagDialogOpen = $state(false);
  let searchScope: 'title' | 'url' | 'groups' | 'tags' | 'comment' = $state('title');

  let groups = $derived(() => {
    let arr: Group[] = [];
    groupsStore.subscribe(val => arr = val)();
    return arr;
  });
  let tags = $derived(() => {
    let arr: string[] = [];
    tagsStore.subscribe(val => arr = val)();
    return arr;
  });

  $effect(() => {
    const current = table.getColumn('dateAdded')?.getFilterValue();
    if ((!dateFilter || (!dateFilter.start && !dateFilter.end)) && current !== undefined) {
      table.getColumn('dateAdded')?.setFilterValue(undefined);
    }
    $inspect("dateFilter", dateFilter)
  });

  $effect(() => {
    const current = table.getColumn('scheduledDate')?.getFilterValue();
    const filterStartTs = scheduledDateFilter?.start?.toDate(getLocalTimeZone()).getTime();
    const filterEndTs = scheduledDateFilter?.end?.toDate(getLocalTimeZone()).getTime();

    if ((!scheduledDateFilter || (!filterStartTs && !filterEndTs)) && current !== undefined) {
       console.log('Limpando filtro scheduledDate da coluna', current);
       table.getColumn('scheduledDate')?.setFilterValue(undefined);
     }
     $inspect("scheduledDateFilter", scheduledDateFilter)
  });

  $effect(() => {
    const typeColumn = table.getColumn('type');
    if (typeColumn) {
      const newFilterValue = typeFilter === 'all' ? undefined : typeFilter;
      const currentFilterValue = typeColumn.getFilterValue();

      if (newFilterValue !== currentFilterValue) {
        console.log(`Applying type filter. Current: ${currentFilterValue}, New: ${newFilterValue}`);
        typeColumn.setFilterValue(newFilterValue);
      }
    }
    $inspect("typeFilter", typeFilter)
  });

  let columnVisibilityState = $state<{ [key: string]: boolean }>({});
  let columnVisibility = $derived(() => ({
    type: typeFilter === 'all',
    scheduledDate: typeFilter === 'readlater',
    status: typeFilter === 'readlater',
  }));

  let globalFilter = $state('');

  let globalFilterObj = $derived(() => ({ value: globalFilter, scope: searchScope }));

  function globalFilterFn(
    row: { original: SavedItem },
    columnId: string,
    filterValue: any
  ) {
    let value: string = '';
    let scope: string = 'title';
    if (typeof filterValue === 'object' && filterValue !== null) {
      value = filterValue.value;
      scope = filterValue.scope;
    } else {
      value = filterValue;
      scope = 'title';
    }
    if (!value) return true;
    let field: string | string[] | number | undefined;
    switch (scope) {
      case 'groups':
        field = row.original.groupIds
          .map((gid: string) => groups().find((g: Group) => g.id === gid)?.name)
          .filter((x): x is string => Boolean(x));
        break;
      case 'tags':
        field = row.original.tags;
        break;
      case 'title':
        field = row.original.title;
        break;
      case 'url':
        field = row.original.url;
        break;
      case 'comment':
        field = row.original.comments;
        break;
      default:
        field = '';
    }
    if (Array.isArray(field)) {
      return field.some((v) => typeof v === 'string' && v.toLowerCase().includes(value.toLowerCase()));
    }
    if (typeof field === 'string') {
      return field.toLowerCase().includes(value.toLowerCase());
    }
    if (typeof field === 'number') {
      return (field as number).toString().includes(value);
    }
    return false;
  }

  let columnFilters = $state<{ id: string; value: any }[]>([]);

  const table = createSvelteTable({
    get data() {
        return data;
    },
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    globalFilterFn,
    state: {
      get globalFilter() { return globalFilterObj(); },
      get rowSelection() { return rowSelection; },
      get columnVisibility() { return columnVisibility(); },
      get sorting() { return sorting; },
      get expanded() { return expanded; },
      get columnFilters() { return columnFilters; },
    },
    onGlobalFilterChange: (value) => {
      if (typeof value === 'object' && value !== null) {
        globalFilter = value.value;
        searchScope = value.scope;
      } else {
        globalFilter = value;
      }
    },
    onRowSelectionChange: (updater) => {
      if (typeof updater === 'function') {
        rowSelection = updater(rowSelection);
      } else {
        rowSelection = updater;
      }
    },
    onColumnVisibilityChange: (updater) => {
      if (typeof updater === 'function') {
        columnVisibilityState = updater(columnVisibilityState);
      } else {
        columnVisibilityState = updater;
      }
    },
    onSortingChange: (updater) => {
      if (typeof updater === 'function') {
        sorting = updater(sorting);
      } else {
        sorting = updater;
      }
    },
    onExpandedChange: (updater) => {
      if (typeof updater === 'function') {
        expanded = updater(expanded);
      } else {
        expanded = updater;
      }
    },
    onColumnFiltersChange: (updater) => {
      if (typeof updater === 'function') {
        columnFilters = updater(columnFilters);
      } else {
        columnFilters = updater;
      }
    },
    enableRowSelection: true,
  });

  $effect(() => {
    const filterValueForTable = statusFilter !== '' ? statusFilter : undefined;
    const currentTableFilter = table.getColumn('status')?.getFilterValue();

    if (filterValueForTable !== currentTableFilter) {
      console.log('Applying status filter via $effect:', filterValueForTable);
      table.getColumn('status')?.setFilterValue(filterValueForTable);
    }
    $inspect("filterValueForTable", filterValueForTable)
  });

  function formatDate(filter: DateRange | undefined) {
    if (!filter) return;
    const start = filter.start?.toDate(getLocalTimeZone());
    const end = filter.end?.toDate(getLocalTimeZone());
    if (!start) return;
    if (end && end.getTime() !== start.getTime()) {
      return `${start.toLocaleDateString('pt-BR')} - ${end.toLocaleDateString('pt-BR')}`;
    }
    return start.toLocaleDateString('pt-BR');
  }

  function formatDateFilterDisplay(filter: DateRange | undefined) {
    if (!filter) return null;
    const start = filter.start?.toDate(getLocalTimeZone());
    const end = filter.end?.toDate(getLocalTimeZone());
    if (!start) return null;
    if (end && end.getTime() !== start.getTime()) {
      return `${start.toLocaleDateString('pt-BR')} - ${end.toLocaleDateString('pt-BR')}`;
    }
    return start.toLocaleDateString('pt-BR');
  }

  let notes = $derived(() => {
    let arr: import('../../../types').Note[] = [];
    notesStore.subscribe(val => arr = val)();
    return arr;
  });
  let flashcards = $derived(() => {
    let arr: import('../../../types').Flashcard[] = [];
    flashcardsStore.subscribe(val => arr = val)();
    return arr;
  });

  let editingComment: { [id: string]: string } = {};

  const searchScopeOptions = [
    { value: "title", label: "Título" },
    { value: "url", label: "URL" },
    { value: "groups", label: "Grupos" },
    { value: "tags", label: "Tags" },
    { value: "comment", label: "Comentário" }
  ];

  const selectedScopeLabel = $derived(
    searchScopeOptions.find((opt) => opt.value === searchScope)?.label ?? "Buscar em..."
  );

  const _ = { DialogButtonNotas, DialogButtonFlashcards };

  const possibleStatus = ['Hoje', 'Pendente', 'Atrasado', 'Concluído'];

  let selectedRows = $derived(table.getFilteredSelectedRowModel().rows);
  let selectedItemIds = $derived(selectedRows.map(row => row.original.id));
  let selectedItemUrls = $derived(selectedRows.map(row => row.original.url));
  let selectedItemCount = $derived(selectedItemIds.length);

  let isBulkGroupDialogOpen = $state(false);
  let isBulkTagDialogOpen = $state(false);
  let isDeleteDialogOpen = $state(false);

  function handleBulkDelete() {
    if (selectedItemCount === 0) return;
    isDeleteDialogOpen = true;
    console.log("Abrir confirmação de exclusão para:", selectedItemIds);
  }

  async function confirmBulkDelete() {
    if (selectedItemCount === 0) return;
    const idsToDelete = selectedItemIds;
    console.log("Confirmado! Excluindo itens:", idsToDelete);
    isDeleteDialogOpen = false;
    try {
      await storage.deleteItems(idsToDelete);
      toast.success(`${idsToDelete.length} item(ns) excluído(s) com sucesso.`);
      rowSelection = {};
    } catch (error) {
      console.error("Erro ao excluir itens em lote:", error);
      toast.error("Erro ao excluir itens.", { description: error instanceof Error ? error.message : String(error) });
    }
  }

  function openBulkGroupDialog() {
    if (selectedItemCount === 0) return;
    isBulkGroupDialogOpen = true;
    console.log("Abrir diálogo de grupos para:", selectedItemIds);
  }

  async function handleBulkGroupUpdate(updates: { add?: string[], remove?: string[] }) {
    const idsToUpdate = selectedItemIds;
    if (idsToUpdate.length === 0) return;
    console.log("Aplicando atualização de grupos:", updates, "para itens:", idsToUpdate);
    isBulkGroupDialogOpen = false;
    try {
      await storage.updateItemsGroups(idsToUpdate, updates);
      toast.success(`Grupos atualizados para ${idsToUpdate.length} item(ns).`);
      rowSelection = {};
    } catch (error) {
      console.error("Erro ao atualizar grupos em lote:", error);
      toast.error("Erro ao atualizar grupos.", { description: error instanceof Error ? error.message : String(error) });
    }
  }

  function openBulkTagDialog() {
    if (selectedItemCount === 0) return;
    isBulkTagDialogOpen = true;
    console.log("Abrir diálogo de tags para:", selectedItemIds);
  }

  async function handleBulkTagUpdate(updates: { add?: string[], remove?: string[] }) {
     const idsToUpdate = selectedItemIds;
     if (idsToUpdate.length === 0) return;
     console.log("Aplicando atualização de tags:", updates, "para itens:", idsToUpdate);
     isBulkTagDialogOpen = false;
     try {
       await storage.updateItemsTags(idsToUpdate, updates);
       toast.success(`Tags atualizadas para ${idsToUpdate.length} item(ns).`);
       rowSelection = {};
     } catch (error) {
       console.error("Erro ao atualizar tags em lote:", error);
       toast.error("Erro ao atualizar tags.", { description: error instanceof Error ? error.message : String(error) });
     }
  }

  function handleBulkOpen(mode: 'current' | 'new' | 'incognito') {
    const urlsToOpen = selectedItemUrls;
    const count = urlsToOpen.length;
    if (count === 0) return;
    console.log(`Abrindo ${count} URLs no modo ${mode}`);
    try {
      switch (mode) {
        case 'current':
          urlsToOpen.forEach((url: string, index: number) => chrome.tabs.create({ url, active: index === 0 }));
          toast.success(`${count} aba(s) aberta(s) na janela atual.`);
          break;
        case 'new':
          chrome.windows.create({ url: urlsToOpen });
          toast.success(`${count} aba(s) aberta(s) em nova janela.`);
          break;
        case 'incognito':
          chrome.windows.create({ url: urlsToOpen, incognito: true });
          toast.success(`${count} aba(s) aberta(s) em janela anônima.`);
          break;
      }
      rowSelection = {};
    } catch (error) {
       console.error(`Erro ao abrir URLs no modo ${mode}:`, error);
       toast.error("Erro ao abrir links.", { description: error instanceof Error ? error.message : String(error) });
    }
  }

</script>

<!-- Container principal com Flexbox para ocupar altura -->
<div class="flex flex-col h-full min-h-0">

  <!-- Área de Controles (Filtros, Busca) -->
  <div class="flex justify-between items-center gap-4 mb-4 shrink-0">
    <div class="flex items-center gap-2">
      <span class="font-medium text-sm shrink-0">Tipo:</span>
      <ToggleGroup.Root bind:value={typeFilter} variant="outline" size="sm" type="single">
        <ToggleGroup.Item value="all">Todos</ToggleGroup.Item>
        <ToggleGroup.Item value="bookmark">
          <Bookmark class="inline w-4 h-4 mr-1 align-text-bottom" /> Bookmark
        </ToggleGroup.Item>
        <ToggleGroup.Item value="readlater">
          <Clock class="inline w-4 h-4 mr-1 align-text-bottom" /> Ler Mais Tarde
        </ToggleGroup.Item>
      </ToggleGroup.Root>
    </div>

    <div class="flex items-center border rounded-md overflow-hidden w-full max-w-[360px]">
      <div class="relative grow min-w-0 max-w-[320px]">
        <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </span>
        <Input
          type="search"
          class="pl-8 pr-2 h-9 w-full border-0 rounded-none rounded-l-md focus-visible:ring-0 focus-visible:ring-offset-0"
          placeholder="Buscar..."
          value={globalFilter}
          oninput={(e) => globalFilter = e.currentTarget.value}
          autocomplete="off"
        />
      </div>
      <Select.Root bind:value={searchScope} type="single">
        <Select.Trigger class="h-9 px-3 py-2 text-sm border-0 border-l rounded-none rounded-r-md focus:ring-0 focus:ring-offset-0 shrink-0 grow-0 w-32 max-w-[120px]" aria-label="Escopo da busca">
          {selectedScopeLabel}
        </Select.Trigger>
        <Select.Content>
          {#each searchScopeOptions as option (option.value)}
            <Select.Item value={option.value} label={option.label}>
              {option.label}
            </Select.Item>
          {/each}
        </Select.Content>
      </Select.Root>
    </div>
  </div>

  <!-- Container da Tabela com scroll e crescimento flex -->
  <div class="w-full overflow-x-auto flex-grow min-h-0">
    <div class="rounded-md border min-w-full h-full">
      <!-- Tabela em si -->
      <Table.Root class="min-w-full">
        <Table.Header>
          {#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
            <Table.Row>
              {#each headerGroup.headers as header (header.id)}
                <Table.Head class={header.column.id === 'item' ? 'w-56 max-w-xs truncate whitespace-nowrap' : ''}>
                  {#if !header.isPlaceholder}
                    <FlexRender content={header.column.columnDef.header} context={header.getContext()} />
                  {/if}
                </Table.Head>
              {/each}
            </Table.Row>
            <Table.Row>
              {#each headerGroup.headers as header (header.id)}
                <Table.Head class={header.column.id === 'item' ? 'w-56 max-w-xs truncate whitespace-nowrap' : ''}>
                  {#if header.column.id === 'item'}
                    <!-- Sem filtro de coluna para Item -->
                  {:else if header.column.id === 'groupIds'}
                    <Button variant="outline" size="sm" class="w-full justify-start" onclick={() => groupDialogOpen = true}>
                      {#if groupFilter.length === 0}
                        <Funnel class="inline w-4 h-4 mr-1 align-text-bottom" />
                      {:else}
                        {#each groupFilter as gid (gid)}
                          <Badge class="mr-1">{groups().find((g: Group) => g.id === gid)?.name || gid}</Badge>
                        {/each}
                      {/if}
                    </Button>
                    <GroupFilterDialog
                      open={groupDialogOpen}
                      initialIncludedGroups={groupFilter}
                      availableGroups={groups()}
                      onClose={() => groupDialogOpen = false}
                      onApply={(e) => {
                        groupFilter = e.included;
                        groupDialogOpen = false;
                        table.getColumn('groupIds')?.setFilterValue(e.included);
                      }}
                    />
                  {:else if header.column.id === 'tags'}
                    <Button variant="outline" size="sm" class="w-full justify-start" onclick={() => tagDialogOpen = true}>
                      {#if tagFilter.length === 0}
                        <Funnel class="inline w-4 h-4 mr-1 align-text-bottom" />
                      {:else}
                        {#each tagFilter as tag (tag)}
                          <Badge class="mr-1">{tag}</Badge>
                        {/each}
                      {/if}
                    </Button>
                    <TagFilterDialog
                      open={tagDialogOpen}
                      initialIncludedTags={tagFilter}
                      availableTags={tags()}
                      onClose={() => tagDialogOpen = false}
                      onApply={(e) => {
                        tagFilter = e.included;
                        tagDialogOpen = false;
                        table.getColumn('tags')?.setFilterValue(e.included);
                      }}
                    />
                  {:else if header.column.id === 'noteIds'}
                    <Button variant="outline" size="sm" class="w-full justify-start" onclick={() => console.log('Filter Notas clicked')}>
                      <Funnel class="inline w-4 h-4 mr-1 align-text-bottom" />
                    </Button>
                  {:else if header.column.id === 'flashcardIds'}
                    <Button variant="outline" size="sm" class="w-full justify-start" onclick={() => console.log('Filter Flashcards clicked')}>
                      <Funnel class="inline w-4 h-4 mr-1 align-text-bottom" />
                    </Button>
                  {:else if header.column.id === 'dateAdded'}
                    <Popover.Root bind:open={datePopoverOpen}>
                      <Popover.Trigger>
                        <Button variant="outline" size="sm" class="w-full justify-start">
                          {#if dateFilter && (dateFilter.start || dateFilter.end)}
                            {formatDateFilterDisplay(dateFilter)}
                          {:else}
                            <CalendarSearch class="inline w-4 h-4 mr-1 align-text-bottom" />
                          {/if}
                        </Button>
                      </Popover.Trigger>
                      <Popover.Content align="end" class="p-0">
                        <RangeCalendar
                          bind:value={dateFilter}
                          onValueChange={v => {
                            if (!v || (!v.start && !v.end)) {
                              table.getColumn('dateAdded')?.setFilterValue(undefined);
                            } else {
                              const filterVal = {
                                start: v.start?.toDate(getLocalTimeZone()).getTime(),
                                end: v.end?.toDate(getLocalTimeZone()).getTime() ?? v.start?.toDate(getLocalTimeZone()).getTime()
                              }
                              table.getColumn('dateAdded')?.setFilterValue(filterVal);
                            }
                          }}
                        />
                      </Popover.Content>
                    </Popover.Root>
                  {:else if header.column.id === 'scheduledDate'}
                    <Popover.Root bind:open={scheduledDatePopoverOpen}>
                      <Popover.Trigger>
                        <Button variant="outline" size="sm" class="w-full justify-start">
                          {#if scheduledDateFilter && (scheduledDateFilter.start || scheduledDateFilter.end)}
                            {formatDateFilterDisplay(scheduledDateFilter)}
                          {:else}
                            <CalendarSearch class="inline w-4 h-4 mr-1 align-text-bottom" />
                          {/if}
                        </Button>
                      </Popover.Trigger>
                      <Popover.Content align="end" class="p-0">
                        <RangeCalendar
                          bind:value={scheduledDateFilter}
                          onValueChange={v => {
                            if (!v || (!v.start && !v.end)) {
                              table.getColumn('scheduledDate')?.setFilterValue(undefined);
                              console.log('Setting scheduledDate filter to undefined');
                            } else {
                              const filterVal = {
                                start: v.start?.toDate(getLocalTimeZone()).getTime(),
                                end: v.end?.toDate(getLocalTimeZone()).getTime()
                              };
                              if (filterVal.start && filterVal.end === filterVal.start) {
                                filterVal.end = new Date(filterVal.start).setHours(23, 59, 59, 999);
                              }
                              console.log('Setting scheduledDate filter:', filterVal);
                              table.getColumn('scheduledDate')?.setFilterValue(filterVal);
                            }
                          }}
                        />
                      </Popover.Content>
                    </Popover.Root>
                  {:else if header.column.id === 'status'}
                    <DropdownMenu.Root bind:open={statusDropdownOpen}>
                      <DropdownMenu.Trigger>
                        <Button variant="outline" size="sm" class="w-full justify-start">
                          {#if statusFilter !== ''}
                            <Badge variant="secondary">{statusFilter}</Badge>
                          {:else}
                            <Funnel class="inline w-4 h-4 mr-1 align-text-bottom" />
                          {/if}
                        </Button>
                      </DropdownMenu.Trigger>
                      <DropdownMenu.Content class="w-48">
                        <DropdownMenu.Label>Filtrar por Status</DropdownMenu.Label>
                        <DropdownMenu.Separator />
                        <DropdownMenu.RadioGroup bind:value={statusFilter}>
                          {#each possibleStatus as status (status)}
                            <DropdownMenu.RadioItem
                              value={status}
                              onSelect={() => {
                                statusDropdownOpen = false;
                              }}
                            >
                              {status}
                            </DropdownMenu.RadioItem>
                          {/each}
                        </DropdownMenu.RadioGroup>
                        {#if statusFilter !== ''}
                          <DropdownMenu.Separator />
                          <DropdownMenu.Item
                            onSelect={() => {
                              statusFilter = '';
                              console.log('Status filter state cleared to \'\', $effect will apply undefined.');
                              statusDropdownOpen = false;
                            }}>
                            Limpar Filtro
                          </DropdownMenu.Item>
                        {/if}
                      </DropdownMenu.Content>
                    </DropdownMenu.Root>
                  {:else}
                    <!-- Coluna sem filtro (ex: Tipo, Ações) -->
                  {/if}
                </Table.Head>
              {/each}
            </Table.Row>
          {/each}
        </Table.Header>
        <Table.Body>
          {#each table.getRowModel().rows as row (row.id)}
            <Table.Row data-state={row.getIsSelected() && 'selected'}>
              {#each row.getVisibleCells() as cell (cell.id)}
                <Table.Cell class={cell.column.id === 'item' ? 'w-56 max-w-xs truncate whitespace-nowrap' : ''}>
                  {#if cell.column.id === 'type'}
                    {@const typeValue = cell.getValue() as string}
                    {#if typeValue}
                      {#if typeValue === "Ler Mais Tarde"}
                        <Clock class="inline w-4 h-4 mr-1 align-text-bottom text-blue-500" />
                      {:else}
                        <Bookmark class="inline w-4 h-4 mr-1 align-text-bottom text-yellow-500" />
                      {/if}
                    {:else}
                      <span>-</span>
                    {/if}
                  {:else}
                    <!-- Renderização padrão da célula -->
                    <FlexRender content={cell.column.columnDef.cell} context={cell.getContext()} />
                  {/if}
                </Table.Cell>
              {/each}
            </Table.Row>
            {#if row.getIsExpanded()}
              {@const reactiveItem = $savedItems.find(item => item.id === row.original.id)}
              <Table.Row>
                <Table.Cell colspan={columns.length} class="bg-muted/40 p-0">
                  <div class="p-4">
                    <Card class="w-full">
                      <CardHeader>
                        <CardTitle level={4}>{row.original.title}</CardTitle>
                        <div class="flex items-center gap-2 mt-1">
                          <a href={row.original.url} target="_blank" class="text-xs text-primary underline break-all">{row.original.url}</a>
                          <span class="text-xs text-muted-foreground ml-2">ID: {row.original.id}</span>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div class="flex flex-wrap gap-2 mb-4">
                          <!-- Dialog de Notas -->
                          <Dialog.Root>
                            <Dialog.Trigger>
                              <Button size="sm" variant="outline">Ver Notas</Button>
                            </Dialog.Trigger>
                            <Dialog.Content class="max-w-lg w-full">
                              <Dialog.Title>Notas associadas</Dialog.Title>
                              {#if reactiveItem?.noteIds?.length}
                                {#each notes() as note (note.id)}
                                  {#if reactiveItem.noteIds.includes(note.id)}
                                    <NoteCard {note} showActions={false} />
                                  {/if}
                                {/each}
                              {:else}
                                <div class="text-xs text-muted-foreground">Nenhuma nota associada.</div>
                              {/if}
                            </Dialog.Content>
                          </Dialog.Root>
                          <!-- Dialog de Flashcards -->
                          <Dialog.Root>
                            <Dialog.Trigger>
                              <Button size="sm" variant="outline">Ver Flashcards</Button>
                            </Dialog.Trigger>
                            <Dialog.Content class="max-w-lg w-full">
                              <Dialog.Title>Flashcards associados</Dialog.Title>
                              {#if reactiveItem?.flashcardIds?.length}
                                {#each flashcards() as flashcard (flashcard.id)}
                                  {#if reactiveItem.flashcardIds.includes(flashcard.id)}
                                    <FlashcardCard card={flashcard} showActions={false} />
                                  {/if}
                                {/each}
                              {:else}
                                <div class="text-xs text-muted-foreground">Nenhum flashcard associado.</div>
                              {/if}
                            </Dialog.Content>
                          </Dialog.Root>
                          <!-- Dialog de Comentário -->
                          <Dialog.Root>
                            <Dialog.Trigger>
                              <Button size="sm" variant="outline" onclick={() => editingComment[row.original.id] = reactiveItem?.comments || ""}>Editar Comentário</Button>
                            </Dialog.Trigger>
                            <Dialog.Content class="max-w-md w-full">
                              <Dialog.Title>Editar Comentário</Dialog.Title>
                              <form onsubmit={(e) => { e.preventDefault(); }}>
                                <textarea bind:value={editingComment[row.original.id]} class="w-full p-2 rounded border border-gray-300 dark:border-gray-700 dark:bg-gray-900 h-24 resize-none mb-2"></textarea>
                                <div class="flex gap-2 justify-end">
                                  <Button type="submit" size="sm">Salvar</Button>
                                  <Button type="button" size="sm" variant="outline" onclick={() => { }}>Cancelar</Button>
                                </div>
                              </form>
                            </Dialog.Content>
                          </Dialog.Root>
                          <!-- Dialog de Grupos/Tags -->
                          <Dialog.Root>
                            <Dialog.Trigger>
                              <Button size="sm" variant="outline">Gerenciar Grupos/Tags</Button>
                            </Dialog.Trigger>
                            <Dialog.Content class="max-w-md w-full">
                              <Dialog.Title>Gerenciar Grupos e Tags</Dialog.Title>
                              <div class="mb-2">
                                <span class="font-medium text-xs text-muted-foreground">Grupos:</span>
                                <!-- Exibir e permitir edição dos grupos -->
                              </div>
                              <div>
                                <span class="font-medium text-xs text-muted-foreground">Tags:</span>
                                <!-- Exibir e permitir edição das tags -->
                              </div>
                            </Dialog.Content>
                          </Dialog.Root>
                        </div>
                        {#if reactiveItem?.comments}
                          <div class="mb-2">
                            <span class="font-medium text-xs text-muted-foreground">Comentário:</span>
                            <div class="text-sm mt-1">{reactiveItem.comments}</div>
                          </div>
                        {/if}
                        <div class="flex flex-wrap gap-2 mb-2">
                          <span class="font-medium text-xs text-muted-foreground">Grupos:</span>
                          {#if reactiveItem && reactiveItem.groupIds && reactiveItem.groupIds.length > 0}
                            {#each reactiveItem.groupIds as gid (gid)}
                              {@const groupInfo = $groupsStore.find((g: Group) => g.id === gid)}
                              {#if groupInfo}
                                <Badge variant="secondary" style={groupInfo.color ? `background-color: ${groupInfo.color}` : ''}>
                                  {groupInfo.name}
                                </Badge>
                              {:else}
                                <Badge variant="outline">{gid}</Badge>
                              {/if}
                            {/each}
                          {:else}
                            <span class="text-xs text-muted-foreground">Nenhum</span>
                          {/if}
                        </div>
                        <div class="flex flex-wrap gap-2 mb-2">
                          <span class="font-medium text-xs text-muted-foreground">Tags:</span>
                          {#if reactiveItem && reactiveItem.tags && reactiveItem.tags.length > 0}
                            {#each reactiveItem.tags as tag (tag)}
                              <Badge variant="outline">{tag}</Badge>
                            {/each}
                          {:else}
                            <span class="text-xs text-muted-foreground">Nenhuma</span>
                          {/if}
                        </div>
                        <div class="flex flex-wrap gap-4 mt-2 text-xs text-muted-foreground">
                          <span>Criado em: {new Date(row.original.dateAdded).toLocaleString('pt-BR')}</span>
                          <span>Notas: {reactiveItem?.noteIds?.length || 0}</span>
                          <span>Flashcards: {reactiveItem?.flashcardIds?.length || 0}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </Table.Cell>
              </Table.Row>
            {/if}
          {:else}
            <Table.Row>
              <Table.Cell colspan={columns.length} class="h-24 text-center">
                Nenhum resultado.
              </Table.Cell>
            </Table.Row>
          {/each}
        </Table.Body>
      </Table.Root>
    </div>
  </div>

  <!-- Rodapé Dinâmico com Ações em Lote (agora fixo na parte inferior) -->
  <div class="flex items-center justify-between text-sm mt-4 shrink-0">
    {#if selectedItemCount > 0}
      <div class="flex items-center gap-2 flex-wrap">
        <span class="text-muted-foreground font-medium">
          {selectedItemCount} selecionado(s)
        </span>
        <!-- Botões de Ação em Lote -->
        <Button variant="destructive" size="sm" onclick={handleBulkDelete}>
          <Trash2 class="w-4 h-4 mr-1"/> Excluir
        </Button>
        <Button variant="outline" size="sm" onclick={openBulkGroupDialog}>
          <Folder class="w-4 h-4 mr-1"/> Alterar Grupos
        </Button>
        <Button variant="outline" size="sm" onclick={openBulkTagDialog}>
          <Tags class="w-4 h-4 mr-1"/> Alterar Tags
        </Button>
        <!-- Botão Abrir com Dropdown (Sintaxe corrigida) -->
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            <Button variant="outline" size="sm">
              <ExternalLink class="w-4 h-4 mr-1"/> Abrir em...
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content>
            <DropdownMenu.Item onSelect={() => handleBulkOpen('current')}>Aba(s) na Janela Atual</DropdownMenu.Item>
            <DropdownMenu.Item onSelect={() => handleBulkOpen('new')}>Nova Janela</DropdownMenu.Item>
            <DropdownMenu.Item onSelect={() => handleBulkOpen('incognito')}>Nova Janela Anônima</DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </div>
    {:else}
      <span class="text-muted-foreground">
        {table.getFilteredRowModel().rows.length} item(ns) exibido(s).
      </span>
      <!-- Pode adicionar paginação aqui futuramente -->
    {/if}
    <!-- Elementos adicionais do rodapé (ex: paginação) podem ir aqui -->
    <div>
      <!-- Controles de Paginação (a serem implementados) -->
    </div>
  </div>

</div> <!-- Fim do container flex principal -->

<!-- PLACEHOLDERS PARA DIÁLOGOS -->
<AlertDialog.Root bind:open={isDeleteDialogOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Confirmar Exclusão</AlertDialog.Title>
      <AlertDialog.Description>
        Tem certeza que deseja excluir {selectedItemCount} item(ns) selecionado(s)? Esta ação não pode ser desfeita.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancelar</AlertDialog.Cancel>
      <!-- Corrigido: Aplicar variant diretamente na Action -->
      <AlertDialog.Action onclick={confirmBulkDelete}>Excluir</AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

<!-- Componente real para BulkGroupAssignDialog -->
<BulkGroupAssignDialog
  bind:open={isBulkGroupDialogOpen} 
  itemCount={selectedItemCount}
  onUpdate={handleBulkGroupUpdate} 
/>

<!-- Componente real para BulkTagAssignDialog -->
<BulkTagAssignDialog 
  bind:open={isBulkTagDialogOpen}
  itemCount={selectedItemCount}
  onUpdate={handleBulkTagUpdate}
/> 