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
            let valueToSet = result[key];
            // --- ADICIONAR VALIDAÇÃO ESPECÍFICA PARA savedItems ---
            if (key === 'savedItems' && Array.isArray(valueToSet)) {
                console.log(`[Storage] Validando groupIds para ${valueToSet.length} itens.`);
                let changed = false;
                valueToSet = valueToSet.map((item: any) => { // Usar 'any' temporariamente para acesso seguro
                    if (item && (!Array.isArray(item.groupIds) && item.groupIds !== undefined)) { 
                         // Apenas corrige se existe mas NÃO é array (preserva undefined)
                        console.warn(`[Storage] Corrigindo item.groupIds inválido durante a carga para item ${item.id}. Valor era:`, item.groupIds);
                        changed = true;
                        return { ...item, groupIds: [] };
                    }
                    return item;
                });
                if(changed) console.log(`[Storage] Validação de groupIds concluída, ${key} foi modificado.`);
            }
            // --- FIM DA VALIDAÇÃO ---
            store.set(valueToSet); 
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
// NOVA STORE para tags conhecidas
export const knownTags = createPersistentStore<string[]>('knownTags', []);

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

// Função para obter todas as tags únicas dos itens (MANTER ESTA)
// Esta função ainda pode ser útil, mas NÃO é usada para availableTags em SavedItemsView
export function getAllTags(items: SavedItem[] | undefined): string[] {
    if (!items) return [];
    const allTagsSet = new Set<string>();
    items.forEach(item => {
      if (item.tags && Array.isArray(item.tags)) {
        item.tags.forEach(tag => {
          if (typeof tag === 'string' && tag.trim()) {
            allTagsSet.add(tag.trim());
          }
        });
      }
    });
    return Array.from(allTagsSet).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

// Nova função para criar um grupo
export async function createGroup(name: string, color?: string): Promise<Group | null> {
  if (!name?.trim()) {
    console.error("[Storage] Tentativa de criar grupo sem nome.");
    return null;
  }
  const trimmedName = name.trim();

  // Obter grupos atuais para verificar duplicatas
  let currentGroups: Group[] = [];
  try {
    // Usar a store Svelte diretamente é mais simples aqui se estivermos no contexto da extensão
    currentGroups = get(groups); 
  } catch (error) {
    console.error("[Storage] Erro ao buscar grupos existentes para verificação:", error);
    // Continuar mesmo se a verificação falhar? Ou retornar null? Por enquanto, continua.
  }

  // Verificar se já existe um grupo com o mesmo nome (case-insensitive)
  const existingGroup = currentGroups.find(g => g.name.toLowerCase() === trimmedName.toLowerCase());
  if (existingGroup) {
    console.warn(`[Storage] Grupo com nome \"${trimmedName}\" já existe.`);
    return null; // Indica que um *novo* grupo não foi criado
  }

  // Criar novo grupo
  const newGroup: Group = {
    id: crypto.randomUUID(),
    name: trimmedName,
    color: color || '#cccccc', // Cor padrão se não fornecida
    itemIds: [] // Inicializa vazio
  };

  console.log("[Storage] Criando novo grupo:", newGroup);

  // Atualizar a store diretamente
  try {
    groups.update(allGroups => [...allGroups, newGroup]);
    await groups.forceSync?.(); // Forçar salvamento no storage se a função existir
    console.log("[Storage] Novo grupo salvo com sucesso.");
    return newGroup; // Retorna o grupo recém-criado
  } catch (error) {
    console.error("[Storage] Erro ao salvar novo grupo:", error);
    return null; // Retorna null em caso de erro no salvamento
  }
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
        // Garantir que groupIds seja SEMPRE um array (ou inicializado se não existir)
        if (!item.groupIds || !Array.isArray(item.groupIds)) {
          console.warn(`[Storage] Corrigindo item.groupIds inválido para item ${item.id}. Valor era:`, item.groupIds);
          item.groupIds = [];
          itemsUpdated++;
          itemsModified = true;
          // Não continue aqui, precisamos verificar os IDs vazios a seguir
        }
        
        // Verificar se os grupos referenciados existem (agora sabemos que groupIds é um array)
        const validGroupIds = item.groupIds.filter(groupId => 
          allGroups.some(group => group.id === groupId)
        );
        
        if (validGroupIds.length !== item.groupIds.length) {
          console.warn(`[Storage] Removendo groupIds inválidos do item ${item.id}`);
          item.groupIds = validGroupIds;
          itemsUpdated++;
          itemsModified = true;
        }
      }
      
      // 2. Verificar e corrigir itens referenciados em grupos que não existem
      for (const group of allGroups) {
         // Garantir que itemIds seja SEMPRE um array
        if (!group.itemIds || !Array.isArray(group.itemIds)) {
          console.warn(`[Storage] Corrigindo group.itemIds inválido para grupo ${group.id}. Valor era:`, group.itemIds);
          group.itemIds = [];
          groupsUpdated++;
          groupsModified = true;
          // Não continue
        }
        
        // Verificar se os itens referenciados existem (agora sabemos que itemIds é um array)
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

// --- NOVAS FUNÇÕES DE GERENCIAMENTO --- 

/**
 * Atualiza o nome e/ou cor de um grupo existente.
 * @param groupId O ID do grupo a ser atualizado.
 * @param updates Um objeto contendo as propriedades a serem atualizadas (name?, color?).
 * @returns True se o grupo foi atualizado, False caso contrário (ex: grupo não encontrado).
 */
export async function updateGroup(groupId: string, updates: { name?: string; color?: string }): Promise<boolean> {
  let found = false;
  groups.update(currentGroups => {
    return currentGroups.map(group => {
      if (group.id === groupId) {
        found = true;
        return { 
          ...group, 
          ...(updates.name !== undefined && { name: updates.name.trim() }),
          ...(updates.color !== undefined && { color: updates.color }) 
        };
      }
      return group;
    });
  });
  if (found) {
     await (groups as any).forceSync?.(); // Força salvamento
  }
  return found;
}

/**
 * Exclui um grupo e remove sua referência de todos os itens salvos.
 * @param groupId O ID do grupo a ser excluído.
 * @returns True se o grupo foi excluído, False caso contrário.
 */
export async function deleteGroup(groupId: string): Promise<boolean> {
  let deleted = false;
  groups.update(currentGroups => {
    const initialLength = currentGroups.length;
    const updatedGroups = currentGroups.filter(group => group.id !== groupId);
    deleted = updatedGroups.length < initialLength;
    return updatedGroups;
  });

  if (deleted) {
    // Remove a referência do grupo dos itens
    savedItems.update(currentItems => {
      return currentItems.map(item => {
        if (item.groupIds && item.groupIds.includes(groupId)) {
          return {
            ...item,
            groupIds: item.groupIds.filter(id => id !== groupId)
          };
        }
        return item;
      });
    });
    // Força o salvamento de ambos os stores modificados
    await Promise.all([
      (groups as any).forceSync?.(),
      (savedItems as any).forceSync?.()
    ]);
  }
  return deleted;
}

// --- Funções de Manipulação de Tags ---

// NOVA FUNÇÃO para adicionar à lista mestra
export function addKnownTagIfNotExists(tagName: string): void {
    const trimmedTagName = tagName.trim();
    if (!trimmedTagName) return;
    const lowerCaseTag = trimmedTagName.toLowerCase();
    knownTags.update(currentKnownTags => {
        if (!currentKnownTags.some(t => t.toLowerCase() === lowerCaseTag)) {
            console.log(`[Storage] Adicionando nova tag à lista conhecida: ${trimmedTagName}`);
            // Adiciona com a capitalização original e ordena
            return [...currentKnownTags, trimmedTagName].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })); 
        }
        return currentKnownTags; // Nenhuma mudança necessária
    });
}

