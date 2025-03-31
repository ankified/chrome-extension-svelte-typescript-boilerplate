<script lang="ts">
  import { flashcards, savedItems } from "../../storage";
  import { format } from 'date-fns';
  import { ptBR } from 'date-fns/locale';
  import FlashcardCard from "../../lib/components/FlashcardCard.svelte";
  import FlashcardStudySession from "../../lib/components/FlashcardStudySession.svelte";
  import type { Flashcard } from "../../types";
  
  let searchQuery = $state("");
  let selectedTags = $state<string[]>([]);
  let viewMode = $state("study"); // 'study', 'list', ou 'flow'
  
  // Flashcards filtrados
  let filteredFlashcards = $derived($flashcards.filter(card => {
    // Filtro por pesquisa
    const matchesSearch = !searchQuery || 
      card.front.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.back.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Filtro por tags selecionadas
    const matchesTags = selectedTags.length === 0 || 
      selectedTags.every(tag => card.tags.includes(tag));
    
    return matchesSearch && matchesTags;
  }));
  
  // Ordenar por data de próxima revisão
  let sortedFlashcards = $derived([...filteredFlashcards].sort((a, b) => {
    if (!a.nextReviewDate) return 1;
    if (!b.nextReviewDate) return -1;
    return a.nextReviewDate - b.nextReviewDate;
  }));
  
  // Agrupar flashcards por item relacionado
  let flashcardsByItem = $derived(() => {
    const result: Record<string, Flashcard[]> = {};
    $savedItems.forEach(item => {
      if (item.flashcardIds && item.flashcardIds.length > 0) {
        const itemFlashcards = filteredFlashcards.filter(card => 
          item.flashcardIds.includes(card.id)
        );
        if (itemFlashcards.length > 0) {
          result[item.id] = itemFlashcards;
        }
      }
    });
    return result;
  });
  
  // Todas as tags existentes
  let allTags = $derived([...new Set($flashcards.flatMap(card => card.tags))]);
  
  // Toggle seleção de tag
  function toggleTag(tag: string) {
    const index = selectedTags.indexOf(tag);
    if (index === -1) {
      selectedTags = [...selectedTags, tag];
    } else {
      selectedTags = selectedTags.filter(t => t !== tag);
    }
  }
  
  // Flashcards para revisar hoje
  let dueCards = $derived(sortedFlashcards.filter(card => 
    card.nextReviewDate && card.nextReviewDate <= Date.now()
  ));
</script>

<div class="flashcards-view">
  <header class="mb-6">
    <h2 class="text-2xl font-bold mb-4">Meus Flashcards</h2>
    
    <div class="view-controls flex flex-col sm:flex-row justify-between gap-4">
      <div class="search-box w-full sm:w-64">
        <input 
          type="text" 
          bind:value={searchQuery} 
          placeholder="Pesquisar flashcards..."
          class="w-full p-2 rounded border border-gray-300 dark:border-gray-700 dark:bg-gray-800"
        />
      </div>
      
      <div class="view-toggle flex">
        <button 
          class="px-4 py-2 {viewMode === 'study' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'} rounded-l"
          onclick={() => viewMode = "study"}
        >
          Estudar
        </button>
        <button 
          class="px-4 py-2 {viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}"
          onclick={() => viewMode = "list"}
        >
          Lista
        </button>
        <button 
          class="px-4 py-2 {viewMode === 'flow' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'} rounded-r"
          onclick={() => viewMode = "flow"}
        >
          Fluxo
        </button>
      </div>
    </div>
  </header>
  
  {#if allTags.length > 0}
    <div class="tag-filters flex flex-wrap gap-2 mb-6">
      {#each allTags as tag}
        <button 
          class="tag px-3 py-1 text-sm rounded-full {selectedTags.includes(tag) ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}"
          onclick={() => toggleTag(tag)}
        >
          {tag}
        </button>
      {/each}
    </div>
  {/if}
  
  {#if viewMode === "study"}
    <div class="study-section mb-8 p-6 bg-gray-50 dark:bg-gray-800 rounded">
      <h3 class="text-xl font-semibold mb-4">Revisão de Hoje ({dueCards.length})</h3>
      
      {#if dueCards.length === 0}
        <div class="empty-state text-center py-8">
          <p class="text-gray-500 dark:text-gray-400 mb-4">Não há cartões para revisar hoje.</p>
          <button 
            class="px-4 py-2 bg-blue-600 text-white rounded"
            onclick={() => viewMode = "list"}
          >
            Ver Todos os Cartões
          </button>
        </div>
      {:else}
        <FlashcardStudySession cards={dueCards} />
      {/if}
    </div>
  {:else if viewMode === "list"}
    {#if Object.keys(flashcardsByItem).length === 0}
      <div class="empty-state text-center py-16 bg-gray-50 dark:bg-gray-800 rounded">
        <p class="text-gray-500 dark:text-gray-400">Nenhum flashcard encontrado.</p>
      </div>
    {:else}
      {#each Object.entries(flashcardsByItem) as [itemId, itemFlashcards]}
        {@const item = $savedItems.find(i => i.id === itemId)}
        {#if item && itemFlashcards.length > 0}
          <div class="item-flashcards-section mb-8 p-4 bg-gray-50 dark:bg-gray-800 rounded">
            <div class="item-header mb-4">
              <h3 class="text-xl font-semibold mb-1">{item.title}</h3>
              <a href={item.url} target="_blank" class="text-blue-600 dark:text-blue-400 text-sm block truncate">
                {item.url}
              </a>
            </div>
            
            <div class="flashcards-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {#each itemFlashcards as flashcard}
                <FlashcardCard card={flashcard} />
              {/each}
            </div>
          </div>
        {/if}
      {/each}
    {/if}
  {:else if viewMode === "flow"}
    <div class="flow-container h-[600px] bg-gray-50 dark:bg-gray-800 rounded">
      <!-- Implementar o componente FlashcardsFlow aqui -->
      <div class="p-8 text-center">
        <p class="text-gray-500 dark:text-gray-400">Visualização de fluxo em desenvolvimento.</p>
      </div>
    </div>
  {/if}
</div> 