<script lang="ts">
  import { getColumns } from './columns';
  import type { SavedItem } from '../../../types';
  import DataTable from './DataTable.svelte';

  // A prop 'data' agora recebe sortedItems diretamente de SavedItemsView
  // Adicionar props para os callbacks
  type Props = {
    data?: SavedItem[];
    onOpenManageGroupsDialog: () => void;
    onOpenManageTagsDialog: () => void;
    onOpenDeleteAllItemsDialog: () => void;
  };

  let { 
    data = [],
    onOpenManageGroupsDialog,
    onOpenManageTagsDialog,
    onOpenDeleteAllItemsDialog
  }: Props = $props();

  // Remover mockData
  // Remover typeFilter e lógica derivada
  // const showReadLaterColumns = $derived(() => typeFilter === 'readlater');

  // Passar showReadLaterColumns=false para getColumns por enquanto, 
  // DataTable agora controla a visibilidade internamente.
  // Idealmente, a visibilidade controlada por DataTable deveria ser passada para getColumns,
  // mas isso requer refatoração mais complexa. Por agora, focamos em fazer a data fluir.
  const dynamicColumns = getColumns(
    false, // showReadLaterColumns - simplificado por enquanto
    onOpenManageGroupsDialog,
    onOpenManageTagsDialog,
    onOpenDeleteAllItemsDialog
  );

  // Remover filteredData
</script>

<!-- Passar a prop 'data' diretamente para DataTable -->
<DataTable columns={dynamicColumns} data={data} /> 