export async function renameTagGlobally(oldName: string, newName: string): Promise<void> {
   const trimmedNewName = newName.trim();
   if (!trimmedNewName || oldName === trimmedNewName) return;
   console.log(`[Storage] Renomeando tag globalmente de "${oldName}" para "${trimmedNewName}"`);
   try {
        // Atualiza savedItems (CORRIGIDO)
        savedItems.update((currentItems): SavedItem[] => 
            currentItems.map((item: SavedItem): SavedItem => {
                if (item.tags && item.tags.includes(oldName)) {
                    const updatedTags = Array.from(new Set(item.tags.filter((t: string) => t !== oldName).concat(trimmedNewName)));
                    return { ...item, tags: updatedTags };
                }
                return item;
            })
        );

        // Atualiza notes (CORRIGIDO)
        notes.update((currentNotes): Note[] => 
            currentNotes.map((note: Note): Note => {
                 if (note.tags && note.tags.includes(oldName)) {
                     const updatedTags = Array.from(new Set(note.tags.filter((t: string) => t !== oldName).concat(trimmedNewName)));
                    return { ...note, tags: updatedTags };
                }
                return note;
            })
        );

        // Atualiza flashcards (CORRIGIDO)
        flashcards.update((currentCards): Flashcard[] => 
            currentCards.map((card: Flashcard): Flashcard => {
                 if (card.tags && card.tags.includes(oldName)) {
                     const updatedTags = Array.from(new Set(card.tags.filter((t: string) => t !== oldName).concat(trimmedNewName)));
                    return { ...card, tags: updatedTags };
                }
                return card;
            })
        );

        // ATUALIZA a lista knownTags (lógica existente)
        knownTags.update(currentKnownTags => {
            const lowerOldName = oldName.toLowerCase();
            const index = currentKnownTags.findIndex(t => t.toLowerCase() === lowerOldName);
            if (index > -1) {
                // Remove a antiga, adiciona a nova e ordena
                const updatedKnownTags = currentKnownTags.filter((_, i) => i !== index);
                // Verifica se a nova já existe (após remover a antiga)
                if (!updatedKnownTags.some(t => t.toLowerCase() === trimmedNewName.toLowerCase())) {
                     updatedKnownTags.push(trimmedNewName);
                }
                return updatedKnownTags.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
            } else {
                 // Se a antiga não estava na lista, adiciona a nova se ela não existir ainda
                 if (!currentKnownTags.some(t => t.toLowerCase() === trimmedNewName.toLowerCase())) {
                     return [...currentKnownTags, trimmedNewName].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
                 }
            }
            return currentKnownTags; // Nenhuma mudança se a antiga não existia e a nova já existe
        });

         console.log(`[Storage] Tag "${oldName}" renomeada globalmente para "${trimmedNewName}".`);
    } catch (error) {
        console.error(`[Storage] Erro ao renomear tag "${oldName}" globalmente:`, error);
        throw error;
    }
}

