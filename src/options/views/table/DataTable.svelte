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
  import { groups as groupsStore, knownTags as tagsStore } from '../../../storage';
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
  import { notes as notesStore, flashcards as flashcardsStore } from '../../../storage';
  import NoteCard from '../../../lib/components/NoteCard.svelte';
  import FlashcardCard from '../../../lib/components/FlashcardCard.svelte';
  import Input from '../../../lib/components/ui/input/input.svelte';
  import * as Select from "../../../lib/components/ui/select/index.js";
  import CalendarSearch from '@lucide/svelte/icons/calendar-search';
  let { columns = [], data = [], typeFilter = 'all' } = $props();

  let rowSelection = $state({});
  let sorting = $state<SortingState>([]);
  let expanded = $state({});

  // Filtros por coluna
  let itemFilter = $state('');
  let groupFilter = $state<string[]>([]);
  let tagFilter = $state<string[]>([]);
  let noteFilter = $state('');
  let flashcardFilter = $state('');
  let dateFilter = $state<DateRange | undefined>(undefined);
  let datePopoverOpen = $state(false);
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

  let filteredByType = $derived(() => {
    if (typeFilter === 'all') return data;
    if (typeFilter === 'readlater') return data.filter((item: SavedItem) => item.scheduledDate);
    if (typeFilter === 'bookmark') return data.filter((item: SavedItem) => !item.scheduledDate);
    return data;
  });

  $effect(() => {
    if (datePopoverOpen && dateFilter) {
      datePopoverOpen = false;
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
    if (!filter) return 'Filtrar por data!';
    const start = filter.start?.toDate(getLocalTimeZone());
    const end = filter.end?.toDate(getLocalTimeZone());
    if (!start) return 'Filtrar por data!';
    if (end && end.getTime() !== start.getTime()) {
      return `${start.toLocaleDateString('pt-BR')} - ${end.toLocaleDateString('pt-BR')}`;
    }
    return start.toLocaleDateString('pt-BR');
  }

  let filteredRows = $derived(() => {
    // Força rastreamento de dependências
    const _allRows = table.getFilteredRowModel().rows;
    const _type = typeFilter;
    _allRows.length; // força dependência
    return _allRows.filter(row => {
      if (_type === 'all') return true;
      if (_type === 'readlater') return row.original.scheduledDate;
      if (_type === 'bookmark') return !row.original.scheduledDate;
      return true;
    });
  });

  let filteredSelectedRows = $derived(() => {
    const _selectedRows = table.getFilteredSelectedRowModel().rows;
    const _type = typeFilter;
    _selectedRows.length;
    return _selectedRows.filter(row => {
      if (_type === 'all') return true;
      if (_type === 'readlater') return row.original.scheduledDate;
      if (_type === 'bookmark') return !row.original.scheduledDate;
      return true;
    });
  });

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
                  <input type="text" placeholder="# Notas" class="input input-xs w-full" bind:value={noteFilter} />
                {:else if header.column.id === 'flashcardIds'}
                  <input type="text" placeholder="# Flashcards" class="input input-xs w-full" bind:value={flashcardFilter} />
                {:else if header.column.id === 'dateAdded'}
                  <Popover.Root>
                    <Popover.Trigger>
                      <Button variant="outline" size="sm" class="w-full justify-start">
                        {#if dateFilter}
                          {formatDate(dateFilter)}
                        {:else}
                          <CalendarSearch class="inline w-4 h-4 mr-1 align-text-bottom" />
                        {/if}
                      </Button>
                    </Popover.Trigger>
                    <Popover.Content align="end" class="p-0">
                      <RangeCalendar bind:value={dateFilter} onValueChange={v => table.getColumn('dateAdded')?.setFilterValue(v)} />
                      <!-- {JSON.stringify(dateFilter)} -->
                      <!-- {#if dateFilter}
                        {@const start = dateFilter.start?.toDate(getLocalTimeZone())}
                        {@const end = dateFilter.end?.toDate(getLocalTimeZone())}
                        {"START: " + JSON.stringify(start)}
                        {"END: " + JSON.stringify(end)}
                      {/if} -->
                    </Popover.Content>
                  </Popover.Root>
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
                            {#each notes() as note (note.id)}
                              {#if row.original.noteIds.includes(note.id)}
                                <NoteCard {note} showActions={false} />
                              {/if}
                            {:else}
                              <div class="text-xs text-muted-foreground">Nenhuma nota associada.</div>
                            {/each}
                          </Dialog.Content>
                        </Dialog.Root>
                        <!-- Dialog de Flashcards -->
                        <Dialog.Root>
                          <Dialog.Trigger>
                            <Button size="sm" variant="outline">Ver Flashcards</Button>
                          </Dialog.Trigger>
                          <Dialog.Content class="max-w-lg w-full">
                            <Dialog.Title>Flashcards associados</Dialog.Title>
                            {#each flashcards() as flashcard (flashcard.id)}
                              {#if row.original.flashcardIds.includes(flashcard.id)}
                                <FlashcardCard card={flashcard} showActions={false} />
                              {/if}
                            {:else}
                              <div class="text-xs text-muted-foreground">Nenhum flashcard associado.</div>
                            {/each}
                          </Dialog.Content>
                        </Dialog.Root>
                        <!-- Dialog de Comentário -->
                        <Dialog.Root>
                          <Dialog.Trigger>
                            <Button size="sm" variant="outline" onclick={() => editingComment[row.original.id] = row.original.comments || ""}>Editar Comentário</Button>
                          </Dialog.Trigger>
                          <Dialog.Content class="max-w-md w-full">
                            <Dialog.Title>Editar Comentário</Dialog.Title>
                            <form onsubmit={(e) => { e.preventDefault(); row.original.comments = editingComment[row.original.id]; }}>
                              <textarea bind:value={editingComment[row.original.id]} class="w-full p-2 rounded border border-gray-300 dark:border-gray-700 dark:bg-gray-900 h-24 resize-none mb-2"></textarea>
                              <div class="flex gap-2 justify-end">
                                <Button type="submit" size="sm">Salvar</Button>
                                <Button type="button" size="sm" variant="outline" onclick={() => { /* fechar dialog manualmente se necessário */ }}>Cancelar</Button>
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
                      {#if row.original.comments}
                        <div class="mb-2">
                          <span class="font-medium text-xs text-muted-foreground">Comentário:</span>
                          <div class="text-sm mt-1">{row.original.comments}</div>
                        </div>
                      {/if}
                      <div class="flex flex-wrap gap-2 mb-2">
                        <span class="font-medium text-xs text-muted-foreground">Grupos:</span>
                        {#if row.original.groupIds.length === 0}
                          <span class="text-xs text-muted-foreground">Nenhum</span>
                        {:else}
                          {#each row.original.groupIds as gid (gid)}
                            {#if groups().find(g => g.id === gid)}
                              <Badge variant="secondary" style={groups().find(g => g.id === gid)?.color ? `background-color: ${groups().find(g => g.id === gid)?.color}` : ''}>
                                {groups().find(g => g.id === gid)?.name}
                              </Badge>
                            {:else}
                              <Badge variant="outline">{gid}</Badge>
                            {/if}
                          {/each}
                        {/if}
                      </div>
                      <div class="flex flex-wrap gap-2 mb-2">
                        <span class="font-medium text-xs text-muted-foreground">Tags:</span>
                        {#if row.original.tags.length === 0}
                          <span class="text-xs text-muted-foreground">Nenhuma</span>
                        {:else}
                          {#each row.original.tags as tag (tag)}
                            <Badge variant="outline">{tag}</Badge>
                          {/each}
                        {/if}
                      </div>
                      <div class="flex flex-wrap gap-4 mt-2 text-xs text-muted-foreground">
                        <span>Criado em: {new Date(row.original.dateAdded).toLocaleString('pt-BR')}</span>
                        <span>Notas: {row.original.noteIds.length}</span>
                        <span>Flashcards: {row.original.flashcardIds.length}</span>
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
  {filteredSelectedRows().length} de {filteredRows().length} linha(s) selecionada(s).
</div> 