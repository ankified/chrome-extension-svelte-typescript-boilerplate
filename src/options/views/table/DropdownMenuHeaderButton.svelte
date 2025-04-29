<script lang="ts">
  import * as DropdownMenu from '../../../lib/components/ui/dropdown-menu/index.js';
  import type { Table, Column } from '@tanstack/table-core';
  import type { SavedItem } from '../../../types'; // Assumindo que SavedItem está em types
  // Importar o store uiState
  // import * as uiState from '../../../lib/stores/uiState.svelte'; // Remover import antigo
  import { dialogState } from '../../../lib/stores/uiState.svelte'; // Importar novo objeto
  // Importar ícone para submenu
  import LayoutGrid from '@lucide/svelte/icons/layout-grid';

  type Props = {
    table: Table<SavedItem>;
    // Adicionar callback para abrir diálogo de exclusão total
    onOpenDeleteAllDialog: () => void;
  }
  let { table, onOpenDeleteAllDialog }: Props = $props();

  let open = $state(false);

  // Derivar colunas ocultáveis
  let hideableColumns = $derived(() =>
    table.getAllLeafColumns().filter(
      (column) =>
        typeof column.columnDef.enableHiding === "undefined" ||
        column.columnDef.enableHiding === true
    )
  );

  // Função para obter um nome de exibição amigável para a coluna
  function getColumnHeader(column: Column<SavedItem>): string {
    // Tenta obter do header, senão usa o id
    const header = column.columnDef.header;
    if (typeof header === 'string') return header;
    // Se for um componente, pode ser complexo obter o texto, usar ID como fallback
    // TODO: Melhorar a obtenção do label se o header for um componente (e.g., SortableHeader)
    return column.id;
  }

</script>

<DropdownMenu.Root bind:open>
  <DropdownMenu.Trigger>
    <button type="button" aria-label="Opções gerais" class="flex items-center justify-center w-7 h-7 rounded hover:bg-accent transition">
      <!-- Ícone de três pontos vertical (SVG inline) -->
      <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <circle cx="12" cy="5" r="1.5" />
        <circle cx="12" cy="12" r="1.5" />
        <circle cx="12" cy="19" r="1.5" />
      </svg>
    </button>
  </DropdownMenu.Trigger>
  <DropdownMenu.Content align="end">
    <DropdownMenu.Label>Opções Gerais</DropdownMenu.Label>
    <DropdownMenu.Separator />
    <!-- Remover item placeholder -->
    <!-- <DropdownMenu.Item disabled>Em breve...</DropdownMenu.Item> -->

    <!-- Seção de Visibilidade de Colunas (agora como Submenu) -->
    <DropdownMenu.Sub>
      <DropdownMenu.SubTrigger>
        <LayoutGrid class="mr-2 h-4 w-4" />
        <span>Exibir Colunas</span>
      </DropdownMenu.SubTrigger>
      <DropdownMenu.SubContent>
        <DropdownMenu.Label>Colunas Visíveis</DropdownMenu.Label>
        <DropdownMenu.Separator />
        {#each hideableColumns() as column (column.id)}
          <DropdownMenu.CheckboxItem
            checked={column.getIsVisible()}
            onCheckedChange={(checkedState) => {
              column.toggleVisibility(!!checkedState);
            }}
          >
            <!-- Usar a função helper para o nome -->
            {getColumnHeader(column)}
          </DropdownMenu.CheckboxItem>
        {/each}
      </DropdownMenu.SubContent>
    </DropdownMenu.Sub>

    <!-- Separador antes das opções de gerenciamento -->
    <DropdownMenu.Separator />

    <!-- Item Gerenciar Grupos -->
    <DropdownMenu.Item onSelect={() => dialogState.showManageGroups = true}>
      Gerenciar Grupos
    </DropdownMenu.Item>

    <!-- Item Gerenciar Tags -->
    <DropdownMenu.Item onSelect={() => dialogState.showManageTags = true}>
      Gerenciar Tags
    </DropdownMenu.Item>

    <!-- Separador antes das opções destrutivas -->
    <DropdownMenu.Separator />

    <!-- Opção Remover Todos -->
    <DropdownMenu.Item
      class="text-destructive focus:text-destructive focus:bg-destructive/10"
      onSelect={onOpenDeleteAllDialog}
    >
      Remover Todos os Itens...
    </DropdownMenu.Item>

  </DropdownMenu.Content>
</DropdownMenu.Root> 