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
  import Checkbox from '../../../lib/components/ui/checkbox/checkbox.svelte';
  import { fly } from 'svelte/transition';

  let { columns = [], data = [] } = $props();

  let typeFilter = $state('all');

  let rowSelection = $state({});
  let sorting = $state<SortingState>([]);
  let expanded = $state({});

  // Filtros por coluna
  let itemFilter = $state('');
  let groupFilter = $state<string[]>([]);
  let tagFilter = $state<string[]>([]);
  let dateFilter = $state<DateRange | undefined>(undefined);
  let scheduledDateFilter = $state<DateRange | undefined>(undefined);
  let statusFilter = $state<string[]>([]);
  let datePopoverOpen = $state(false);
  let scheduledDatePopoverOpen = $state(false);
  let statusDropdownOpen = $state(false);
  let groupDialogOpen = $state(false);
  let tagDialogOpen = $state(false);
  let searchScope: 'title' | 'url' | 'groups' | 'tags' | 'comment' = $state('title');

  // Dados para dialogs (arrays reativos)
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
    if (datePopoverOpen && dateFilter) {
      datePopoverOpen = false;
    }
  });

  $effect(() => {
    if (scheduledDatePopoverOpen && scheduledDateFilter) {
      scheduledDatePopoverOpen = false;
    }
  });

  $effect(() => {
    const current = table.getColumn('dateAdded')?.getFilterValue();
    if ((!dateFilter || (!dateFilter.start && !dateFilter.end)) && current !== undefined) {
      table.getColumn('dateAdded')?.setFilterValue(undefined);
    }
  });

  $effect(() => {
    const current = table.getColumn('scheduledDate')?.getFilterValue();
    const filterStartTs = scheduledDateFilter?.start?.toDate(getLocalTimeZone()).getTime();
    const filterEndTs = scheduledDateFilter?.end?.toDate(getLocalTimeZone()).getTime();

    if ((!scheduledDateFilter || (!filterStartTs && !filterEndTs)) && current !== undefined) {
       console.log('Limpando filtro scheduledDate da coluna', current);
       table.getColumn('scheduledDate')?.setFilterValue(undefined);
     }
  });

  // NOVO EFEITO para aplicar o filtro de tipo à coluna da tabela
  $effect(() => {
    // Obtém a coluna 'type'
    const typeColumn = table.getColumn('type');
    if (typeColumn) {
      // Define o valor do filtro para a coluna 'type'
      // Se 'all', passa undefined para limpar o filtro desta coluna
      // Caso contrário, passa o valor 'bookmark' ou 'readlater'
      // typeColumn.setFilterValue(typeFilter === 'all' ? undefined : typeFilter);
      // console.log(`Applying type filter to column: ${typeFilter === 'all' ? undefined : typeFilter}`);

      // Determina o novo valor de filtro desejado com base no estado
      const newFilterValue = typeFilter === 'all' ? undefined : typeFilter;
      // Obtém o valor de filtro atualmente aplicado à coluna
      const currentFilterValue = typeColumn.getFilterValue();

      // SOMENTE atualiza o filtro da coluna se o novo valor for diferente do atual
      if (newFilterValue !== currentFilterValue) {
        console.log(`Applying type filter. Current: ${currentFilterValue}, New: ${newFilterValue}`);
        typeColumn.setFilterValue(newFilterValue);
      }
      // else { // Opcional: Log para ver quando a atualização é pulada
      //   console.log(`Skipping type filter update. Current: ${currentFilterValue}, New: ${newFilterValue} (already applied)`);
      // }
    }
  });

  let columnVisibilityState = $state<{ [key: string]: boolean }>({});
  let columnVisibility = $derived(() => ({
    type: typeFilter === 'all',
    scheduledDate: typeFilter === 'readlater',
    status: typeFilter === 'readlater',
  }));

  let globalFilter = $state('');

  // Novo estado para filtro global composto
  let globalFilterObj = $derived(() => ({ value: globalFilter, scope: searchScope }));

  // Função de filtro global baseada no escopo
  function globalFilterFn(
    row: { original: SavedItem },
    columnId: string,
    filterValue: any
  ) {
    // filterValue: { value: string, scope: string }
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
        // Buscar pelo nome do grupo, não pelo id
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
    // Checagem defensiva para evitar erro de never
    return false;
  }

  let columnFilters = $state<{ id: string; value: any }[]>([]);

  const table = createSvelteTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    globalFilterFn, // Passa a função customizada
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

  // Definir opções para o Select
  const searchScopeOptions = [
    { value: "title", label: "Título" },
    { value: "url", label: "URL" },
    { value: "groups", label: "Grupos" },
    { value: "tags", label: "Tags" },
    { value: "comment", label: "Comentário" }
  ];

  // Estado derivado para o texto do Trigger
  const selectedScopeLabel = $derived(
    searchScopeOptions.find((opt) => opt.value === searchScope)?.label ?? "Buscar em..."
  );

  // Registrar para uso em renderComponent
  const _ = { DialogButtonNotas, DialogButtonFlashcards };

  // Lista de status possíveis para o filtro (baseado em columns.ts)
  const possibleStatus = ['Atrasado', 'Hoje', 'Agendado', 'Pendente', 'Não Agendado', 'Concluído'];
