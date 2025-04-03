<script lang="ts">
  import { savedItems, groups, verifyAndFixGroupRelations } from "../../storage";
  import type { SavedItem } from "../../types";
  import * as AlertDialog from "../../lib/components/ui/alert-dialog/index.js";
  import { toast } from "svelte-sonner";
  import { onMount } from "svelte";
  
  // Estado da interface
  let searchQuery = $state("");
  let selectedGroup = $state("");
  let selectedTags = $state<string[]>([]);
  let sortCriteria = $state("dateAdded");
  let sortDirection = $state("desc");
  let showRemoveAllTagsDialog = $state(false);
  let editingTagItem = $state<SavedItem | null>(null);
  let editTagInput = $state("");
  let addingTagItem = $state<SavedItem | null>(null);
  let newTagInput = $state("");
  
  // Novos estados para gerenciar tags globalmente
  let showRemoveTagDialog = $state(false);
  let tagToRemoveGlobally = $state("");
  let showEditTagDialog = $state(false);
  let tagToEditGlobally = $state("");
  let newTagNameGlobally = $state("");
  
  // Estado para controlar carregamento inicial
  let isVerifyingRelations = $state(false);
  
  // Dados reativos filtrados
  let filteredItems = $derived(filterItems($savedItems, searchQuery, selectedGroup, selectedTags));
  let sortedItems = $derived(sortItems(filteredItems, sortCriteria, sortDirection));
  let availableTags = $derived(getAllTags($savedItems));
  
  // Listener para mudanças nas stores
  $effect(() => {
    // Quando os dados de savedItems ou groups mudarem, verificar relações
    if ($savedItems && $savedItems.length > 0 && $groups && $groups.length > 0) {
      console.log("[SavedItemsView] Dados mudaram, verificando relações...");
      checkAndFixGroupRelations();
    }
  });
  
  // Função para verificar e corrigir relações de grupos na inicialização
  async function checkAndFixGroupRelations() {
    if (isVerifyingRelations) return; // Evitar chamadas simultâneas
    
    isVerifyingRelations = true;
    try {
      console.log("[SavedItemsView] Verificando relações de grupos...");
      const result = await verifyAndFixGroupRelations();
      
      if (result.itemsUpdated > 0 || result.groupsUpdated > 0) {
        console.log(`[SavedItemsView] Relações corrigidas: ${result.itemsUpdated} itens e ${result.groupsUpdated} grupos atualizados`);
      } else {
        console.log("[SavedItemsView] Relações de grupos já estão corretas");
      }
    } catch (error) {
      console.error("[SavedItemsView] Erro ao verificar relações de grupos:", error);
    } finally {
      isVerifyingRelations = false;
    }
  }
  
  // Inicializar verificação de relações na montagem do componente
  onMount(() => {
    checkAndFixGroupRelations();
  });
  
  // Funções
  function filterItems(items: SavedItem[], query: string, groupId: string, tags: string[]) {
    return items.filter(item => {
      // Filtrar por pesquisa
      const matchesQuery = !query || 
        item.title.toLowerCase().includes(query.toLowerCase()) || 
        item.url.toLowerCase().includes(query.toLowerCase()) ||
        (item.comments && item.comments.toLowerCase().includes(query.toLowerCase()));
      
      // Filtrar por grupo
      const matchesGroup = !groupId || (item.groupIds && item.groupIds.includes(groupId));
      
      // Filtrar por tags - Versão corrigida com verificação de tipo
      const matchesTags = tags.length === 0 || 
        (item.tags && Array.isArray(item.tags) && 
        tags.every(tag => item.tags.some(itemTag => 
          itemTag.toLowerCase() === tag.toLowerCase()
         )));
      
      return matchesQuery && matchesGroup && matchesTags;
    });
  }
  
  function sortItems(items: SavedItem[], criteria: string, direction: string) {
    return [...items].sort((a, b) => {
      let comparison = 0;
      
      if (criteria === "dateAdded") {
        comparison = a.dateAdded - b.dateAdded;
      } else if (criteria === "title") {
        comparison = a.title.localeCompare(b.title);
      }
      
      return direction === "desc" ? -comparison : comparison;
    });
  }
  
  function getAllTags(items: SavedItem[]) {
    const tagsSet = new Set<string>();
    items.forEach(item => {
      // Verificar se item.tags é um array antes de iterá-lo
      if (item.tags && Array.isArray(item.tags)) {
        item.tags.forEach(tag => {
          // Verificar se a tag é uma string antes de adicioná-la
          if (typeof tag === 'string') {
            tagsSet.add(tag.toLowerCase());
          }
        });
      }
    });
    return Array.from(tagsSet).sort();
  }
  
  function toggleTag(tag: string) {
    if (selectedTags.includes(tag)) {
      selectedTags = selectedTags.filter(t => t !== tag);
    } else {
      selectedTags = [...selectedTags, tag];
    }
  }
  
  function formatDate(timestamp: number) {
    return new Date(timestamp).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }
  
  function deleteItem(id: string) {
    if (confirm("Tem certeza que deseja excluir este item?")) {
      savedItems.update(items => items.filter(item => item.id !== id));
      
      // Remover referências do item em grupos
      groups.update(currentGroups => 
        currentGroups.map(group => ({
          ...group,
          itemIds: group.itemIds.filter(itemId => itemId !== id)
        }))
      );
    }
  }
  
  function openURL(url: string) {
    chrome.tabs.create({ url });
  }
  
  // Funções para gerenciamento de tags em itens individuais
  function removeTagFromItem(item: SavedItem, tagToRemove: string) {
    if (!item.tags || !Array.isArray(item.tags)) return;
    
    savedItems.update(items => {
      return items.map(i => {
        if (i.id === item.id) {
          return {
            ...i,
            tags: i.tags.filter(tag => tag !== tagToRemove)
          };
        }
        return i;
      });
    });
    
    toast.success(`Tag "${tagToRemove}" removida com sucesso.`);
  }
  
  function editTag(item: SavedItem, tag: string) {
    editingTagItem = item;
    editTagInput = tag;
  }
  
  function saveEditedTag(item: SavedItem, oldTag: string) {
    if (!editTagInput.trim()) {
      cancelEditTag();
      return;
    }
    
    const newTag = editTagInput.trim();
    
    savedItems.update(items => {
      return items.map(i => {
        if (i.id === item.id) {
          return {
            ...i,
            tags: i.tags.map(tag => 
              tag === oldTag ? newTag : tag
            )
          };
        }
        return i;
      });
    });
    
    toast.success(`Tag "${oldTag}" alterada para "${newTag}".`);
    cancelEditTag();
  }
  
  function cancelEditTag() {
    editingTagItem = null;
    editTagInput = "";
  }
  
  // Função para adicionar nova tag a um item
  function startAddingTag(item: SavedItem) {
    addingTagItem = item;
    newTagInput = "";
  }
  
  function saveNewTag(item: SavedItem) {
    if (!newTagInput.trim()) {
      cancelAddTag();
      return;
    }
    
    const newTag = newTagInput.trim();
    
    savedItems.update(items => {
      return items.map(i => {
        if (i.id === item.id) {
          // Cria novo array de tags se não existir
          const currentTags = Array.isArray(i.tags) ? [...i.tags] : [];
          
          // Verifica se a tag já existe (case-insensitive)
          const tagExists = currentTags.some(tag => 
            typeof tag === 'string' && tag.toLowerCase() === newTag.toLowerCase()
          );
          
          // Adiciona a tag apenas se ela não existir
          if (!tagExists) {
            return {
              ...i,
              tags: [...currentTags, newTag]
            };
          }
        }
        return i;
      });
    });
    
    // Força a sincronização imediata para garantir que as mudanças sejam salvas
    setTimeout(() => {
      (savedItems as any).forceSync?.();
    }, 100);
    
    toast.success(`Tag "${newTagInput}" adicionada com sucesso.`);
    cancelAddTag();
  }
  
  function cancelAddTag() {
    addingTagItem = null;
    newTagInput = "";
  }
  
  // Novas funções para gerenciamento global de tags
  function openRemoveTagDialog(tag: string) {
    tagToRemoveGlobally = tag;
    showRemoveTagDialog = true;
  }
  
  function confirmRemoveTag() {
    if (!tagToRemoveGlobally) return;
    
    const tagToRemove = tagToRemoveGlobally;
    let itemsUpdated = 0;
    
    savedItems.update(items => {
      const updatedItems = items.map(item => {
        if (item.tags && Array.isArray(item.tags)) {
          // Verifica se o item possui a tag a ser removida (usando comparação case-insensitive)
          const hasTag = item.tags.some(tag => 
            typeof tag === 'string' && tag.toLowerCase() === tagToRemove.toLowerCase()
          );
          
          if (hasTag) {
            itemsUpdated++;
            return {
              ...item,
              tags: item.tags.filter(tag => 
                !(typeof tag === 'string' && tag.toLowerCase() === tagToRemove.toLowerCase())
              )
            };
          }
        }
        return item;
      });
      
      // Força a sincronização imediata para garantir que as mudanças sejam salvas
      setTimeout(() => {
        (savedItems as any).forceSync?.();
      }, 100);
      
      return updatedItems;
    });
    
    toast.success(`Tag "${tagToRemove}" removida de ${itemsUpdated} ${itemsUpdated === 1 ? 'item' : 'itens'}.`);
    showRemoveTagDialog = false;
    tagToRemoveGlobally = "";
  }
  
  function openEditTagDialog(tag: string) {
    tagToEditGlobally = tag;
    newTagNameGlobally = tag;
    showEditTagDialog = true;
  }
  
  function confirmEditTag() {
    if (!tagToEditGlobally || !newTagNameGlobally.trim()) {
      showEditTagDialog = false;
      return;
    }
    
    const oldTag = tagToEditGlobally;
    const newTag = newTagNameGlobally.trim();
    let itemsUpdated = 0;
    
    savedItems.update(items => {
      const updatedItems = items.map(item => {
        if (item.tags && Array.isArray(item.tags)) {
          // Verifica se o item possui a tag a ser editada (usando comparação case-insensitive)
          const hasTag = item.tags.some(tag => 
            typeof tag === 'string' && tag.toLowerCase() === oldTag.toLowerCase()
          );
          
          if (hasTag) {
            itemsUpdated++;
            // Mapeia as tags, substituindo a antiga pela nova (preservando o case das outras)
            return {
              ...item,
              tags: item.tags.map(tag => 
                typeof tag === 'string' && tag.toLowerCase() === oldTag.toLowerCase() 
                  ? newTag 
                  : tag
              )
            };
          }
        }
        return item;
      });
      
      // Força a sincronização imediata para garantir que as mudanças sejam salvas
      setTimeout(() => {
        (savedItems as any).forceSync?.();
      }, 100);
      
      return updatedItems;
    });
    
    toast.success(`Tag "${oldTag}" alterada para "${newTag}" em ${itemsUpdated} ${itemsUpdated === 1 ? 'item' : 'itens'}.`);
    showEditTagDialog = false;
    tagToEditGlobally = "";
    newTagNameGlobally = "";
  }
  
  function removeAllTags() {
    showRemoveAllTagsDialog = true;
  }
  
  function confirmRemoveAllTags() {
    let itemsWithTags = 0;
    
    savedItems.update(items => {
      const updatedItems = items.map(item => {
        if (item.tags && Array.isArray(item.tags) && item.tags.length > 0) {
          itemsWithTags++;
          return {
            ...item,
            tags: []
          };
        }
        return item;
      });
      
      // Força a sincronização imediata para garantir que as mudanças sejam salvas
      setTimeout(() => {
        (savedItems as any).forceSync?.();
      }, 100);
      
      return updatedItems;
    });
    
    toast.success(`Todas as tags foram removidas de ${itemsWithTags} ${itemsWithTags === 1 ? 'item' : 'itens'}.`);
    showRemoveAllTagsDialog = false;
  }
