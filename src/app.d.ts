import type { RowData } from '@tanstack/table-core';

declare module '@tanstack/table-core' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface TableMeta<TData extends RowData> {
    openViewDialog?: (itemId: string) => void;
    openDeleteConfirmDialog?: (itemId: string) => void;
    openDeleteAllDialog?: () => void; // Função para confirmar exclusão de todos
    openDomainFilterDialog?: () => void;
  }
}

// Adicione outras declarações globais aqui, se necessário
export {}; // Necessário para tratar o arquivo como um módulo 

// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

// --- Adicionar Augmentation para TanStack Table --- 
declare module '@tanstack/table-core' {
	interface TableMeta<TData extends unknown> {
		openDeleteConfirmDialog?: (itemId: string) => void;
		openDeleteAllDialog?: () => void;
		openDomainFilterDialog?: () => void;
	}
}
// -----------------------------------------------

export {}; 