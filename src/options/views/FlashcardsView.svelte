<script lang="ts">
  import { flashcards, savedItems } from "../../storage";
  import { format } from 'date-fns';
  import { ptBR } from 'date-fns/locale';
  import { onMount } from 'svelte';
  import FlashcardCard from "../../lib/components/FlashcardCard.svelte";
  import FlashcardStudySession from "../../lib/components/FlashcardStudySession.svelte";
  import type { Flashcard } from "../../types";
  
  let searchQuery = $state("");
  let selectedTags = $state<string[]>([]);
  let viewMode = $state("list"); // 'study', 'list', ou 'flow'
  let debugMode = $state(true); // Iniciar com modo debug ativado para identificar problemas
  
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
  
  // Flashcards sem vínculo válido
  let unlinkedFlashcards = $derived(() => {
    // Para cada flashcard filtrado, verificar se não tem um itemId válido
    console.log("[FlashcardsView] Verificando flashcards sem vínculo válido");
    
    const result = filteredFlashcards.filter(card => {
      // Se não tem itemId ou tem um itemId que não existe em savedItems
      const hasValidItemId = card.itemId && $savedItems.some(item => item.id === card.itemId);
      return !hasValidItemId;
    });
    
    console.log(`[FlashcardsView] Encontrados ${result.length} flashcards sem vínculo válido`);
    return result;
  });
  
  // Agrupar flashcards por item relacionado - Versão corrigida
  let flashcardsByItem = $derived(() => {
    console.log("[FlashcardsView] Agrupando flashcards por item. Total:", filteredFlashcards.length);
    
    const result: Record<string, Flashcard[]> = {};
    
    // Verificar cada flashcard e organizar por itemId
    filteredFlashcards.forEach(card => {
      // Verificar se o flashcard tem um itemId válido
      const itemExists = card.itemId && $savedItems.some(item => item.id === card.itemId);
      
      if (itemExists) {
        // Criar o array para o itemId se não existir
        if (!result[card.itemId]) {
          result[card.itemId] = [];
        }
        
        // Adicionar o flashcard ao array do itemId
        result[card.itemId].push(card);
        console.log(`[FlashcardsView] Flashcard ${card.id} associado ao item ${card.itemId}`);
      } else {
        console.log(`[FlashcardsView] Flashcard ${card.id} não associado a um item válido`);
      }
    });
    
    console.log("[FlashcardsView] Agrupamento concluído, total de grupos:", Object.keys(result).length);
    console.log("[FlashcardsView] Grupos:", Object.keys(result));
    
    return result;
  });
  
  // Todas as tags existentes
  let allTags = $derived([...new Set($flashcards.flatMap(card => card.tags))]);
  
  onMount(() => {
    console.log("[FlashcardsView] Componente montado");
    console.log(`[FlashcardsView] Total de flashcards disponíveis: ${$flashcards.length}`);
    console.log(`[FlashcardsView] Total de itens salvos: ${$savedItems.length}`);
    
    // Depuração: mapear os flashcards e seus itens associados
    $flashcards.forEach(card => {
      const item = $savedItems.find(item => item.id === card.itemId);
      if (item) {
        console.log(`[FlashcardsView] Flashcard ${card.id} está associado ao item ${item.id} (${item.title})`);
        // Verificar se o item tem este flashcard em seus flashcardIds
        const isReferencedByItem = item.flashcardIds && item.flashcardIds.includes(card.id);
        if (!isReferencedByItem) {
          console.log(`[FlashcardsView] ALERTA: O item ${item.id} não referencia o flashcard ${card.id} em seus flashcardIds`);
        }
      } else {
        console.log(`[FlashcardsView] ALERTA: Flashcard ${card.id} tem itemId ${card.itemId} que não existe`);
      }
    });
  });
  
  // Toggle seleção de tag
  function toggleTag(tag: string) {
    const index = selectedTags.indexOf(tag);
    if (index === -1) {
      selectedTags = [...selectedTags, tag];
    } else {
      selectedTags = selectedTags.filter(t => t !== tag);
    }
  }
  
  // Alternar modo de depuração
  function toggleDebugMode() {
    debugMode = !debugMode;
  }
  
  // Flashcards para revisar hoje
  let dueCards = $derived(sortedFlashcards.filter(card => 
    card.nextReviewDate && card.nextReviewDate <= Date.now()
  ));
