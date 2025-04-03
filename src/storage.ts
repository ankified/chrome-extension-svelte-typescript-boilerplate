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
    let isInitialized = false;

    function updateChromeStorage(value: T): void {
        if (isInitialized) {
        chrome.storage.sync.set({ [key]: value });
        }
    }

    function watchChromeStorage() {
        chrome.storage.sync.onChanged.addListener((changes) => {
            if (changes[key]) {
                store.set(changes[key].newValue);
            }
        });
    }

    function initStoreFromChromeStorage() {
        chrome.storage.sync.get(key).then((result) => {
            if (result[key] !== undefined) {
                store.set(result[key]);
            }
            isInitialized = true;
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
            store.update((prev: T): T => {
                const value = updater(prev);
                updateChromeStorage(value);
                return value;
            });
        },
        subscribe: store.subscribe,
    };
}

// Função otimizada para criar uma store persistente com localStorage
function createPersistentStore<T>(key: string, initialValue: T) {
    // Criar a store writable com valor inicial
    const store = writable<T>(initialValue);
    let isInitialized = false;
    let updateScheduled = false;
    
    // Carregar dados do storage de forma otimizada (se existirem)
    chrome.storage.local.get([key]).then((result) => {
        if (result[key]) {
            store.set(result[key]);
        }
        isInitialized = true;
    }).catch(error => {
        console.error(`Erro ao carregar dados para ${key}:`, error);
        isInitialized = true; // Ainda consideramos inicializado para evitar bloqueios
    });
    
    // Inscrever-se para alterações e salvar no storage de forma otimizada
    store.subscribe((value) => {
        if (!isInitialized || updateScheduled) return;
        
        // Utiliza requestIdleCallback para atrasar a escrita até que o navegador esteja ocioso
        // Isso reduz o impacto de performance em operações frequentes
        updateScheduled = true;
        const update = () => {
            chrome.storage.local.set({ [key]: value });
            // Também salva na chrome.storage.sync para garantir sincronização entre instâncias
            if (key === 'savedItems' || key === 'groups') {
                chrome.storage.sync.set({ [key]: value }).catch(err => {
                    console.warn(`Erro ao sincronizar ${key} com storage.sync:`, err);
                });
            }
            updateScheduled = false;
        };
        
        if (window.requestIdleCallback) {
            window.requestIdleCallback(() => update(), { timeout: 1000 });
        } else {
            // Fallback para navegadores que não suportam requestIdleCallback
            setTimeout(update, 100);
        }
    });
    
    // Adicionar um método para forçar a sincronização imediata com o storage
    const forceSync = () => {
        const value = get(store);
        chrome.storage.local.set({ [key]: value });
        if (key === 'savedItems' || key === 'groups') {
            chrome.storage.sync.set({ [key]: value }).catch(err => {
                console.warn(`Erro ao sincronizar ${key} com storage.sync:`, err);
            });
        }
    };
    
    // Adiciona listener para mudanças no storage
    chrome.storage.onChanged.addListener((changes) => {
        if (changes[key] && changes[key].newValue !== undefined) {
            store.set(changes[key].newValue);
        }
    });
    
    return {
        ...store,
        forceSync
    };
}

// Função auxiliar para obter valor atual de uma store
function get<T>(store: { subscribe: (callback: (value: T) => void) => any }): T {
    let value: T;
    const unsubscribe = store.subscribe(($value) => {
        value = $value;
    });
    unsubscribe();
    return value!;
}

// Criar stores para cada tipo de dado
export const savedItems = createPersistentStore<SavedItem[]>('savedItems', []);
export const notes = createPersistentStore<Note[]>('notes', []);
export const flashcards = createPersistentStore<Flashcard[]>('flashcards', []);
export const groups = createPersistentStore<Group[]>('groups', []);
export const itemLinks = createPersistentStore<ItemLink[]>('itemLinks', []);

// Reduzir logs para melhorar performance
const isDebugMode = false; // Definir como false em produção

function debugLog(...args: any[]) {
    if (isDebugMode) {
        console.log(...args);
    }
}

