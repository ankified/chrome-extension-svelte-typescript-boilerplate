import type { ColumnDef } from '@tanstack/table-core';
import type { SavedItem } from '../../../types';
import { renderComponent } from '../../../lib/components/ui/data-table/index';
import DataTableCheckbox from './data-table-checkbox.svelte';
import DataTableActions from './DataTableActions.svelte';
import ItemCell from './ItemCell.svelte';
import ExpandButton from './ExpandButton.svelte';
import SortableHeader from './SortableHeader.svelte';
import ExpandAllButton from './ExpandAllButton.svelte';
import DropdownMenuHeaderButton from './DropdownMenuHeaderButton.svelte';
import Bookmark from '@lucide/svelte/icons/bookmark';
import Clock from '@lucide/svelte/icons/clock';
import { getLocalTimeZone } from "@internationalized/date";
import type DialogButtonNotasType from './DialogButtonNotas.svelte';
import type DialogButtonFlashcardsType from './DialogButtonFlashcards.svelte';
import DialogButtonNotas from './DialogButtonNotas.svelte';
import DialogButtonFlashcards from './DialogButtonFlashcards.svelte';
import type DialogButtonGruposType from './DialogButtonGrupos.svelte';
import type DialogButtonTagsType from './DialogButtonTags.svelte';
import DialogButtonGrupos from './DialogButtonGrupos.svelte';
import DialogButtonTags from './DialogButtonTags.svelte';
import type ManageItemGroupsDialogType from '../../components/ManageItemGroupsDialog.svelte';
import ManageItemGroupsDialog from '../../components/ManageItemGroupsDialog.svelte';
import { type AggregationFn, sortingFns } from '@tanstack/table-core';
import StatusCellButton from './StatusCellButton.svelte';

