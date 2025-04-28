<script lang="ts">
  import * as DropdownMenu from '../../../lib/components/ui/dropdown-menu/index.js';
  import type { Table } from '@tanstack/table-core';
  import type { SavedItem } from '../../../types';
  import { Columns3, FolderCog, Tags, Trash2 } from '@lucide/svelte';

  // Definir props necessárias
  type Props = {
    table: Table<SavedItem>;
    onOpenManageGroupsDialog: () => void;
    onOpenManageTagsDialog: () => void;
    onOpenDeleteAllItemsDialog: () => void;
  };

  let { 
    table, 
    onOpenManageGroupsDialog, 
    onOpenManageTagsDialog, 
    onOpenDeleteAllItemsDialog 
  }: Props = $props();

  let open = $state(false);

  // Colunas que não devem aparecer no seletor de visibilidade
  const nonHideableColumns = ['select', 'expand', 'actions'];

</script>

<DropdownMenu.Root bind:open>
  <DropdownMenu.Trigger>
    <button type="button" aria-label="Opções gerais da tabela" class="flex items-center justify-center w-7 h-7 rounded hover:bg-accent transition">
      <!-- Ícone de três pontos vertical (SVG inline) -->
      <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <circle cx="12" cy="5" r="1.5" />
        <circle cx="12" cy="12" r="1.5" />
        <circle cx="12" cy="19" r="1.5" />
      </svg>
    </button>
  </DropdownMenu.Trigger>
  <DropdownMenu.Content align="end" class="w-56">
    <DropdownMenu.Label>Opções da Tabela</DropdownMenu.Label>
    <DropdownMenu.Separator />

    <!-- Grupo de Visibilidade de Colunas -->
    <DropdownMenu.Group>
        <DropdownMenu.Label class="flex items-center">
            <Columns3 class="mr-2 h-4 w-4" />
            Visibilidade de Colunas
        </DropdownMenu.Label>
        <DropdownMenu.Separator />
        {#each table.getAllLeafColumns() as column}
            {#if column.getCanHide() && !nonHideableColumns.includes(column.id)} 
                 <DropdownMenu.CheckboxItem
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                 >
                    {column.columnDef.meta?.displayName || column.id}
                 </DropdownMenu.CheckboxItem>
            {/if}
        {/each}
    </DropdownMenu.Group>

    <DropdownMenu.Separator />

    <!-- Itens de Gerenciamento -->
    <DropdownMenu.Item onclick={onOpenManageGroupsDialog}>
        <FolderCog class="mr-2 h-4 w-4" />
        Gerenciar Grupos
    </DropdownMenu.Item>
    <DropdownMenu.Item onclick={onOpenManageTagsDialog}>
        <Tags class="mr-2 h-4 w-4" />
        Gerenciar Tags
    </DropdownMenu.Item>

    <DropdownMenu.Separator />

    <!-- Item Destrutivo -->
    <DropdownMenu.Item 
      class="!text-destructive focus:!bg-destructive/10 focus:!text-destructive"
      onclick={onOpenDeleteAllItemsDialog}
    >
      <Trash2 class="mr-2 h-4 w-4" />
      Remover Todos os Itens
    </DropdownMenu.Item>

  </DropdownMenu.Content>
</DropdownMenu.Root> 