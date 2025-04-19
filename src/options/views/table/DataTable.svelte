<script lang="ts">
  import { createSvelteTable } from '../../../lib/components/ui/data-table/index';
  import * as Table from '../../../lib/components/ui/table/index';
  import { FlexRender } from '../../../lib/components/ui/data-table/index';
  import type { ColumnDef } from '@tanstack/table-core';
  import { getCoreRowModel } from '@tanstack/table-core';
  import * as Popover from '../../../lib/components/ui/popover/index';
  import Calendar from '../../../lib/components/ui/calendar/calendar.svelte';
  import Button from '../../../lib/components/ui/button/button.svelte';
  import GroupFilterDialog from '../../components/GroupFilterDialog.svelte';
  import TagFilterDialog from '../../components/TagFilterDialog.svelte';
  import Badge from '../../../lib/components/ui/badge/badge.svelte';
  import type { SavedItem, Group } from '../../../types';
  import { groups as groupsStore, knownTags as tagsStore } from '../../../storage';
  import { getLocalTimeZone, today } from "@internationalized/date";
  import type { DateRange } from 'bits-ui';
  import { RangeCalendar } from '../../../lib/components/ui/range-calendar/index.js';
  import Bookmark from '@lucide/svelte/icons/bookmark';
  import Clock from '@lucide/svelte/icons/clock';
  import * as ToggleGroup from '../../../lib/components/ui/toggle-group/index';
  import ChevronUp from '@lucide/svelte/icons/chevron-up';
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import ArrowUpDown from '@lucide/svelte/icons/arrow-up-down';

  let { columns = [], data = [] } = $props();

  let rowSelection = $state({});

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
  let typeFilter = $state<'all' | 'readlater' | 'bookmark'>('all');

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

  let columnVisibility = $state<{ [key: string]: boolean }>({});

  const table = createSvelteTable({
    data,
    columns,
    state: {
      get rowSelection() { return rowSelection; },
      get columnVisibility() { return columnVisibility; },
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
        columnVisibility = updater(columnVisibility);
      } else {
        columnVisibility = updater;
      }
    },
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: undefined, // será resolvido automaticamente
  });

  $effect(() => {
    const col = table.getColumn('type');
    if (col) {
      const shouldBeVisible = typeFilter === 'all';
      if (col.getIsVisible() !== shouldBeVisible) {
        col.toggleVisibility(shouldBeVisible);
      }
    }
  });

  function formatDate(filter: DateRange | undefined) {
    if (!filter) return 'Filtrar por data';
    const start = filter.start?.toDate(getLocalTimeZone());
    const end = filter.end?.toDate(getLocalTimeZone());
    if (!start) return 'Filtrar por data';
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
</script>

<div class="flex items-center gap-2 mb-2">
  <span class="font-medium text-sm">Tipo:</span>
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

<div class="w-full overflow-x-auto">
  <div class="rounded-md border min-w-full">
    <Table.Root class="min-w-full">
      <Table.Header>
        {#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
          <Table.Row>
            {#each headerGroup.headers as header (header.id)}
              <Table.Head class={header.column.id === 'item' ? 'w-56 max-w-xs truncate whitespace-nowrap' : ''}>
                {#if !header.isPlaceholder}
                  {#if header.column.getCanSort?.()}
                    <button
                      type="button"
                      class="flex items-center gap-1 select-none cursor-pointer group text-left w-full"
                      onclick={header.column.getToggleSortingHandler?.()}
                      aria-label="Ordenar coluna"
                    >
                      <FlexRender content={header.column.columnDef.header} context={header.getContext()} />
                      {#if header.column.getIsSorted?.() === 'asc'}
                        <ChevronUp class="w-4 h-4 text-primary group-hover:text-primary-foreground transition-colors" />
                      {:else if header.column.getIsSorted?.() === 'desc'}
                        <ChevronDown class="w-4 h-4 text-primary group-hover:text-primary-foreground transition-colors" />
                      {:else}
                        <ArrowUpDown class="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      {/if}
                    </button>
                  {:else}
                    <FlexRender content={header.column.columnDef.header} context={header.getContext()} />
                  {/if}
                {/if}
              </Table.Head>
            {/each}
          </Table.Row>
          <!-- Linha de filtros -->
          <Table.Row>
            {#each headerGroup.headers as header (header.id)}
              <Table.Head class={header.column.id === 'item' ? 'w-56 max-w-xs truncate whitespace-nowrap' : ''}>
                {#if header.column.id === 'item'}
                  <input type="text" placeholder="Filtrar..." class="input input-xs w-full" bind:value={itemFilter} />
                {:else if header.column.id === 'groupIds'}
                  <Button variant="outline" size="sm" class="w-full justify-start" onclick={() => groupDialogOpen = true}>
                    {#if groupFilter.length === 0}
                      Filtrar grupo
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
                    onApply={(e) => { groupFilter = e.included; groupDialogOpen = false; }}
                  />
                {:else if header.column.id === 'tags'}
                  <Button variant="outline" size="sm" class="w-full justify-start" onclick={() => tagDialogOpen = true}>
                    {#if tagFilter.length === 0}
                      Filtrar tag
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
                    onApply={(e) => { tagFilter = e.included; tagDialogOpen = false; }}
                  />
                {:else if header.column.id === 'noteIds'}
                  <input type="text" placeholder="# Notas" class="input input-xs w-full" bind:value={noteFilter} />
                {:else if header.column.id === 'flashcardIds'}
                  <input type="text" placeholder="# Flashcards" class="input input-xs w-full" bind:value={flashcardFilter} />
                {:else if header.column.id === 'dateAdded'}
                  <Popover.Root>
                    <Popover.Trigger>
                      <Button variant="outline" size="sm" class="w-full justify-start">
                        {formatDate(dateFilter)}
                      </Button>
                    </Popover.Trigger>
                    <Popover.Content align="end" class="p-0">
                      <RangeCalendar bind:value={dateFilter} />
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
        {#each filteredRows() as row (row.id)}
          <Table.Row data-state={row.getIsSelected() && 'selected'}>
            {#each row.getVisibleCells() as cell (cell.id)}
              <Table.Cell class={cell.column.id === 'item' ? 'w-56 max-w-xs truncate whitespace-nowrap' : ''}>
                {#if cell.column.id === 'type'}
                  {@const typeValue = cell.getValue() as { isReadLater: boolean; typeLabel: string } | undefined}
                    {#if typeValue}
                      {#if typeValue.isReadLater}
                        <Clock class="inline w-4 h-4 mr-1 align-text-bottom text-blue-500" />
                      {:else}
                        <Bookmark class="inline w-4 h-4 mr-1 align-text-bottom text-yellow-500" />
                      {/if}
                      <!-- <span>{typeValue.typeLabel}</span> -->
                    {:else}
                      <span>-</span>
                  {/if}
                {:else}
                  <FlexRender content={cell.column.columnDef.cell} context={cell.getContext()} />
                {/if}
              </Table.Cell>
            {/each}
          </Table.Row>
          {#if row.getIsExpanded()}
            <Table.Row>
              <Table.Cell colspan={columns.length} class="bg-muted/40 text-muted-foreground text-sm p-4">
                Detalhes do item...
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