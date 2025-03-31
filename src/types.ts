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
  scheduledDate?: number;
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