// Adicionar logs para depuração das stores somente em modo de desenvolvimento
if (isDebugMode) {
savedItems.subscribe(items => {
        debugLog(`[Storage Debug] savedItems atualizado: ${items.length} itens`);
});

notes.subscribe(allNotes => {
        debugLog(`[Storage Debug] notes atualizado: ${allNotes.length} notas`);
});

flashcards.subscribe(cards => {
        debugLog(`[Storage Debug] flashcards atualizado: ${cards.length} flashcards`);
});
}

// Função otimizada para corrigir as referências cruzadas entre itens, notas e flashcards
export function fixReferences() {
    console.log("[Storage] Iniciando correção de referências");
  
    // Obter os dados atuais de forma mais eficiente
  let allItems: SavedItem[] = [];
  let allNotes: Note[] = [];
  let allFlashcards: Flashcard[] = [];
  
    // Use uma promessa para garantir que todos os dados sejam carregados antes de prosseguir
    return new Promise<any>((resolve) => {
        Promise.all([
            new Promise<void>(r => {
                const unsub = savedItems.subscribe(items => {
                    allItems = items;
                    // Usar setTimeout para garantir que o callback complete antes de chamar unsub
                    setTimeout(() => {
                        unsub();
                        r();
                    }, 0);
                });
            }),
            new Promise<void>(r => {
                const unsub = notes.subscribe(notesList => {
                    allNotes = notesList;
                    // Usar setTimeout para garantir que o callback complete antes de chamar unsub
                    setTimeout(() => {
                        unsub();
                        r();
                    }, 0);
                });
            }),
            new Promise<void>(r => {
                const unsub = flashcards.subscribe(cardsList => {
                    allFlashcards = cardsList;
                    // Usar setTimeout para garantir que o callback complete antes de chamar unsub
                    setTimeout(() => {
                        unsub();
                        r();
                    }, 0);
                });
            })
        ]).then(() => {
            // Processar os dados após estarem carregados
            debugLog(`[Storage] Encontrados ${allItems.length} itens, ${allNotes.length} notas e ${allFlashcards.length} flashcards`);
  
  // --- CORREÇÃO DE REFERÊNCIAS ENTRE ITENS E NOTAS ---
  
  // Verificar notas com itemId inválido
  const notesWithInvalidItem = allNotes.filter(note => 
    !note.itemId || !allItems.some(item => item.id === note.itemId)
  );
  
  // Verificar itens com noteIds inválidos
  const itemsWithInvalidNotes = allItems.filter(item => {
    if (!item.noteIds) return false;
    return item.noteIds.some(noteId => !allNotes.some(note => note.id === noteId));
  });
  
  // Verificar notas que não estão referenciadas nos itens
  const notesNotReferencedInItems = allNotes.filter(note => {
    const relatedItem = allItems.find(item => item.id === note.itemId);
    return !relatedItem || !relatedItem.noteIds || !relatedItem.noteIds.includes(note.id);
  });
  
  // --- CORREÇÃO DE REFERÊNCIAS ENTRE ITENS E FLASHCARDS ---
  
  // Verificar flashcards com itemId inválido
  const flashcardsWithInvalidItem = allFlashcards.filter(card => 
    !card.itemId || !allItems.some(item => item.id === card.itemId)
  );
  
  // Verificar itens com flashcardIds inválidos
  const itemsWithInvalidFlashcards = allItems.filter(item => {
    if (!item.flashcardIds) return false;
    return item.flashcardIds.some(cardId => !allFlashcards.some(card => card.id === cardId));
  });
  
  // Verificar flashcards que não estão referenciados nos itens
  const flashcardsNotReferencedInItems = allFlashcards.filter(card => {
    const relatedItem = allItems.find(item => item.id === card.itemId);
    return !relatedItem || !relatedItem.flashcardIds || !relatedItem.flashcardIds.includes(card.id);
  });
  
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
                  debugLog(`[Storage] Atualizando noteIds para o item ${item.id}`);
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
                  debugLog(`[Storage] Atualizando flashcardIds para o item ${item.id}`);
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
                debugLog("[Storage] Atualizando itens para corrigir referências");
    savedItems.set(correctedItems);
  }
  
            const result = {
    itemsUpdated,
    notesWithInvalidItem: notesWithInvalidItem.length,
    itemsWithInvalidNotes: itemsWithInvalidNotes.length,
    notesNotReferencedInItems: notesNotReferencedInItems.length,
    flashcardsWithInvalidItem: flashcardsWithInvalidItem.length,
    itemsWithInvalidFlashcards: itemsWithInvalidFlashcards.length,
    flashcardsNotReferencedInItems: flashcardsNotReferencedInItems.length
  };
            
            console.log("[Storage] Correção de referências concluída", result);
            resolve(result);
        });
    });
}

