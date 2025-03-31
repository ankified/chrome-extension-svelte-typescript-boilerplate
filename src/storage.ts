import { writable, type Updater } from 'svelte/store';
import type { SavedItem, Note, Flashcard, Group, ItemLink } from './types';

/**
 * Creates a persistent Svelte store backed by Chrome's sync storage.
 * Note that each item is limited to 8KB. Use storage.local for larger amounts.
 * https://developer.chrome.com/docs/extensions/reference/api/storage#storage_areas
 *
 * @template T The type of the store's value
 * @param key The key to use in Chrome's storage
 * @param initialValue The initial value of the store
 * @returns A writable Svelte store
 */
export function persistentStore<T>(key: string, initialValue: T) {
    const store = writable<T>(initialValue);

    function updateChromeStorage(value: T): void {
        chrome.storage.sync.set({ [key]: value });
    }

    function watchChromeStorage() {
        chrome.storage.sync.onChanged.addListener((changes) => {
            if (Object.hasOwn(changes, key)) {
                store.set(changes[key].newValue);
            }
        });
    }

    function initStoreFromChromeStorage() {
        chrome.storage.sync.get(key).then((result) => {
            if (Object.hasOwn(result, key)) {
                store.set(result[key]);
            }
        });
    }

    initStoreFromChromeStorage();
    watchChromeStorage();

    return {
        set(this: void, value: T): void {
            store.set(value);
            updateChromeStorage(value);
        },
        update(this: void, updater: Updater<T>): void {
            return store.update((prev: T): T => {
                const value = updater(prev);
                updateChromeStorage(value);
                return value;
            });
        },
        subscribe: store.subscribe,
    };
}

// Função auxiliar para criar uma store persistente
function createPersistentStore<T>(key: string, initialValue: T) {
    // Criar a store writable com valor inicial
    const store = writable<T>(initialValue);
    
    // Carregar dados do storage (se existirem)
    chrome.storage.local.get([key], (result) => {
        if (result[key]) {
            store.set(result[key]);
        }
    });
    
    // Inscrever-se para alterações e salvar no storage
    store.subscribe((value) => {
        chrome.storage.local.set({ [key]: value });
    });
    
    return store;
}

// Criar stores para cada tipo de dado
export const savedItems = createPersistentStore<SavedItem[]>('savedItems', []);
export const notes = createPersistentStore<Note[]>('notes', []);
export const flashcards = createPersistentStore<Flashcard[]>('flashcards', []);
export const groups = createPersistentStore<Group[]>('groups', []);
export const itemLinks = createPersistentStore<ItemLink[]>('itemLinks', []);

// Adicionar logs para depuração das stores
// (Será útil para identificar possíveis problemas com o armazenamento)
savedItems.subscribe(items => {
  console.log(`[Storage Debug] savedItems atualizado: ${items.length} itens`);
});

notes.subscribe(allNotes => {
  console.log(`[Storage Debug] notes atualizado: ${allNotes.length} notas`);
  // Log detalhado das 5 notas mais recentes (se existirem)
  if (allNotes.length > 0) {
    const recentNotes = [...allNotes].sort((a, b) => b.dateCreated - a.dateCreated).slice(0, 5);
    console.log('[Storage Debug] Notas recentes:', recentNotes);
  }
});

flashcards.subscribe(cards => {
  console.log(`[Storage Debug] flashcards atualizado: ${cards.length} flashcards`);
});