</script>

<div class="flashcards-view">
  <header class="mb-6 flex flex-wrap items-center justify-between">
    <h2 class="text-2xl font-bold mb-2">Meus Flashcards</h2>
    
    <!-- Botão de Debug no canto superior direito -->
    <button 
      class="text-xs px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
      onclick={toggleDebugMode}
    >
      {debugMode ? "Ocultar Debug" : "Mostrar Debug"}
    </button>
    
    <div class="view-controls flex flex-col sm:flex-row justify-between gap-4 w-full mt-2">
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
  
  {#if debugMode}
    <div class="debug-info mb-4 p-3 text-xs font-mono bg-gray-100 dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-700 overflow-auto">
      <p>Total de flashcards: {$flashcards.length}</p>
      <p>Flashcards filtrados: {filteredFlashcards.length}</p>
      <p>Total de itens: {$savedItems.length}</p>
      <p>Grupos de flashcards: {Object.keys(flashcardsByItem).length}</p>
      <p>Flashcards sem vínculo válido: {unlinkedFlashcards.length}</p>
      <p>Flashcards para revisar hoje: {dueCards.length}</p>
      
      {#if $flashcards.length === 0}
        <div class="mt-2 text-red-500">
          ALERTA: Não há flashcards carregados! Verifique o armazenamento.
        </div>
      {/if}
      
      {#if unlinkedFlashcards.length > 0}
        <div class="mt-2">
          <p class="font-bold">Flashcards sem vínculo válido:</p>
          <ul class="list-disc pl-4">
            {#each unlinkedFlashcards as card (card.id)}
              <li>ID: {card.id}, ItemID: {card.itemId || "nenhum"}</li>
            {/each}
          </ul>
        </div>
      {/if}
      
      <div class="mt-2">
        <p class="font-bold">Conteúdo de todos os flashcards:</p>
        <ul class="list-disc pl-4">
          {#each $flashcards as card (card.id)}
            <li>ID: {card.id}, Frente: {card.front.substring(0, 30)}...</li>
          {/each}
        </ul>
      </div>
    </div>
  {/if}
  
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
    {#if filteredFlashcards.length === 0}
      <div class="empty-state text-center py-16 bg-gray-50 dark:bg-gray-800 rounded">
        <p class="text-gray-500 dark:text-gray-400">Nenhum flashcard encontrado.</p>
        
        <div class="mt-4 text-gray-500 dark:text-gray-400 text-sm">
          <p>Total de flashcards disponíveis: {$flashcards.length}</p>
          <p>Total de itens salvos: {$savedItems.length}</p>
        </div>
      </div>
    {:else}
      <!-- Mostrar flashcards sem agrupamento, quando não há grupos nem flashcards sem vínculo -->
      {#if Object.keys(flashcardsByItem).length === 0 && unlinkedFlashcards.length === 0}
        <div class="item-flashcards-section mb-8 p-4 bg-gray-50 dark:bg-gray-800 rounded">
          <div class="item-header mb-4">
            <h3 class="text-xl font-semibold mb-1">Todos os flashcards</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Exibindo todos os flashcards disponíveis
            </p>
          </div>
          
          <div class="flashcards-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {#each filteredFlashcards as card}
              <FlashcardCard {card} />
            {/each}
          </div>
        </div>
      {:else}
        <!-- Mostrar flashcards sem vínculo primeiro, se houver -->
        {#if unlinkedFlashcards.length > 0}
          <div class="item-flashcards-section mb-8 p-4 bg-gray-50 dark:bg-gray-800 rounded">
            <div class="item-header mb-4">
              <h3 class="text-xl font-semibold mb-1">Flashcards sem página associada</h3>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                Estes flashcards não estão vinculados a nenhuma página salva.
              </p>
            </div>
            
            <div class="flashcards-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {#each unlinkedFlashcards as card (card.id)}
                <FlashcardCard {card} />
              {/each}
            </div>
          </div>
        {/if}
        
        <!-- Mostrar flashcards agrupados por item, se houver -->
        {#if Object.keys(flashcardsByItem).length > 0}
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
                  {#each itemFlashcards as card}
                    <FlashcardCard {card} />
                  {/each}
                </div>
              </div>
            {/if}
          {/each}
        {/if}
      {/if}
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