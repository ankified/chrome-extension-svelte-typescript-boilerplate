import type { ColumnDef } from '@tanstack/table-core';
import type { SavedItem } from '../../../types';
import { renderComponent } from '../../../lib/components/ui/data-table/index';
import DataTableCheckbox from './data-table-checkbox.svelte';
import DataTableActions from './data-table-actions.svelte';
import ItemCell from './ItemCell.svelte';
import ExpandButton from './ExpandButton.svelte';
import SortableHeader from './SortableHeader.svelte';
import ExpandAllButton from './ExpandAllButton.svelte';
import DropdownMenuHeaderButton from './DropdownMenuHeaderButton.svelte';
import Bookmark from '@lucide/svelte/icons/bookmark';
import Clock from '@lucide/svelte/icons/clock';

function formatDate(date: number) {
  return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getStatusPill(scheduledDate?: number) {
  if (!scheduledDate) return '';
  const now = Date.now();
  const isToday = new Date(scheduledDate).toDateString() === new Date(now).toDateString();
  if (scheduledDate < now && !isToday) return '<span class="px-2 py-1 rounded bg-red-500 text-white text-xs">Atrasado</span>';
  if (isToday) return '<span class="px-2 py-1 rounded bg-yellow-500 text-white text-xs">Pendente</span>';
  if (scheduledDate > now) return '<span class="px-2 py-1 rounded bg-green-500 text-white text-xs">Agendado</span>';
  return '';
}

export function getColumns(showReadLaterColumns: boolean): ColumnDef<SavedItem, any>[] {
  const baseColumns: ColumnDef<SavedItem, any>[] = [
    {
      id: 'expand',
      header: ({ table }) => renderComponent(
        ExpandAllButton, { table }
      ),
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
      header: ({ column }) =>
        renderComponent(SortableHeader, {
          label: 'Item',
          onclick: () => column.toggleSorting(column.getIsSorted() === 'asc'),
          sorted: column.getIsSorted?.(),
        }),
      accessorFn: (row) => row.title,
      cell: ({ row }) => renderComponent(ItemCell, { item: row.original }),
      enableSorting: true,
      sortingFn: (a, b) => {
        const titleA = a.original.title || '';
        const titleB = b.original.title || '';
        return titleA.localeCompare(titleB, 'pt-BR', { sensitivity: 'base' });
      },
    },
    {
      id: 'type',
      header: ({ column }) =>
        renderComponent(SortableHeader, {
          label: 'Tipo',
          onclick: () => column.toggleSorting(column.getIsSorted() === 'asc'),
          sorted: column.getIsSorted?.(),
        }),
      accessorFn: (row) => row.readLater ? 'Ler Mais Tarde' : 'Favorito',
      cell: ({ row }) => row.original.readLater
        ? renderComponent(Clock, { class: 'inline w-4 h-4 mr-1 align-text-bottom text-blue-500' })
        : renderComponent(Bookmark, { class: 'inline w-4 h-4 mr-1 align-text-bottom text-yellow-500' }),
      enableSorting: true,
      enableHiding: true,
      sortingFn: (a, b) => {
        const tipoA = a.getValue('type') || '';
        const tipoB = b.getValue('type') || '';
        return String(tipoA).localeCompare(String(tipoB), 'pt-BR', { sensitivity: 'base' });
      },
      filterFn: (row, columnId, filterValue) => {
        if (filterValue === 'all') return true;
        if (filterValue === 'readlater') return row.original.readLater;
        if (filterValue === 'bookmark') return !row.original.readLater;
        return true;
      },
    },
    {
      accessorKey: 'groupIds',
      header: ({ column }) =>
        renderComponent(SortableHeader, {
          label: 'Grupos',
          onclick: () => column.toggleSorting(column.getIsSorted() === 'asc'),
          sorted: column.getIsSorted?.(),
        }),
      cell: ({ row }) => row.original.groupIds?.length || 0,
      enableSorting: true,
      sortingFn: (a, b) => {
        const countA = Array.isArray(a.original.groupIds) ? a.original.groupIds.length : 0;
        const countB = Array.isArray(b.original.groupIds) ? b.original.groupIds.length : 0;
        return countA - countB;
      },
    },
    {
      accessorKey: 'tags',
      header: ({ column }) =>
        renderComponent(SortableHeader, {
          label: 'Tags',
          onclick: () => column.toggleSorting(column.getIsSorted() === 'asc'),
          sorted: column.getIsSorted?.(),
        }),
      cell: ({ row }) => row.original.tags?.length || 0,
      enableSorting: true,
      sortingFn: (a, b) => {
        const countA = Array.isArray(a.original.tags) ? a.original.tags.length : 0;
        const countB = Array.isArray(b.original.tags) ? b.original.tags.length : 0;
        return countA - countB;
      },
    },
    {
      accessorKey: 'noteIds',
      header: ({ column }) =>
        renderComponent(SortableHeader, {
          label: 'Notas',
          onclick: () => column.toggleSorting(column.getIsSorted() === 'asc'),
          sorted: column.getIsSorted?.(),
        }),
      cell: ({ row }) => row.original.noteIds?.length || 0,
      enableSorting: true,
      sortingFn: (a, b) => {
        const countA = Array.isArray(a.original.noteIds) ? a.original.noteIds.length : 0;
        const countB = Array.isArray(b.original.noteIds) ? b.original.noteIds.length : 0;
        return countA - countB;
      },
    },
    {
      accessorKey: 'flashcardIds',
      header: ({ column }) =>
        renderComponent(SortableHeader, {
          label: 'Flashcards',
          onclick: () => column.toggleSorting(column.getIsSorted() === 'asc'),
          sorted: column.getIsSorted?.(),
        }),
      cell: ({ row }) => row.original.flashcardIds?.length || 0,
      enableSorting: true,
      sortingFn: (a, b) => {
        const countA = Array.isArray(a.original.flashcardIds) ? a.original.flashcardIds.length : 0;
        const countB = Array.isArray(b.original.flashcardIds) ? b.original.flashcardIds.length : 0;
        return countA - countB;
      },
    },
    {
      accessorKey: 'dateAdded',
      header: ({ column }) =>
        renderComponent(SortableHeader, {
          label: 'Criado em',
          onclick: () => column.toggleSorting(column.getIsSorted() === 'asc'),
          sorted: column.getIsSorted?.(),
        }),
      cell: ({ row }) => formatDate(row.original.dateAdded),
      sortingFn: 'datetime',
      enableSorting: true,
    },
    {
      id: 'actions',
      header: () => (
        renderComponent(
          DropdownMenuHeaderButton,
          {}
        )
      ),
      cell: ({ row }) => renderComponent(DataTableActions, { id: row.original.id }),
      enableSorting: false,
      enableHiding: false,
    },
  ];
  const agendadoParaCol: ColumnDef<SavedItem, any> = {
    id: 'scheduledDate',
    header: () => 'Agendado para',
    cell: ({ row }) => row.original.scheduledDate ? formatDate(row.original.scheduledDate) : '-',
    enableSorting: true,
    sortingFn: (a, b) => {
      const aDate = a.original.scheduledDate || 0;
      const bDate = b.original.scheduledDate || 0;
      return aDate - bDate;
    },
  };
  const statusCol: ColumnDef<SavedItem, any> = {
    id: 'status',
    header: () => 'Status',
    cell: ({ row }) => {
      const status = getStatusPill(row.original.scheduledDate);
      return status ? status : '';
    },
    enableSorting: false,
  };
  if (showReadLaterColumns) {
    const idx = baseColumns.findIndex(col => col.id === 'type');
    baseColumns.splice(idx + 1, 0, agendadoParaCol, statusCol);
  }
  return baseColumns;
} 