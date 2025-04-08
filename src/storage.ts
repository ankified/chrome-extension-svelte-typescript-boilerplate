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
    console.log(`[Storage] Inicializando store para "${key}"`);
    chrome.storage.local.get([key]).then((result) => {
        console.log(`[Storage] Dados carregados do chrome.storage.local para "${key}":`, result[key]);
        if (result[key]) {
            store.set(result[key]);
        }
        isInitialized = true;
    }).catch(error => {
        console.error(`[Storage] Erro ao carregar dados para ${key}:`, error);
        isInitialized = true; // Ainda consideramos inicializado para evitar bloqueios
    });
    
    // Controlar número de operações de escrita
    let lastSyncTime = 0;
    const MIN_SYNC_INTERVAL = 5000; // 5 segundos entre sincronizações
    
    // Inscrever-se para alterações e salvar no storage de forma otimizada
    store.subscribe((value) => {
        if (!isInitialized) {
            console.log(`[Storage] Store "${key}" ainda não inicializada, adiando gravação`);
            return;
        }
        
        if (updateScheduled) {
            console.log(`[Storage] Atualização já agendada para "${key}", ignorando`);
            return;
        }
        
        console.log(`[Storage] Atualizando store "${key}" com novo valor:`, value);
        
        // Utilizar uma abordagem mais direta para salvar os dados imediatamente
        // para evitar problemas de sincronização
        updateScheduled = true;
        const update = () => {
            console.log(`[Storage] Gravando dados no chrome.storage.local para \"${key}\"`);
            // Guardar o valor atual para usar no callback
            const currentValue = get(store); 
            chrome.storage.local.set({ [key]: currentValue }, () => {
                const error = chrome.runtime.lastError;
                if (error) {
                    console.error(`[Storage] Erro ao salvar \"${key}\" no storage.local:`, error);
                } else {
                    console.log(`[Storage] Dados salvos com sucesso no storage.local para \"${key}\"`);
                }
                
                // Manter a lógica de sincronização com storage.sync (se aplicável)
                const currentTime = Date.now();
                if (key === 'savedItems' || key === 'groups') {
                    // Verificar se passou tempo suficiente desde a última sincronização
                    if (currentTime - lastSyncTime > MIN_SYNC_INTERVAL) {
                        console.log(`[Storage] Gravando dados no chrome.storage.sync para \"${key}\"`);
                        // Usar currentValue aqui também para garantir que estamos sincronizando o que foi salvo
                        chrome.storage.sync.set({ [key]: currentValue }).then(() => {
                            console.log(`[Storage] Dados salvos com sucesso no storage.sync para \"${key}\"`);
                            lastSyncTime = currentTime;
                        }).catch(err => {
                            console.error(`[Storage] Erro ao sincronizar ${key} com storage.sync:`, err);
                        });
                    } else {
                        console.log(`[Storage] Ignorando sincronização com storage.sync para \"${key}\" (intervalo muito curto)`);
                    }
                }
                
                // Liberar o agendamento apenas após todas as operações (local e sync) terem sido iniciadas/concluídas
                updateScheduled = false; 
            });
        };
        
        // Executar a atualização imediatamente para garantir persistência
        update();
    });
    
    // Adicionar um método para forçar a sincronização imediata com o storage
    const forceSync = () => {
        console.log(`[Storage] Forçando sincronização para "${key}"`);
        const value = get(store);
        
        return new Promise<void>((resolve, reject) => {
            // Sempre salvamos no storage.local
            chrome.storage.local.set({ [key]: value }, () => {
                const error = chrome.runtime.lastError;
                if (error) {
                    console.error(`[Storage] Erro ao forçar sincronização de "${key}" no storage.local:`, error);
                    reject(error);
        } else {
                    console.log(`[Storage] Sincronização forçada concluída para "${key}" no storage.local`);
                    resolve();
                }
            });
        });
    };
    
    // Adiciona listener para mudanças no storage (local e sync)
    chrome.storage.onChanged.addListener((changes, areaName) => {
        // Verificar se a mudança ocorreu para a chave desta store
        if (changes[key] && changes[key].newValue !== undefined) {
            console.log(`[Storage] Detectada mudança externa em \"${key}\" na área \"${areaName}\":`, changes[key].newValue);
            
            // Obter o valor atual da store Svelte
            const currentValue = get(store);
            
            // Comparar JSON stringified para evitar atualizações desnecessárias se o valor for o mesmo
            // Isso previne loops de atualização se a própria escrita da store disparar o onChanged
            if (JSON.stringify(changes[key].newValue) !== JSON.stringify(currentValue)) {
                console.log(`[Storage] Atualizando store \"${key}\" com valor externo da área \"${areaName}\".`);
                store.set(changes[key].newValue);
            } else {
                console.log(`[Storage] Mudança externa em \"${key}\" na área \"${areaName}\" ignorada (valor idêntico ao atual).`);
            }
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
    // Priorizar obter tags do storage local para maior consistência
    chrome.storage.local.get(['savedItems', 'notes', 'flashcards'], (result) => {
      let allTags: string[] = [];
      
      // Extrair tags dos itens salvos
      if (result.savedItems && Array.isArray(result.savedItems)) {
        const itemTags = result.savedItems
          .flatMap(item => item.tags || [])
          .filter(tag => typeof tag === 'string');
        allTags = [...allTags, ...itemTags];
      }
      
      // Extrair tags das notas
      if (result.notes && Array.isArray(result.notes)) {
        const noteTags = result.notes
          .flatMap(note => note.tags || [])
          .filter(tag => typeof tag === 'string');
        allTags = [...allTags, ...noteTags];
      }
      
      // Extrair tags dos flashcards
      if (result.flashcards && Array.isArray(result.flashcards)) {
        const cardTags = result.flashcards
          .flatMap(card => card.tags || [])
          .filter(tag => typeof tag === 'string');
        allTags = [...allTags, ...cardTags];
      }
      
      // Remover duplicatas e ordenar
      const uniqueTags = [...new Set(allTags)].sort();
      resolve(uniqueTags);
    });
  });
}

