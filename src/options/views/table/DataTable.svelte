<script lang="ts">
  import { createSvelteTable } from '../../../lib/components/ui/data-table/index';
  import * as Table from '../../../lib/components/ui/table/index';
  import { FlexRender } from '../../../lib/components/ui/data-table/index';
  import type { ColumnDef } from '@tanstack/table-core';
  import { getCoreRowModel } from '@tanstack/table-core';

  let { columns = [], data = [] } = $props();

  let rowSelection = $state({});

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
  });
</script>

<div class="rounded-md border">
  <Table.Root>
    <Table.Header>
      {#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
        <Table.Row>
          {#each headerGroup.headers as header (header.id)}
            <Table.Head>
              {#if !header.isPlaceholder}
                <FlexRender content={header.column.columnDef.header} context={header.getContext()} />
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
            <Table.Cell>
              <FlexRender content={cell.column.columnDef.cell} context={cell.getContext()} />
            </Table.Cell>
          {/each}
        </Table.Row>
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

<div class="text-muted-foreground flex-1 text-sm mt-2">
  {table.getFilteredSelectedRowModel().rows.length} de {table.getFilteredRowModel().rows.length} linha(s) selecionada(s).
</div> 