function formatDate(date: number) {
  return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
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
      cell: ({ row }) => {
        return renderComponent(
          DialogButtonGrupos as typeof DialogButtonGruposType,
          {
            itemId: row.original.id,
          }
        );
      },
      enableSorting: true,
      sortingFn: (a, b) => {
        const countA = Array.isArray(a.original.groupIds) ? a.original.groupIds.length : 0;
        const countB = Array.isArray(b.original.groupIds) ? b.original.groupIds.length : 0;
        return countA - countB;
      },
      filterFn: (row, columnId, filterValue) => {
        if (!filterValue || filterValue.length === 0) return true;
        return (filterValue as string[]).every((gid: string) => Array.isArray(row.original.groupIds) && row.original.groupIds.includes(gid));
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
      cell: ({ row }) => {
        return renderComponent(
          DialogButtonTags,
          {
            itemId: row.original.id,
          }
        );
      },
      enableSorting: true,
      sortingFn: (a, b) => {
        const countA = Array.isArray(a.original.tags) ? a.original.tags.length : 0;
        const countB = Array.isArray(b.original.tags) ? b.original.tags.length : 0;
        return countA - countB;
      },
      filterFn: (row, columnId, filterValue) => {
        if (!filterValue || filterValue.length === 0) return true;
        return (filterValue as string[]).every((tag: string) => Array.isArray(row.original.tags) && row.original.tags.includes(tag));
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
      cell: ({ row }) => {
        const count = row.original.noteIds?.length || 0;
        return renderComponent(
          DialogButtonNotas as typeof DialogButtonNotasType,
          {
            noteIds: row.original.noteIds,
            disabled: count === 0,
            count,
            itemId: row.original.id,
          }
        );
      },
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
      cell: ({ row }) => {
        const count = row.original.flashcardIds?.length || 0;
        return renderComponent(
          DialogButtonFlashcards as typeof DialogButtonFlashcardsType,
          {
            flashcardIds: row.original.flashcardIds,
            disabled: count === 0,
            count,
            itemId: row.original.id,
          }
        );
      },
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
      filterFn: (row, columnId, filterValue: { start?: number, end?: number } | undefined) => {
        if (!filterValue || typeof filterValue.start === 'undefined') {
          return true;
        }
        const date = row.original.dateAdded;

        if (!date) {
          return false;
        }

        const start = filterValue.start;
        const end = typeof filterValue.end === 'undefined' ? start : filterValue.end;

        return date >= start && date <= end;
      },
    },
    {
      id: 'actions',
      header: ({ table }) => (
        renderComponent(
          DropdownMenuHeaderButton,
          { 
            table, 
            onOpenDeleteAllDialog: table.options.meta?.openDeleteAllDialog ?? (() => console.warn('onOpenDeleteAllDialog not provided via meta'))
          }
        )
      ),
      cell: ({ row, table }) => renderComponent(DataTableActions, { 
        id: row.original.id,
        url: row.original.url,
        onDelete: table.options.meta?.openDeleteConfirmDialog
      }),
      enableSorting: false,
      enableHiding: false,
    },
  ];
  const agendadoParaCol: ColumnDef<SavedItem, any> = {
    id: 'scheduledDate',
    header: ({ column }) =>
      renderComponent(SortableHeader, {
        label: 'Agendado p/',
        onclick: () => column.toggleSorting(column.getIsSorted() === 'asc'),
        sorted: column.getIsSorted?.(),
      }),
    accessorFn: (row) => row.scheduledDates?.[0],
    cell: ({ row }) => {
      const firstDate = row.original.scheduledDates?.[0];
      return firstDate ? formatDate(firstDate) : '-';
    },
    enableSorting: true,
    sortingFn: sortingFns.datetime,
    filterFn: (row, columnId, filterValue: { start?: number, end?: number } | undefined) => {
      const dates = row.original.scheduledDates;
      if (!filterValue || typeof filterValue.start === 'undefined') {
        return true;
      }
      if (!dates || dates.length === 0) {
        return false;
      }

      const start = filterValue.start;
      const end = typeof filterValue.end === 'undefined' ? start : filterValue.end;

      return dates.some(date => date >= start && date <= end);
    },
    enableGrouping: true,
    aggregationFn: 'count',
    enableHiding: true,
  };
  const statusCol: ColumnDef<SavedItem, any> = {
    id: 'status',
    header: ({ column }) =>
      renderComponent(SortableHeader, {
        label: 'Status',
        onclick: () => column.toggleSorting(column.getIsSorted() === 'asc'),
        sorted: column.getIsSorted?.(),
      }),
    accessorFn: (row) => {
      if (row.completed) return 'Concluído';
      if (!row.readLater || !row.scheduledDates || row.scheduledDates.length === 0) return 'Pendente';

      const scheduled = row.scheduledDates[0];
      const now = Date.now();
      const todayStart = new Date(now).setHours(0, 0, 0, 0);
      const scheduledDateOnly = new Date(scheduled).setHours(0, 0, 0, 0);

      if (scheduled < todayStart) return 'Atrasado';
      if (scheduledDateOnly === todayStart) return 'Hoje';
      return 'Pendente';
    },
    cell: ({ row }) => {
      return renderComponent(StatusCellButton, { itemId: row.original.id });
    },
    enableSorting: true,
    sortingFn: (rowA, rowB, columnId) => {
      const statusOrder = ['Atrasado', 'Hoje', 'Pendente', 'Concluído'];
      const statusA = rowA.getValue(columnId) as string;
      const statusB = rowB.getValue(columnId) as string;
      const indexA = statusOrder.indexOf(statusA);
      const indexB = statusOrder.indexOf(statusB);
      return (indexA === -1 ? Infinity : indexA) - (indexB === -1 ? Infinity : indexB);
    },
    filterFn: (row, columnId, filterValue: string | undefined) => {
      if (typeof filterValue === 'undefined' || filterValue === '') return true;
      const status = row.getValue(columnId) as string;
      return status === filterValue;
    },
    enableGrouping: true,
    aggregationFn: 'count',
    enableHiding: true,
  };
  const baseColumnsWithScheduled: ColumnDef<SavedItem, any>[] = [...baseColumns];
  const typeIndex = baseColumnsWithScheduled.findIndex(col => col.id === 'type');
  if (typeIndex !== -1) {
    baseColumnsWithScheduled.splice(typeIndex + 1, 0, agendadoParaCol, statusCol);
  } else {
    baseColumnsWithScheduled.push(agendadoParaCol, statusCol);
  }
  return baseColumnsWithScheduled;
} 