// Função para verificar e corrigir a integridade das relações entre itens e grupos
export function verifyAndFixGroupRelations() {
  console.log("[Storage] Iniciando verificação e correção das relações entre itens e grupos");
  
  return new Promise<{ success: boolean, itemsUpdated: number, groupsUpdated: number }>(async (resolve) => {
    // Obter todos os itens e grupos do armazenamento
    const allItems: SavedItem[] = [];
    const allGroups: Group[] = [];
    
    try {
      // Buscar dados diretamente do storage para garantir dados atualizados
      const itemsResult = await chrome.storage.local.get(['savedItems']);
      if (itemsResult.savedItems) {
        allItems.push(...itemsResult.savedItems);
      }
      
      const groupsResult = await chrome.storage.local.get(['groups']);
      if (groupsResult.groups) {
        allGroups.push(...groupsResult.groups);
      }
      
      console.log(`[Storage] Encontrados ${allItems.length} itens e ${allGroups.length} grupos para verificar`);
      
      let itemsUpdated = 0;
      let groupsUpdated = 0;
      let itemsModified = false;
      let groupsModified = false;
      
      // 1. Verificar e corrigir grupos referenciados em itens que não existem
      for (const item of allItems) {
        if (!item.groupIds) {
          item.groupIds = [];
          itemsUpdated++;
          itemsModified = true;
          continue;
        }
        
        // Garantir que groupIds seja um array
        if (!Array.isArray(item.groupIds)) {
          item.groupIds = [];
          itemsUpdated++;
          itemsModified = true;
          continue;
        }
        
        // Verificar se os grupos referenciados existem
        const validGroupIds = item.groupIds.filter(groupId => 
          allGroups.some(group => group.id === groupId)
        );
        
        if (validGroupIds.length !== item.groupIds.length) {
          item.groupIds = validGroupIds;
          itemsUpdated++;
          itemsModified = true;
        }
      }
      
      // 2. Verificar e corrigir itens referenciados em grupos que não existem
      for (const group of allGroups) {
        if (!group.itemIds) {
          group.itemIds = [];
          groupsUpdated++;
          groupsModified = true;
          continue;
        }
        
        // Garantir que itemIds seja um array
        if (!Array.isArray(group.itemIds)) {
          group.itemIds = [];
          groupsUpdated++;
          groupsModified = true;
          continue;
        }
        
        // Verificar se os itens referenciados existem
        const validItemIds = group.itemIds.filter(itemId => 
          allItems.some(item => item.id === itemId)
        );
        
        if (validItemIds.length !== group.itemIds.length) {
          group.itemIds = validItemIds;
          groupsUpdated++;
          groupsModified = true;
        }
      }
      
      // 3. Verificar referências cruzadas: se um item está em um grupo, o grupo deve estar no item
      for (const item of allItems) {
        let itemUpdated = false;
        
        // Para cada grupo referenciado no item, verificar se o item está no grupo
        for (const groupId of [...item.groupIds]) {
          const group = allGroups.find(g => g.id === groupId);
          if (group && !group.itemIds.includes(item.id)) {
            // Adicionar o item ao grupo
            group.itemIds.push(item.id);
            groupsUpdated++;
            groupsModified = true;
          }
        }
        
        // Verificar grupos que contêm este item mas não estão listados no item
        for (const group of allGroups) {
          if (group.itemIds.includes(item.id) && !item.groupIds.includes(group.id)) {
            // Adicionar o grupo ao item
            item.groupIds.push(group.id);
            itemUpdated = true;
            itemsModified = true;
          }
        }
        
        if (itemUpdated) {
          itemsUpdated++;
        }
      }
      
      // Atualizar as stores SOMENTE se houve modificações
      if (itemsModified) {
          console.log("[Storage] Aplicando atualizações em savedItems store devido à correção.");
          savedItems.set(allItems);
      }
      if (groupsModified) {
          console.log("[Storage] Aplicando atualizações em groups store devido à correção.");
          groups.set(allGroups);
      }
      
      console.log(`[Storage] Correção concluída: ${itemsUpdated} itens e ${groupsUpdated} grupos atualizados`);
      
      resolve({ 
        success: true, 
        itemsUpdated, 
        groupsUpdated 
      });
    } catch (error) {
      console.error("[Storage] Erro ao verificar relações:", error);
      resolve({ 
        success: false, 
        itemsUpdated: 0, 
        groupsUpdated: 0 
      });
    }
  });
}
