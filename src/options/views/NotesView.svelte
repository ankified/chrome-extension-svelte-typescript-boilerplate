<script lang="ts">
  import { notes, savedItems, itemLinks } from "../../storage";
  import { format } from 'date-fns';
  import { onMount } from 'svelte';
  import { ptBR } from 'date-fns/locale';
  import NoteCard from "../../lib/components/NoteCard.svelte";
  import type { Note } from "../../types";
  
  let searchQuery = $state("");
  let selectedTags = $state<string[]>([]);
  let viewMode = $state("list"); // 'list' ou 'flow'
  let debugMode = $state(true); // Iniciar com modo debug ativado para identificar problemas
  
  // Notas filtradas
  let filteredNotes = $derived($notes.filter(note => {
    // Filtro por pesquisa
    const matchesSearch = !searchQuery || 
      note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Filtro por tags selecionadas
    const matchesTags = selectedTags.length === 0 || 
      selectedTags.every(tag => note.tags.includes(tag));
    
    return matchesSearch && matchesTags;
  }));
  
  // Todas as tags existentes
  let allTags = $derived([...new Set($notes.flatMap(note => note.tags))]);
  
  // Agrupar por item relacionado - Versão corrigida
  let notesByItem = $derived(() => {
    console.log("[NotesView] Agrupando notas por item. Total de notas:", filteredNotes.length);
    console.log("[NotesView] Total de savedItems:", $savedItems.length);
    
    // Se não houver notas filtradas, retornar um objeto vazio
    if (filteredNotes.length === 0) {
      console.log("[NotesView] Não há notas filtradas para agrupar");
      return {};
    }
    
    const result: Record<string, Note[]> = {};
    
    // Verificar cada nota e organizar por itemId
    filteredNotes.forEach(note => {
      // Verificar se a nota tem um itemId válido
      const itemExists = note.itemId && $savedItems.some(item => item.id === note.itemId);
      
      if (itemExists) {
        // Criar o array para o itemId se não existir
        if (!result[note.itemId]) {
          result[note.itemId] = [];
        }
        
        // Adicionar a nota ao array do itemId
        result[note.itemId].push(note);
        console.log(`[NotesView] Nota ${note.id} associada ao item ${note.itemId}`);
      } else {
        console.log(`[NotesView] Nota ${note.id} não associada a um item válido`);
      }
    });
    
    console.log("[NotesView] Agrupamento concluído, total de grupos:", Object.keys(result).length);
    console.log("[NotesView] Grupos:", Object.keys(result));
    
    return result;
  });
  
  // Notas sem vínculo válido - Versão corrigida
  let unlinkedNotes = $derived(() => {
    // Para cada nota filtrada, verificar se ela não tem um itemId válido
    console.log("[NotesView] Verificando notas sem vínculo válido");
    
    const result = filteredNotes.filter(note => {
      // Se não tem itemId ou tem um itemId que não existe em savedItems
      const hasValidItemId = note.itemId && $savedItems.some(item => item.id === note.itemId);
      return !hasValidItemId;
    });
    
    console.log(`[NotesView] Encontradas ${result.length} notas sem vínculo válido`);
    return result;
  });
  
  onMount(() => {
    console.log("[NotesView] Componente montado");
    console.log(`[NotesView] Total de notas disponíveis: ${$notes.length}`);
    console.log(`[NotesView] Total de itens salvos: ${$savedItems.length}`);
    
    // Forçar a correção de referências ao montar o componente
    import("../../storage").then(module => {
      console.log("[NotesView] Executando correção de referências...");
      const results = module.fixReferences();
      console.log("[NotesView] Resultado da correção:", results);
    });
    
    // Depuração: mapear as notas e seus itens associados
    $notes.forEach(note => {
      const item = $savedItems.find(item => item.id === note.itemId);
      if (item) {
        console.log(`[NotesView] Nota ${note.id} está associada ao item ${item.id} (${item.title})`);
        // Verificar se o item tem esta nota em seus noteIds
        const isReferencedByItem = item.noteIds && item.noteIds.includes(note.id);
        if (!isReferencedByItem) {
          console.log(`[NotesView] ALERTA: O item ${item.id} não referencia a nota ${note.id} em seus noteIds`);
        }
      } else {
        console.log(`[NotesView] ALERTA: Nota ${note.id} tem itemId ${note.itemId} que não existe`);
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
</script>

<div class="notes-view">
  <header class="mb-6 flex flex-wrap items-center justify-between">
    <h2 class="text-2xl font-bold mb-2">Minhas Notas</h2>
    
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
          placeholder="Pesquisar notas..."
          class="w-full p-2 rounded border border-gray-300 dark:border-gray-700 dark:bg-gray-800"
        />
      </div>
      
      <div class="view-toggle flex">
        <button 
          class="px-4 py-2 {viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'} rounded-l"
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
      <p>Total de notas: {$notes.length}</p>
      <p>Notas filtradas: {filteredNotes.length}</p>
      <p>Total de itens: {$savedItems.length}</p>
      <p>Grupos de notas: {Object.keys(notesByItem).length}</p>
      <p>Notas sem vínculo válido: {unlinkedNotes.length}</p>
      
      {#if $notes.length === 0}
        <div class="mt-2 text-red-500">
          ALERTA: Não há notas carregadas! Verifique o armazenamento.
        </div>
      {/if}
      
      {#if unlinkedNotes.length > 0}
        <div class="mt-2">
          <p class="font-bold">Notas sem vínculo válido:</p>
          <ul class="list-disc pl-4">
            {#each unlinkedNotes as note (note.id)}
              <li>ID: {note.id}, ItemID: {note.itemId || "nenhum"}</li>
            {/each}
          </ul>
        </div>
      {/if}
      
      <div class="mt-2">
        <p class="font-bold">Conteúdo de todas as notas:</p>
        <ul class="list-disc pl-4">
          {#each $notes as note (note.id)}
            <li>ID: {note.id}, Conteúdo: {note.content.substring(0, 30)}...</li>
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
  
  {#if viewMode === "list"}
    {#if filteredNotes.length === 0}
      <div class="empty-state text-center py-16 bg-gray-50 dark:bg-gray-800 rounded">
        <p class="text-gray-500 dark:text-gray-400">Nenhuma nota encontrada.</p>
        
        <div class="mt-4 text-gray-500 dark:text-gray-400 text-sm">
          <p>Total de notas disponíveis: {$notes.length}</p>
          <p>Total de itens salvos: {$savedItems.length}</p>
        </div>
      </div>
    {:else}
      <!-- Mostrar notas sem agrupamento, quando não há grupos nem notas sem vínculo -->
      {#if Object.keys(notesByItem).length === 0 && unlinkedNotes.length === 0}
        <div class="item-notes-section mb-8 p-4 bg-gray-50 dark:bg-gray-800 rounded">
          <div class="item-header mb-4">
            <h3 class="text-xl font-semibold mb-1">Todas as notas</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Exibindo todas as notas disponíveis
            </p>
          </div>
          
          <div class="notes-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {#each filteredNotes as note}
              <NoteCard {note} />
            {/each}
          </div>
        </div>
      {:else}
        <!-- Mostrar notas sem vínculo primeiro, se houver -->
        {#if unlinkedNotes.length > 0}
          <div class="item-notes-section mb-8 p-4 bg-gray-50 dark:bg-gray-800 rounded">
            <div class="item-header mb-4">
              <h3 class="text-xl font-semibold mb-1">Notas sem página associada</h3>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                Estas notas não estão vinculadas a nenhuma página salva.
              </p>
            </div>
            
            <div class="notes-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {#each unlinkedNotes as note (note.id)}
                <NoteCard {note} />
              {/each}
            </div>
          </div>
        {/if}
        
        <!-- Mostrar notas agrupadas por item, se houver -->
        {#if Object.keys(notesByItem).length > 0}
          {#each Object.entries(notesByItem) as [itemId, itemNotes]}
            {@const item = $savedItems.find(i => i.id === itemId)}
            {#if item && itemNotes.length > 0}
              <div class="item-notes-section mb-8 p-4 bg-gray-50 dark:bg-gray-800 rounded">
                <div class="item-header mb-4">
                  <h3 class="text-xl font-semibold mb-1">{item.title}</h3>
                  <a href={item.url} target="_blank" class="text-blue-600 dark:text-blue-400 text-sm block truncate">
                    {item.url}
                  </a>
                </div>
                
                <div class="notes-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {#each itemNotes as note}
                    <NoteCard {note} />
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
      <!-- Implementar o componente NotesFlow aqui -->
      <div class="p-8 text-center">
        <p class="text-gray-500 dark:text-gray-400">Visualização de fluxo em desenvolvimento.</p>
      </div>
    </div>
  {/if}
</div> 