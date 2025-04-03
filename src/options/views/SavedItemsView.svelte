<script lang="ts">
  import { savedItems, groups } from "../../storage";
  import type { SavedItem } from "../../types";
  
  // Estado da interface
  let searchQuery = $state("");
  let selectedGroup = $state("");
  let selectedTags = $state<string[]>([]);
  let sortCriteria = $state("dateAdded");
  let sortDirection = $state("desc");
  
  // Dados reativos filtrados
  let filteredItems = $derived(filterItems($savedItems, searchQuery, selectedGroup, selectedTags));
  let sortedItems = $derived(sortItems(filteredItems, sortCriteria, sortDirection));
  let availableTags = $derived(getAllTags($savedItems));
  
  // Funções
  function filterItems(items: SavedItem[], query: string, groupId: string, tags: string[]) {
    return items.filter(item => {
      // Filtrar por pesquisa
      const matchesQuery = !query || 
        item.title.toLowerCase().includes(query.toLowerCase()) || 
        item.url.toLowerCase().includes(query.toLowerCase()) ||
        (item.comments && item.comments.toLowerCase().includes(query.toLowerCase()));
      
      // Filtrar por grupo
      const matchesGroup = !groupId || item.groupIds.includes(groupId);
      
      // Filtrar por tags
      const matchesTags = tags.length === 0 || 
        tags.every(tag => item.tags.some(itemTag => 
          itemTag.toLowerCase() === tag.toLowerCase()
        ));
      
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
      if (item.tags && Array.isArray(item.tags)) {
        item.tags.forEach(tag => tagsSet.add(tag.toLowerCase()));
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
                <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
            {/if}
          </button>
        </div>
      </div>
    </div>
    
    <!-- Tags para filtrar -->
    {#if availableTags.length > 0}
      <div class="tags-filter">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Tags
        </label>
        <div class="flex flex-wrap gap-2">
          {#each availableTags as tag}
            <button 
              class="tag py-1 px-3 text-sm rounded-full transition-colors"
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
              
              {#if item.tags && item.tags.length > 0}
                <div class="tags flex flex-wrap gap-1 mt-3">
                  {#each item.tags as tag}
                    <span class="tag text-xs py-0.5 px-2 bg-gray-100 dark:bg-gray-700 rounded-full">
                      {tag}
                    </span>
                  {/each}
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