export async function deleteTagGlobally(tagName: string): Promise<void> {
  const trimmedTagName = tagName.trim();
  if (!trimmedTagName) return;
  console.log(`[Storage] Excluindo tag globalmente: "${trimmedTagName}"`);
  try {
        // Atualiza savedItems (CORRIGIDO)
        savedItems.update((currentItems): SavedItem[] => 
            currentItems.map((item: SavedItem): SavedItem => {
                if (item.tags && item.tags.includes(trimmedTagName)) {
                    return { ...item, tags: item.tags.filter((t: string) => t !== trimmedTagName) };
                }
                return item;
            })
        );

        // Atualiza notes (CORRIGIDO)
        notes.update((currentNotes): Note[] => 
            currentNotes.map((note: Note): Note => {
                 if (note.tags && note.tags.includes(trimmedTagName)) {
                    return { ...note, tags: note.tags.filter((t: string) => t !== trimmedTagName) };
                }
                return note;
            })
        );

        // Atualiza flashcards (CORRIGIDO)
        flashcards.update((currentCards): Flashcard[] => 
            currentCards.map((card: Flashcard): Flashcard => {
                 if (card.tags && card.tags.includes(trimmedTagName)) {
                    return { ...card, tags: card.tags.filter((t: string) => t !== trimmedTagName) };
                }
                return card;
            })
        );

        // REMOVE da lista knownTags (lógica existente)
        knownTags.update(currentKnownTags => {
            const lowerTagName = trimmedTagName.toLowerCase();
            const updatedKnownTags = currentKnownTags.filter(t => t.toLowerCase() !== lowerTagName);
            // Retorna a lista filtrada (não precisa ordenar aqui)
            return updatedKnownTags;
        });

        console.log(`[Storage] Tag "${trimmedTagName}" excluída globalmente.`);
    } catch (error) {
        console.error(`[Storage] Erro ao excluir tag "${trimmedTagName}" globalmente:`, error);
        throw error;
    }
}