// Função para corrigir as referências cruzadas entre itens, notas e flashcards
export function fixReferences() {
  console.log("[Storage] Iniciando correção de referências entre itens, notas e flashcards");
  
  // Obter os dados atuais
  let allItems: SavedItem[] = [];
  let allNotes: Note[] = [];
  let allFlashcards: Flashcard[] = [];
  
  const unsubItemsTemp = savedItems.subscribe(items => { allItems = items; });
  const unsubNotesTemp = notes.subscribe(notesList => { allNotes = notesList; });
  const unsubFlashcardsTemp = flashcards.subscribe(cardsList => { allFlashcards = cardsList; });
  unsubItemsTemp();
  unsubNotesTemp();
  unsubFlashcardsTemp();
  
  console.log(`[Storage] Encontrados ${allItems.length} itens, ${allNotes.length} notas e ${allFlashcards.length} flashcards`);
  
  // Logar detalhes das notas para depuração
  console.log("[Storage] Detalhes das notas antes da correção:");
  allNotes.forEach(note => {
    console.log(`  - Nota ID: ${note.id}, ItemID: ${note.itemId || "nenhum"}, Conteúdo: ${note.content.substring(0, 30)}...`);
    const item = note.itemId ? allItems.find(item => item.id === note.itemId) : null;
    if (item) {
      const isReferenced = item.noteIds && item.noteIds.includes(note.id);
      console.log(`    Associada ao item: "${item.title}" (${isReferenced ? 'referenciada' : 'NÃO referenciada'} no item)`);
    }
  });
  
  // --- CORREÇÃO DE REFERÊNCIAS ENTRE ITENS E NOTAS ---
  
  // Verificar notas com itemId inválido
  const notesWithInvalidItem = allNotes.filter(note => 
    !note.itemId || !allItems.some(item => item.id === note.itemId)
  );
  
  if (notesWithInvalidItem.length > 0) {
    console.log(`[Storage] Encontradas ${notesWithInvalidItem.length} notas com itemId inválido`);
  }
  
  // Verificar itens com noteIds inválidos
  const itemsWithInvalidNotes = allItems.filter(item => {
    if (!item.noteIds) return false;
    return item.noteIds.some(noteId => !allNotes.some(note => note.id === noteId));
  });
  
  if (itemsWithInvalidNotes.length > 0) {
    console.log(`[Storage] Encontrados ${itemsWithInvalidNotes.length} itens com noteIds inválidos`);
  }
  
  // Verificar notas que não estão referenciadas nos itens
  const notesNotReferencedInItems = allNotes.filter(note => {
    const relatedItem = allItems.find(item => item.id === note.itemId);
    return !relatedItem || !relatedItem.noteIds || !relatedItem.noteIds.includes(note.id);
  });
  
  if (notesNotReferencedInItems.length > 0) {
    console.log(`[Storage] Encontradas ${notesNotReferencedInItems.length} notas não referenciadas nos itens`);
  }
  
  // --- CORREÇÃO DE REFERÊNCIAS ENTRE ITENS E FLASHCARDS ---
  
  // Verificar flashcards com itemId inválido
  const flashcardsWithInvalidItem = allFlashcards.filter(card => 
    !card.itemId || !allItems.some(item => item.id === card.itemId)
  );
  
  if (flashcardsWithInvalidItem.length > 0) {
    console.log(`[Storage] Encontrados ${flashcardsWithInvalidItem.length} flashcards com itemId inválido`);
  }
  
  // Verificar itens com flashcardIds inválidos
  const itemsWithInvalidFlashcards = allItems.filter(item => {
    if (!item.flashcardIds) return false;
    return item.flashcardIds.some(cardId => !allFlashcards.some(card => card.id === cardId));
  });
  
  if (itemsWithInvalidFlashcards.length > 0) {
    console.log(`[Storage] Encontrados ${itemsWithInvalidFlashcards.length} itens com flashcardIds inválidos`);
  }
  
  // Verificar flashcards que não estão referenciados nos itens
  const flashcardsNotReferencedInItems = allFlashcards.filter(card => {
    const relatedItem = allItems.find(item => item.id === card.itemId);
    return !relatedItem || !relatedItem.flashcardIds || !relatedItem.flashcardIds.includes(card.id);
  });
  
  if (flashcardsNotReferencedInItems.length > 0) {
    console.log(`[Storage] Encontrados ${flashcardsNotReferencedInItems.length} flashcards não referenciados nos itens`);
  }
  
  // --- CORREÇÃO DAS REFERÊNCIAS ---
  
  let itemsUpdated = false;
  
  // 1. Atualizar os itens para incluir referências a todas as notas e flashcards
  const correctedItems = allItems.map(item => {
    let needsUpdate = false;
    let updatedNoteIds = item.noteIds || [];
    let updatedFlashcardIds = item.flashcardIds || [];
    
    // Encontrar todas as notas deste item
    const itemNotes = allNotes.filter(note => note.itemId === item.id);
    
    // Verificar se o item já tem todas as noteIds corretas
    const hasAllNoteIds = itemNotes.every(note => 
      updatedNoteIds.includes(note.id)
    );
    
    // Se não tiver todas as noteIds corretas, atualizar
    if (!hasAllNoteIds && itemNotes.length > 0) {
      updatedNoteIds = [...new Set([...updatedNoteIds, ...itemNotes.map(note => note.id)])];
      needsUpdate = true;
      console.log(`[Storage] Atualizando noteIds para o item ${item.id}`);
    }
    
    // Encontrar todos os flashcards deste item
    const itemFlashcards = allFlashcards.filter(card => card.itemId === item.id);
    
    // Verificar se o item já tem todos os flashcardIds corretos
    const hasAllFlashcardIds = itemFlashcards.every(card => 
      updatedFlashcardIds.includes(card.id)
    );
    
    // Se não tiver todos os flashcardIds corretos, atualizar
    if (!hasAllFlashcardIds && itemFlashcards.length > 0) {
      updatedFlashcardIds = [...new Set([...updatedFlashcardIds, ...itemFlashcards.map(card => card.id)])];
      needsUpdate = true;
      console.log(`[Storage] Atualizando flashcardIds para o item ${item.id}`);
    }
    
    // Se precisar atualizar, retornar o item atualizado
    if (needsUpdate) {
      itemsUpdated = true;
      return {
        ...item,
        noteIds: updatedNoteIds,
        flashcardIds: updatedFlashcardIds
      };
    }
    
    // Se não precisar atualizar, retornar o item original
    return item;
  });
  
  // Aplicar as correções aos itens se necessário
  if (itemsUpdated) {
    console.log("[Storage] Atualizando itens para corrigir referências");
    savedItems.set(correctedItems);
  }
  
  // Logar detalhes das notas após a correção para depuração
  console.log("[Storage] Detalhes das notas após a correção:");
  allNotes.forEach(note => {
    const item = note.itemId ? correctedItems.find(item => item.id === note.itemId) : null;
    const isReferenced = item && item.noteIds && item.noteIds.includes(note.id);
    console.log(`  - Nota ID: ${note.id}, ItemID: ${note.itemId || "nenhum"}, Conteúdo: ${note.content.substring(0, 30)}...`);
    if (item) {
      console.log(`    Associada ao item: "${item.title}" (${isReferenced ? 'referenciada' : 'NÃO referenciada'} no item)`);
    }
  });
  
  console.log("[Storage] Correção de referências concluída");
  
  return {
    itemsUpdated,
    notesWithInvalidItem: notesWithInvalidItem.length,
    itemsWithInvalidNotes: itemsWithInvalidNotes.length,
    notesNotReferencedInItems: notesNotReferencedInItems.length,
    flashcardsWithInvalidItem: flashcardsWithInvalidItem.length,
    itemsWithInvalidFlashcards: itemsWithInvalidFlashcards.length,
    flashcardsNotReferencedInItems: flashcardsNotReferencedInItems.length
  };
}

// Adicionar utilitários para relacionamentos entre entidades
export const itemLinksUtils = {
    getNotesForItem: (itemId: string): Promise<Note[]> => {
        return new Promise((resolve) => {
            const unsubscribe = notes.subscribe((allNotes) => {
                unsubscribe();
                resolve(allNotes.filter(note => note.itemId === itemId));
            });
        });
    },
    
    getFlashcardsForItem: (itemId: string): Promise<Flashcard[]> => {
        return new Promise((resolve) => {
            const unsubscribe = flashcards.subscribe((allFlashcards) => {
                unsubscribe();
                resolve(allFlashcards.filter(flashcard => flashcard.itemId === itemId));
            });
        });
    },
    
    getItemById: (itemId: string): Promise<SavedItem | undefined> => {
        return new Promise((resolve) => {
            const unsubscribe = savedItems.subscribe((items) => {
                unsubscribe();
                resolve(items.find(item => item.id === itemId));
            });
        });
    }
};