</script>

<div class="flex justify-between items-center gap-4 mb-4">
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
      <!-- {#if globalFilter}
        <button type="button" aria-label="Limpar busca" class="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary" onclick={() => globalFilter = ''}>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      {/if} -->
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

<div class="w-full overflow-x-auto">
  <div class="rounded-md border min-w-full">
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
          <!-- Linha de filtros -->
          <Table.Row>
            {#each headerGroup.headers as header (header.id)}
              <Table.Head class={header.column.id === 'item' ? 'w-56 max-w-xs truncate whitespace-nowrap' : ''}>
                {#if header.column.id === 'item'}
                  <!-- Filtro removido, busca global será usada -->
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
                              {#if statusFilter.length > 0}
                                  <div class="flex flex-wrap gap-1">
                                      {#each statusFilter as status (status)}
                                          <Badge variant="secondary">{status}</Badge>
                                      {/each}
                                  </div>
                              {:else}
                                  <Funnel class="inline w-4 h-4 mr-1 align-text-bottom" />
                              {/if}
                          </Button>
                      </DropdownMenu.Trigger>
                      <DropdownMenu.Content class="w-48">
                          <DropdownMenu.Label>Filtrar por Status</DropdownMenu.Label>
                          <DropdownMenu.Separator />
                           {#each possibleStatus as status (status)}
                              <DropdownMenu.CheckboxItem>
                                  checked={statusFilter.includes(status)}
                                  onCheckedChange={() => {
                                      let updatedFilter;
                                      if (statusFilter.includes(status)) {
                                          updatedFilter = statusFilter.filter(s => s !== status);
                                      } else {
                                          updatedFilter = [...statusFilter, status];
                                      }
                                      statusFilter = updatedFilter;
                                      table.getColumn('status')?.setFilterValue(statusFilter.length > 0 ? statusFilter : undefined);
                                      console.log('Setting status filter:', statusFilter.length > 0 ? statusFilter : undefined);
                                  }}
                                  onSelect={(e: Event) => e.preventDefault()}
                                  {status}
                                </DropdownMenu.CheckboxItem>
                          {/each}
                          {#if statusFilter.length > 0}
                              <DropdownMenu.Separator />
                              <DropdownMenu.Item onSelect={() => { statusFilter = []; table.getColumn('status')?.setFilterValue(undefined); }}>Limpar Filtro</DropdownMenu.Item>
                          {/if}
                      </DropdownMenu.Content>
                  </DropdownMenu.Root>
                {:else}
                  <!-- Colunas sem filtro -->
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
                <!-- {JSON.stringify(cell)} -->
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
                {:else if cell.column.id === 'status'}
                  {@const status = cell.getValue() as string}
                  {#if status === 'Atrasado'}
                    <span class="px-2 py-1 rounded bg-red-500 text-white text-xs">Atrasado</span>
                  {:else if status === 'Pendente'}
                    <span class="px-2 py-1 rounded bg-yellow-500 text-white text-xs">Pendente</span>
                  {:else if status === 'Agendado'}
                    <span class="px-2 py-1 rounded bg-green-500 text-white text-xs">Agendado</span>
                  {/if}
                {:else}
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
                            <form onsubmit={(e) => { e.preventDefault(); /* Update store directly */ }}>
                              <textarea bind:value={editingComment[row.original.id]} class="w-full p-2 rounded border border-gray-300 dark:border-gray-700 dark:bg-gray-900 h-24 resize-none mb-2"></textarea>
                              <div class="flex gap-2 justify-end">
                                <Button type="submit" size="sm">Salvar</Button>
                                <Button type="button" size="sm" variant="outline" onclick={() => { /* close dialog */ }}>Cancelar</Button>
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
                            <!-- Aqui pode-se reutilizar a UI dos dialogs de grupos/tags dos cards -->
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
                            <!-- Correção: Usar $groupsStore e tipar 'g' -->
                            {@const groupInfo = $groupsStore.find((g: Group) => g.id === gid)}
                            {#if groupInfo}
                              <Badge variant="secondary" style={groupInfo.color ? `background-color: ${groupInfo.color}` : ''}>
                                {groupInfo.name}
                              </Badge>
                            {:else}
                              <Badge variant="outline">{gid}</Badge> <!-- Fallback -->
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

<div class="text-muted-foreground flex-1 text-sm mt-2">
  {table.getFilteredSelectedRowModel().rows.length} de {table.getRowModel().rows.length} linha(s) selecionada(s).
</div> 