export async function deleteAllTagsGlobally(): Promise<void> {
  console.log("[Storage] Iniciando exclusão de todas as tags globalmente...");
  try {
      // Atualiza savedItems, notes, flashcards (como antes, com tipos corrigidos)
      savedItems.update(currentItems => currentItems.map(item => (
          { ...item, tags: [] }
      )));
      notes.update(currentNotes => currentNotes.map(note => (
          { ...note, tags: [] }
      )));
      flashcards.update(currentCards => currentCards.map(card => (
          { ...card, tags: [] }
      )));

      // LIMPA a lista knownTags
      knownTags.set([]);

      console.log("[Storage] Todas as tags foram removidas globalmente (incluindo lista conhecida).");
  } catch (error) {
      console.error("[Storage] Erro ao excluir todas as tags globalmente:", error);
      throw error;
  }
}

// NOVA FUNÇÃO
export async function deleteAllGroupsGlobally(): Promise<void> {
    console.log("[Storage] Iniciando exclusão de todos os grupos...");
    try {
        // 1. Limpa a lista de grupos
        groups.set([]);
        console.log("[Storage] Lista de grupos zerada.");

        // 2. Remove todas as referências de groupIds dos itens
        savedItems.update(currentItems => {
            let itemsUpdated = 0;
            const updatedItems = currentItems.map(item => {
                // Só modifica se groupIds existe e tem conteúdo
                if (item.groupIds && item.groupIds.length > 0) {
                    itemsUpdated++;
                    // Retorna o item com groupIds vazio
                    return { ...item, groupIds: [] }; 
                }
                // Retorna o item original se não tinha groupIds ou já estava vazio
                return item;
            });
            console.log(`[Storage] ${itemsUpdated} itens tiveram seus groupIds removidos.`);
            return updatedItems;
        });

        console.log("[Storage] Exclusão de todos os grupos concluída.");

    } catch (error) {
        console.error("[Storage] Erro ao excluir todos os grupos globalmente:", error);
        // Relança o erro para que a função chamadora possa tratar (e.g., mostrar toast de erro)
        throw error; 
    }
}

// Função para atualizar campos específicos de um SavedItem
export async function updateItem(itemId: string, updates: Partial<SavedItem>): Promise<boolean> {
  let itemFound = false;
  savedItems.update((items) => {
    const itemIndex = items.findIndex((item) => item.id === itemId);
    if (itemIndex !== -1) {
      // Aplica as atualizações ao item encontrado
      items[itemIndex] = { ...items[itemIndex], ...updates };
      itemFound = true;
      console.log(`[Storage] Item ${itemId} atualizado com:`, updates);
    } else {
      console.warn(`[Storage] Tentativa de atualizar item não encontrado: ${itemId}`);
    }
    return items; // Retorna o array modificado (ou não) para a store
  });

  // Forçar a sincronização pode ser útil se a atualização precisar ser refletida
  // imediatamente em outras partes que leem diretamente do chrome.storage
  // await savedItems.forceSync(); // Descomentar se necessário

  return itemFound;
}
