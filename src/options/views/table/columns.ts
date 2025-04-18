import type { ColumnDef } from '@tanstack/table-core';
import type { SavedItem } from '../../../types';
import { renderComponent } from '../../../lib/components/ui/data-table/index';
import DataTableCheckbox from './data-table-checkbox.svelte';
import DataTableActions from './data-table-actions.svelte';
import ItemCell from './ItemCell.svelte';
import ExpandButton from './ExpandButton.svelte';

function formatDate(date: number) {
  return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export const columns: ColumnDef<SavedItem, any>[] = [
  {
    id: 'expand',
    header: '',
    cell: ({ row }) => renderComponent(ExpandButton, { row }),
    enableSorting: false,
    enableHiding: false,
    size: 32,
    minSize: 32,
    maxSize: 32,
  },
  {
    id: 'select',
    header: ({ table }) =>
      renderComponent(DataTableCheckbox, {
        checked: table.getIsAllPageRowsSelected(),
        indeterminate: table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected(),
        onCheckedChange: (value: boolean) => table.toggleAllPageRowsSelected(!!value),
        'aria-label': 'Selecionar todos',
      }),
    cell: ({ row }) =>
      renderComponent(DataTableCheckbox, {
        checked: row.getIsSelected(),
        onCheckedChange: (value: boolean) => row.toggleSelected(!!value),
        'aria-label': 'Selecionar linha',
      }),
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: 'item',
    header: 'Item',
    cell: ({ row }) => renderComponent(ItemCell, { item: row.original }),
  },
  {
    accessorKey: 'readLater',
    header: 'Ler Mais Tarde',
    cell: ({ row }) => row.original.readLater ? 'Sim' : 'Não',
  },
  {
    accessorKey: 'groupIds',
    header: 'Grupos',
    cell: ({ row }) => row.original.groupIds?.length || 0,
  },
  {
    accessorKey: 'tags',
    header: 'Tags',
    cell: ({ row }) => row.original.tags?.length || 0,
  },
  {
    accessorKey: 'noteIds',
    header: 'Notas',
    cell: ({ row }) => row.original.noteIds?.length || 0,
  },
  {
    accessorKey: 'flashcardIds',
    header: 'Flashcards',
    cell: ({ row }) => row.original.flashcardIds?.length || 0,
  },
  {
    accessorKey: 'dateAdded',
    header: 'Criado em',
    cell: ({ row }) => formatDate(row.original.dateAdded),
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => renderComponent(DataTableActions, { id: row.original.id }),
    enableSorting: false,
    enableHiding: false,
  },
]; 