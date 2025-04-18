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

  let { columns = [], data = [] } = $props();

  let rowSelection = $state({});

  // Filtros por coluna
  let itemFilter = $state('');
  let typeFilter = $state('');
  let groupFilter = $state<string[]>([]);
  let tagFilter = $state<string[]>([]);
  let noteFilter = $state('');
  let flashcardFilter = $state('');
  let dateFilter = $state<DateRange | undefined>(undefined);
  let datePopoverOpen = $state(false);
  let groupDialogOpen = $state(false);
  let tagDialogOpen = $state(false);

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

  // Função de filtragem
  function filterRows(row: { original: SavedItem }) {
    if (itemFilter && !(row.original.title?.toLowerCase().includes(itemFilter.toLowerCase()) || row.original.url?.toLowerCase().includes(itemFilter.toLowerCase()))) {
      return false;
    }
    if (typeFilter && typeFilter !== 'all') {
      if (typeFilter === 'bookmark' && row.original.readLater) return false;
      if (typeFilter === 'readlater' && !row.original.readLater) return false;
    }
    if (groupFilter.length > 0 && !groupFilter.some(gid => row.original.groupIds?.includes(gid))) {
      return false;
    }
    if (tagFilter.length > 0 && !tagFilter.some(tag => row.original.tags?.includes(tag))) {
      return false;
    }
    if (noteFilter && String(row.original.noteIds?.length || 0) !== noteFilter) {
      return false;
    }
    if (flashcardFilter && String(row.original.flashcardIds?.length || 0) !== flashcardFilter) {
      return false;
    }
    if (dateFilter && row.original.dateAdded && dateFilter.start && dateFilter.end) {
      const itemDate = new Date(row.original.dateAdded);
      const start = dateFilter.start.toDate(getLocalTimeZone());
      const end = dateFilter.end.toDate(getLocalTimeZone());
      if (itemDate < start || itemDate > end) return false;
    }
    return true;
  }

  const table = createSvelteTable({
    data,
    columns,
    state: {
      get rowSelection() {
        return rowSelection;
      },
    },
    onRowSelectionChange: (updater) => {
      if (typeof updater === 'function') {
        rowSelection = updater(rowSelection);
      } else {
        rowSelection = updater;
      }
    },
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: undefined, // será resolvido automaticamente
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
</script>

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
                  <input type="text" placeholder="Filtrar..." class="input input-xs w-full" bind:value={itemFilter} />
                {:else if header.column.id === 'readLater'}
                  <!-- Será substituído pelo ToggleGroup depois -->
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
        {#each table.getRowModel().rows.filter(filterRows) as row (row.id)}
          <Table.Row data-state={row.getIsSelected() && 'selected'}>
            {#each row.getVisibleCells() as cell (cell.id)}
              <Table.Cell class={cell.column.id === 'item' ? 'w-56 max-w-xs truncate whitespace-nowrap' : ''}>
                <FlexRender content={cell.column.columnDef.cell} context={cell.getContext()} />
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
  {table.getFilteredSelectedRowModel().rows.length} de {table.getFilteredRowModel().rows.length} linha(s) selecionada(s).
</div> 