</script>

<div class="saved-items-view">
  <header class="mb-6">
    <h1 class="text-2xl font-bold mb-2">Itens Salvos</h1>
    <p class="text-gray-600 dark:text-gray-400">
      Gerencie suas páginas salvas, notas e flashcards.
    </p>
  </header>
  
  <div class="filters mb-6 space-y-4">
    <!-- Barra de pesquisa -->
    <div class="search-bar">
      <div class="relative">
        <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <svg class="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
        </div>
        <input 
          type="search" 
          bind:value={searchQuery} 
          placeholder="Pesquisar itens salvos..."
          class="w-full pl-10 p-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
        />
      </div>
    </div>
    
    <!-- Filtros e ordenação -->
    <div class="flex flex-wrap gap-4">
      <!-- Seletor de grupo -->
      <div class="group-selector">
        <label for="group-select" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Grupo
        </label>
        <select 
          id="group-select"
          bind:value={selectedGroup}
          class="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-2 w-full max-w-xs"
        >
          <option value="">Todos os grupos</option>
          {#each $groups as group}
            <option value={group.id}>{group.name}</option>
          {/each}
        </select>
      </div>
      
      <!-- Seletor de ordenação -->
      <div class="sort-selector">
        <label for="sort-select" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Ordenar por
        </label>
        <div class="flex gap-2">
          <select 
            id="sort-select"
            bind:value={sortCriteria}
            class="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-2"
          >
            <option value="dateAdded">Data de adição</option>
            <option value="title">Título</option>
          </select>
          <button 
            class="p-2 rounded-lg border border-gray-300 dark:border-gray-600"
            onclick={() => sortDirection = sortDirection === 'asc' ? 'desc' : 'asc'}
          >
            {#if sortDirection === 'asc'}
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clip-rule="evenodd" />
              </svg>
            {:else}
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
            {/if}
          </button>
        </div>
      </div>
    </div>
    
    <!-- Tags para filtrar -->
    {#if availableTags.length > 0}
      <div class="tags-filter">
        <div class="flex justify-between items-center mb-2">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Tags
        </label>
          {#if availableTags.length > 0}
            <button 
              class="text-sm text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 flex items-center"
              onclick={removeAllTags}
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
              Remover todas as tags
            </button>
          {/if}
        </div>
        <div class="flex flex-wrap gap-2">
          {#each availableTags as tag}
            <div class="tag-container relative group">
            <button 
                class="tag py-1 px-3 text-sm rounded-full transition-colors flex items-center"
              class:bg-blue-100={selectedTags.includes(tag)}
              class:dark:bg-blue-900={selectedTags.includes(tag)}
              class:text-blue-800={selectedTags.includes(tag)}
              class:dark:text-blue-300={selectedTags.includes(tag)}
              class:bg-gray-200={!selectedTags.includes(tag)}
              class:dark:bg-gray-700={!selectedTags.includes(tag)}
              onclick={() => toggleTag(tag)}
            >
              {tag}
            </button>
              <div class="hidden group-hover:flex absolute -top-2 -right-2 bg-white dark:bg-gray-800 rounded-full shadow-md border border-gray-200 dark:border-gray-700">
                <button 
                  class="p-1 text-blue-500 hover:text-blue-600 dark:text-blue-400"
                  onclick={(e) => {
                    e.stopPropagation();
                    openEditTagDialog(tag);
                  }}
                  title="Editar tag em todos os itens"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
                </button>
                <button 
                  class="p-1 text-red-500 hover:text-red-600 dark:text-red-400"
                  onclick={(e) => {
                    e.stopPropagation();
                    openRemoveTagDialog(tag);
                  }}
                  title="Remover tag de todos os itens"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>
  
  <!-- Lista de itens -->
  <div class="items-list">
    {#if sortedItems.length === 0}
      <div class="empty-state text-center py-8">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
        
        {#if $savedItems.length === 0}
          <h3 class="text-lg font-medium mb-2">Nenhum item salvo</h3>
          <p class="text-gray-600 dark:text-gray-400 mb-4">
            Você ainda não salvou nenhuma página.
          </p>
        {:else}
          <h3 class="text-lg font-medium mb-2">Nenhum resultado encontrado</h3>
          <p class="text-gray-600 dark:text-gray-400 mb-4">
            Tente ajustar seus filtros ou pesquisa.
          </p>
        {/if}
      </div>
    {:else}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {#each sortedItems as item}
          <div class="saved-item bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden">
            <div class="p-4">
              <div class="flex justify-between items-start mb-2">
                <h3 class="font-semibold truncate">
                  {item.title}
                </h3>
                <div class="dropdown relative">
                  <button class="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                    </svg>
                  </button>
                  <!-- Menu de opções do item seria exibido aqui -->
                </div>
              </div>
              
              <div class="url text-sm text-blue-600 dark:text-blue-400 truncate mb-2">
                <button onclick={() => openURL(item.url)}>
                  {item.url}
                </button>
              </div>
              
              {#if item.comments}
                <div class="comments text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {item.comments}
                </div>
              {/if}
              
              <div class="meta flex justify-between items-center mt-2 text-xs text-gray-500">
                <span>Adicionado em {formatDate(item.dateAdded)}</span>
                
                {#if item.readLater}
                  <span class="read-later text-amber-600 dark:text-amber-400 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" />
                    </svg>
                    Ler mais tarde {item.scheduledDate ? formatDate(item.scheduledDate) : ''}
                  </span>
                {/if}
              </div>
              
              {#if item.tags && Array.isArray(item.tags) && item.tags.length > 0}
                <div class="tags flex flex-wrap gap-1 mt-3">
                  {#each item.tags as tag}
                    {#if typeof tag === 'string'}
                      <div class="tag text-xs py-0.5 px-2 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center group">
                        {#if editingTagItem?.id === item.id && editTagInput === tag}
                          <input 
                            type="text" 
                            bind:value={editTagInput}
                            class="bg-transparent border-b border-gray-400 dark:border-gray-500 w-16 focus:outline-none focus:border-blue-500 px-1 py-0 text-xs"
                            onkeydown={(e) => e.key === 'Enter' && saveEditedTag(item, tag)}
                            autofocus
                          />
                          <button 
                            class="ml-1 text-green-500 hover:text-green-600 dark:text-green-400"
                            onclick={() => saveEditedTag(item, tag)}
                            title="Salvar"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                            </svg>
                          </button>
                          <button 
                            class="ml-1 text-gray-500 hover:text-gray-600 dark:text-gray-400"
                            onclick={cancelEditTag}
                            title="Cancelar"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                            </svg>
                          </button>
                        {:else}
                          <span>{tag}</span>
                          <div class="hidden group-hover:flex items-center ml-1">
                            <button 
                              class="text-blue-500 hover:text-blue-600 dark:text-blue-400 p-0.5"
                              onclick={() => editTag(item, tag)}
                              title="Editar tag"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                              </svg>
                            </button>
                            <button 
                              class="text-red-500 hover:text-red-600 dark:text-red-400 p-0.5"
                              onclick={() => removeTagFromItem(item, tag)}
                              title="Remover tag"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                              </svg>
                            </button>
                          </div>
                        {/if}
                      </div>
                    {/if}
                  {/each}
                  
                  <!-- Botão para adicionar nova tag -->
                  {#if addingTagItem?.id !== item.id}
                    <button 
                      class="add-tag-btn text-xs py-0.5 px-2 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center text-blue-500 hover:text-blue-600 dark:text-blue-400"
                      onclick={() => startAddingTag(item)}
                      title="Adicionar tag"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clip-rule="evenodd" />
                      </svg>
                      <span>Nova tag</span>
                    </button>
                  {/if}
                </div>
              {:else}
                <div class="tags flex flex-wrap gap-1 mt-3">
                  <!-- Exibir apenas o botão de adicionar tag quando não há tags -->
                  {#if addingTagItem?.id !== item.id}
                    <button 
                      class="add-tag-btn text-xs py-0.5 px-2 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center text-blue-500 hover:text-blue-600 dark:text-blue-400"
                      onclick={() => startAddingTag(item)}
                      title="Adicionar tag"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clip-rule="evenodd" />
                      </svg>
                      <span>Adicionar tag</span>
                    </button>
                  {/if}
                </div>
              {/if}
              
              <!-- Formulário para adicionar nova tag -->
              {#if addingTagItem?.id === item.id}
                <div class="add-tag-form flex items-center mt-2">
                  <input 
                    type="text" 
                    bind:value={newTagInput}
                    class="flex-1 bg-gray-100 dark:bg-gray-700 border-b border-gray-400 dark:border-gray-500 focus:outline-none focus:border-blue-500 px-2 py-1 text-xs rounded-l-md"
                    placeholder="Nova tag..."
                    onkeydown={(e) => e.key === 'Enter' && saveNewTag(item)}
                    autofocus
                  />
                  <button 
                    class="text-white bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 p-1 rounded-r-md"
                    onclick={() => saveNewTag(item)}
                    title="Salvar"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                    </svg>
                  </button>
                  <button 
                    class="text-white bg-gray-500 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700 p-1 ml-1 rounded-md"
                    onclick={cancelAddTag}
                    title="Cancelar"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                    </svg>
                  </button>
                </div>
              {/if}
              
              <!-- Contadores de notas e flashcards -->
              <div class="item-counters flex gap-4 mt-3 text-xs text-gray-600 dark:text-gray-400">
                {#if item.noteIds && item.noteIds.length > 0}
                  <div class="note-count flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd" />
                    </svg>
                    {item.noteIds.length} {item.noteIds.length === 1 ? 'nota' : 'notas'}
                  </div>
                {/if}
                
                {#if item.flashcardIds && item.flashcardIds.length > 0}
                  <div class="flashcard-count flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z" />
                    </svg>
                    {item.flashcardIds.length} {item.flashcardIds.length === 1 ? 'flashcard' : 'flashcards'}
                  </div>
                {/if}
              </div>
              
              <!-- Exibição de grupos associados ao item -->
              {#if item.groupIds && item.groupIds.length > 0}
                <div class="groups-display flex flex-wrap gap-1 mt-3">
                  {#each item.groupIds as groupId}
                    {#each $groups.filter(g => g.id === groupId) as group}
                      <div class="group-tag flex items-center text-xs py-1 px-2 rounded-full" 
                           style="background-color: {group.color}20; color: {group.color}; border: 1px solid {group.color}40;">
                        <span class="w-2 h-2 rounded-full mr-1" style="background-color: {group.color};"></span>
                        <span>{group.name}</span>
                      </div>
                    {/each}
                  {/each}
                </div>
              {/if}
              
              <!-- Ações do item -->
              <div class="item-actions flex gap-2 mt-4">
                <button 
                  class="action-btn flex-1 py-1 px-3 text-sm border border-gray-300 dark:border-gray-600 rounded"
                  onclick={() => openURL(item.url)}
                >
                  Abrir link
                </button>
                <button 
                  class="action-btn flex-1 py-1 px-3 text-sm text-red-600 border border-red-300 dark:border-red-700 rounded"
                  onclick={() => deleteItem(item.id)}
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div> 

<!-- Diálogo de confirmação para remover todas as tags -->
<AlertDialog.Root open={showRemoveAllTagsDialog}>
  <AlertDialog.Portal>
    <AlertDialog.Overlay />
    <AlertDialog.Content>
      <AlertDialog.Header>
        <AlertDialog.Title>Remover todas as tags</AlertDialog.Title>
        <AlertDialog.Description>
          Tem certeza que deseja remover todas as tags de todos os itens salvos? Esta ação não pode ser desfeita.
        </AlertDialog.Description>
      </AlertDialog.Header>
      <AlertDialog.Footer>
        <AlertDialog.Cancel onclick={() => showRemoveAllTagsDialog = false}>
          Cancelar
        </AlertDialog.Cancel>
        <AlertDialog.Action onclick={confirmRemoveAllTags}>
          Remover todas
        </AlertDialog.Action>
      </AlertDialog.Footer>
    </AlertDialog.Content>
  </AlertDialog.Portal>
</AlertDialog.Root>

<!-- Diálogo de confirmação para remover uma tag específica de todos os itens -->
<AlertDialog.Root open={showRemoveTagDialog}>
  <AlertDialog.Portal>
    <AlertDialog.Overlay />
    <AlertDialog.Content>
      <AlertDialog.Header>
        <AlertDialog.Title>Remover tag "{tagToRemoveGlobally}"</AlertDialog.Title>
        <AlertDialog.Description>
          Tem certeza que deseja remover a tag "{tagToRemoveGlobally}" de todos os itens? Esta ação não pode ser desfeita.
        </AlertDialog.Description>
      </AlertDialog.Header>
      <AlertDialog.Footer>
        <AlertDialog.Cancel onclick={() => showRemoveTagDialog = false}>
          Cancelar
        </AlertDialog.Cancel>
        <AlertDialog.Action onclick={confirmRemoveTag}>
          Remover
        </AlertDialog.Action>
      </AlertDialog.Footer>
    </AlertDialog.Content>
  </AlertDialog.Portal>
</AlertDialog.Root>

<!-- Diálogo para editar uma tag em todos os itens -->
<AlertDialog.Root open={showEditTagDialog}>
  <AlertDialog.Portal>
    <AlertDialog.Overlay />
    <AlertDialog.Content>
      <AlertDialog.Header>
        <AlertDialog.Title>Editar tag "{tagToEditGlobally}"</AlertDialog.Title>
        <AlertDialog.Description>
          Esta mudança afetará todos os itens que possuem a tag "{tagToEditGlobally}".
        </AlertDialog.Description>
      </AlertDialog.Header>
      <div class="py-4 px-6">
        <label class="block text-sm font-medium mb-1">Novo nome da tag:</label>
        <input
          type="text"
          bind:value={newTagNameGlobally}
          class="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Digite o novo nome da tag"
        />
      </div>
      <AlertDialog.Footer>
        <AlertDialog.Cancel onclick={() => showEditTagDialog = false}>
          Cancelar
        </AlertDialog.Cancel>
        <AlertDialog.Action onclick={confirmEditTag}>
          Salvar
        </AlertDialog.Action>
      </AlertDialog.Footer>
    </AlertDialog.Content>
  </AlertDialog.Portal>
</AlertDialog.Root> 