// Adicionar utilitários otimizados para relacionamentos entre entidades
export const itemLinksUtils = {
    getNotesForItem: (itemId: string): Promise<Note[]> => {
        return new Promise((resolve) => {
            const unsubscribe = notes.subscribe((allNotes) => {
                // Filtrar de forma mais eficiente
                const filteredNotes = allNotes.filter(note => note.itemId === itemId);
                // Usar setTimeout para garantir que o callback complete antes de chamar unsubscribe
                setTimeout(() => {
                unsubscribe();
                    resolve(filteredNotes);
                }, 0);
            });
        });
    },
    
    getFlashcardsForItem: (itemId: string): Promise<Flashcard[]> => {
        return new Promise((resolve) => {
            const unsubscribe = flashcards.subscribe((allFlashcards) => {
                // Filtrar de forma mais eficiente
                const filteredFlashcards = allFlashcards.filter(flashcard => flashcard.itemId === itemId);
                // Usar setTimeout para garantir que o callback complete antes de chamar unsubscribe
                setTimeout(() => {
                unsubscribe();
                    resolve(filteredFlashcards);
                }, 0);
            });
        });
    },
    
    getItemById: (itemId: string): Promise<SavedItem | undefined> => {
        return new Promise((resolve) => {
            const unsubscribe = savedItems.subscribe((items) => {
                // Encontrar de forma mais eficiente
                const item = items.find(item => item.id === itemId);
                // Usar setTimeout para garantir que o callback complete antes de chamar unsubscribe
                setTimeout(() => {
                unsubscribe();
                    resolve(item);
                }, 0);
            });
        });
    }
};

// Função para obter todas as tags únicas do sistema
export function getAllTags(): Promise<string[]> {
  return new Promise((resolve) => {
    Promise.all([
      new Promise<string[]>(r => {
        const unsub = savedItems.subscribe(items => {
          const itemTags = items.flatMap(item => item.tags || []);
          // Usar setTimeout para garantir que o callback complete antes de chamar unsub
          setTimeout(() => {
            unsub();
            r(itemTags);
          }, 0);
        });
      }),
      new Promise<string[]>(r => {
        const unsub = notes.subscribe(notesList => {
          const noteTags = notesList.flatMap(note => note.tags || []);
          // Usar setTimeout para garantir que o callback complete antes de chamar unsub
          setTimeout(() => {
            unsub();
            r(noteTags);
          }, 0);
        });
      }),
      new Promise<string[]>(r => {
        const unsub = flashcards.subscribe(cardsList => {
          const cardTags = cardsList.flatMap(card => card.tags || []);
          // Usar setTimeout para garantir que o callback complete antes de chamar unsub
          setTimeout(() => {
            unsub();
            r(cardTags);
          }, 0);
        });
      }),
      // Obter tags diretamente do storage para garantir consistência
      new Promise<string[]>(r => {
        chrome.storage.local.get(['savedItems'], (result) => {
          if (result.savedItems && Array.isArray(result.savedItems)) {
            const storageTags = result.savedItems.flatMap(item => item.tags || []);
            r(storageTags);
          } else {
            r([]);
          }
        });
      })
    ]).then(([itemTags, noteTags, cardTags, storageTags]) => {
      // Combinar todas as tags e remover duplicatas
      const allTags = [...itemTags, ...noteTags, ...cardTags, ...storageTags];
      const uniqueTags = [...new Set(allTags)].sort();
      resolve(uniqueTags);
    });
  });
}
