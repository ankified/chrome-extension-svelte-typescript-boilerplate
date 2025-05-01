// Tipos de dados principais para a extensão

export interface SavedItem {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  dateAdded: number;
  comments: string;
  tags: string[];
  groupIds: string[];
  readLater: boolean;
  scheduledDates?: number[];
  completed?: boolean;
  position?: { x: number, y: number }; // Para SvelteFlow
  previewImage?: string; // URL da captura de tela para exibição no popover
  noteIds: string[];
  flashcardIds: string[];
}

export interface Group {
  id: string;
  name: string;
  color?: string;
  description?: string;
  itemIds: string[];
}

export interface ItemLink {
  id: string;
  sourceId: string;
  targetId: string;
  label?: string;
  type: 'item-item' | 'item-note' | 'note-note' | 'flashcard-flashcard' | 'flashcard-note';
}

export interface Note {
  id: string;
  itemId: string; // ID do SavedItem relacionado
  content: string;
  dateCreated: number;
  lastModified: number;
  tags: string[];
  color?: string; // Para categorização visual
  position?: { x: number, y: number }; // Para SvelteFlow
}

export interface Flashcard {
  id: string;
  itemId: string; // ID do SavedItem relacionado
  front: string; // Pergunta ou conceito
  back: string; // Resposta ou explicação
  dateCreated: number;
  lastModified: number;
  lastReviewed?: number;
  reviewCount: number;
  easeFactor: number; // Fator de facilidade para algoritmo de repetição espaçada
  nextReviewDate?: number;
  tags: string[];
  color?: string; // Cor de fundo do flashcard
  position?: { x: number, y: number }; // Para SvelteFlow
}

// ---- NOVOS TIPOS PARA FILTROS/ORDENAÇÃO ----

// Usado para ordenação (multi-nível)
export type SortDescriptor = {
  criterion: string; // Ex: 'dateAdded', 'title', 'url', 'scheduledDate', 'noteCount', 'flashcardCount'
  direction: 'asc' | 'desc';
};

// Define a estrutura das configurações de filtro/ordenação salvas
export type FilterSettings = {
  searchQuery: string;
  searchScope: 'content' | 'tags' | 'groups';
  includedTags: string[];
  excludedTags: string[];
  tagMatchLogic: 'AND' | 'OR';
  includedGroups: string[];
  excludedGroups: string[];
  groupMatchLogic: 'AND' | 'OR';
  selectedDateRange?: { start?: string; end?: string; }; // Serializado como 'YYYY-MM-DD'
  sortDescriptors: SortDescriptor[];
};

// Define a estrutura de um conjunto de filtros nomeado e salvo
export type NamedFilterSet = {
  id: string;
  name: string;
  settings: FilterSettings;
};

// ---- ADICIONADO: Tipos para Histórico de Visitas ----
export type VisitTransition = chrome.history.VisitItem["transition"];

export interface VisitItem {
  visitId: string;
  visitTime: number; // Timestamp em milissegundos desde a epoch
  transition: VisitTransition;
} 