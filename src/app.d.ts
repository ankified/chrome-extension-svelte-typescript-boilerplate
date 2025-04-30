import type { RowData } from '@tanstack/table-core';

declare module '@tanstack/table-core' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface TableMeta<TData extends RowData> {
    openViewDialog?: (itemId: string) => void;
    openEditDialog?: (itemId: string) => void;
    openDeleteConfirmDialog?: (itemId: string) => void;
    openDeleteAllDialog?: () => void; // Função para confirmar exclusão de todos
  }
}

// Adicione outras declarações globais aqui, se necessário
export {}; // Necessário para tratar o arquivo como um módulo 