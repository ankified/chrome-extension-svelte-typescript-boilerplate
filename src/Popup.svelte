<script lang="ts">
  import { onMount } from 'svelte';
  import SaveItemForm from './components/SaveItemForm.svelte';
  import { notes, flashcards, savedItems } from './storage';
  import type { Note, Flashcard } from './types';
  import PopupNoteCreator from './lib/components/PopupNoteCreator.svelte';
  import PopupFlashcardCreator from './lib/components/PopupFlashcardCreator.svelte';
  import { format } from 'date-fns/format';
  
  // Definição de abas
  const tabs = [
    { id: 'save', label: 'Salvar', icon: 'bookmark' },
    { id: 'notes', label: 'Notas', icon: 'note' },
    { id: 'flashcards', label: 'Flashcards', icon: 'school' }
  ];
  
  let activeTab = $state('save');
  let recentNotes = $state<Note[]>([]);
  let recentFlashcards = $state<Flashcard[]>([]);
  let currentUrl = $state('');
  let viewMode = $state('create');
  let notesViewMode = $state("create");
  let flashcardsViewMode = $state("create");
  let currentTitle = $state('');
  
  onMount(() => {
    console.log("Popup montado, obtendo informações da aba...");
    
    // Carregar notas recentes
    loadRecentNotes();
    
    // Carregar flashcards recentes
    loadRecentFlashcards();
    
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0]) {
          currentUrl = tabs[0].url || "";
          currentTitle = tabs[0].title || "";
          console.log("URL obtida:", currentUrl);
          console.log("Título obtido:", currentTitle);
        } else {
          console.error("Não foi possível obter a aba atual");
        }
      });
    } else {
      console.error("API chrome.tabs não disponível");
    }
  });
  
  // Carregar notas recentes da store
  function loadRecentNotes() {
    console.log("Carregando notas recentes...");
    const allNotes = $notes;
    console.log(`Total de notas encontradas: ${allNotes.length}`);
    
    if (allNotes.length > 0) {
      // Ordenar por data de criação (mais recentes primeiro) e pegar as 5 primeiras
      recentNotes = [...allNotes]
        .sort((a, b) => b.dateCreated - a.dateCreated)
        .slice(0, 5);
      console.log(`Notas recentes carregadas: ${recentNotes.length}`);
    }
  }
  
  // Carregar flashcards recentes da store
  function loadRecentFlashcards() {
    console.log("Carregando flashcards recentes...");
    const allFlashcards = $flashcards;
    console.log(`Total de flashcards encontrados: ${allFlashcards.length}`);
    
    if (allFlashcards.length > 0) {
      // Ordenar por data de criação (mais recentes primeiro) e pegar os 5 primeiros
      recentFlashcards = [...allFlashcards]
        .sort((a, b) => b.dateCreated - a.dateCreated)
        .slice(0, 5);
      console.log(`Flashcards recentes carregados: ${recentFlashcards.length}`);
    }
  }
  
  // Adicionar efeito para atualizar as notas recentes quando a store é atualizada
  $effect(() => {
    if ($notes) {
      loadRecentNotes();
    }
  });
  
  // Adicionar efeito para atualizar os flashcards recentes quando a store é atualizada
  $effect(() => {
    if ($flashcards) {
      loadRecentFlashcards();
    }
  });
  
  function formatDate(timestamp: number): string {
    return format(new Date(timestamp), "dd/MM/yyyy");
  }
  
  function openOptions(tab = '') {
    chrome.runtime.openOptionsPage(() => {
      // Armazenar a aba para abrir no options
      if (tab) {
        chrome.storage.local.set({ activeOptionsTab: tab });
      }
    });
  }
  
  function truncateText(text: string, maxLength = 50): string {
    if (!text) return '';
    return text.length > maxLength 
      ? text.substring(0, maxLength) + '...' 
      : text;
  }

  // Salvar a aba ativa quando mudar
  $effect(() => {
    chrome.storage.local.set({ popupActiveTab: activeTab });
  });
</script>

<main class="popup-container w-full max-h-[600px] overflow-y-auto overflow-x-hidden">
  <header class="mb-4">
    <div class="tabs flex border-b border-gray-200 dark:border-gray-700">
      {#each tabs as tab}
        <button 
          class="tab-button flex-1 py-2 px-3 text-center border-b-2 transition-colors"
          class:border-blue-500={activeTab === tab.id}
          class:border-transparent={activeTab !== tab.id}
          class:text-blue-600={activeTab === tab.id}
          class:dark:text-blue-400={activeTab === tab.id}
          class:text-gray-500={activeTab !== tab.id}
          onclick={() => activeTab = tab.id}
        >
          <div class="flex items-center justify-center">
            {#if tab.icon === 'bookmark'}
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
              </svg>
            {:else if tab.icon === 'note'}
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                <path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd" />
              </svg>
            {:else if tab.icon === 'school'}
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
              </svg>
            {/if}
            <span>{tab.label}</span>
          </div>
        </button>
      {/each}
    </div>
  </header>
  
  <div class="tab-content">
    <!-- Aba de Salvar -->
    {#if activeTab === 'save'}
      <div class="save-tab">
        <SaveItemForm initialUrl={currentUrl} initialTitle={currentTitle} />
      </div>
    
    <!-- Aba de Notas -->
    {:else if activeTab === 'notes'}
      <div class="notes-tab">
        <div class="view-toggle flex justify-between items-center mb-4">
          <div class="toggle-buttons flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
            <button 
              class="px-3 py-1.5 text-sm transition-colors {notesViewMode === 'create' ? 'bg-blue-600 text-white' : 'bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}"
              onclick={() => notesViewMode = 'create'}
            >
              Criar
            </button>
            <button 
              class="px-3 py-1.5 text-sm transition-colors {notesViewMode === 'view' ? 'bg-blue-600 text-white' : 'bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}"
              onclick={() => notesViewMode = 'view'}
            >
              Visualizar
            </button>
          </div>
          
          <button 
            class="text-sm rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 transition-colors hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center px-3 py-1.5"
            onclick={() => openOptions('notes')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
            </svg>
            Gerenciar
          </button>
        </div>
        
        {#if notesViewMode === 'create'}
          <PopupNoteCreator />
        {:else if notesViewMode === 'view'}
          {#if recentNotes.length === 0}
            <div class="empty-state py-8 text-center">
              <div class="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto mb-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p class="text-gray-600 dark:text-gray-400 mb-4">Nenhuma nota encontrada</p>
                <button 
                  class="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  onclick={() => notesViewMode = 'create'}
                >
                  Criar sua primeira nota
                </button>
              </div>
            </div>
          {:else}
            <div class="notes-list space-y-3">
              {#each recentNotes as note}
                <div 
                  class="note-item p-3 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow"
                  style="background-color: {note.color || '#f9fafb'}"
                >
                  <div class="note-content mb-2">
                    <p class="text-gray-800 dark:text-gray-100">{truncateText(note.content, 100)}</p>
                  </div>
                  <div class="note-meta text-xs text-gray-500 flex justify-between items-center mt-2">
                    <span class="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd" />
                      </svg>
                      {formatDate(note.dateCreated)}
                    </span>
                    {#if note.tags && note.tags.length > 0}
                      <div class="tags flex flex-wrap gap-1 justify-end">
                        {#each note.tags.slice(0, 2) as tag}
                          <span class="bg-gray-200/50 dark:bg-gray-800/50 px-2 py-0.5 rounded-full">{tag}</span>
                        {/each}
                        {#if note.tags.length > 2}
                          <span class="bg-gray-200/50 dark:bg-gray-800/50 px-2 py-0.5 rounded-full">+{note.tags.length - 2}</span>
                        {/if}
                      </div>
                    {/if}
                  </div>
                </div>
              {/each}
              <div class="text-center mt-4">
                <button 
                  class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm py-2 px-4 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors flex items-center mx-auto"
                  onclick={() => openOptions('notes')}
                >
                  <span>Ver mais notas</span>
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 ml-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clip-rule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          {/if}
        {/if}
      </div>
    
    <!-- Aba de Flashcards -->
    {:else if activeTab === 'flashcards'}
      <div class="flashcards-tab">
        <div class="view-toggle flex justify-between items-center mb-4">
          <div class="toggle-buttons flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
            <button 
              class="px-3 py-1.5 text-sm transition-colors {flashcardsViewMode === 'create' ? 'bg-blue-600 text-white' : 'bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}"
              onclick={() => flashcardsViewMode = 'create'}
            >
              Criar
            </button>
            <button 
              class="px-3 py-1.5 text-sm transition-colors {flashcardsViewMode === 'view' ? 'bg-blue-600 text-white' : 'bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}"
              onclick={() => flashcardsViewMode = 'view'}
            >
              Visualizar
            </button>
          </div>
          
          <button 
            class="text-sm rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 transition-colors hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center px-3 py-1.5"
            onclick={() => openOptions('flashcards')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3z" />
              <path d="M3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zm5.99 7.176A9.026 9.026 0 017 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
            </svg>
            Estudar
          </button>
        </div>
        
        {#if flashcardsViewMode === 'create'}
          <PopupFlashcardCreator />
        {:else if flashcardsViewMode === 'view'}
          {#if recentFlashcards.length === 0}
            <div class="empty-state py-8 text-center">
              <div class="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto mb-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <p class="text-gray-600 dark:text-gray-400 mb-4">Nenhum flashcard encontrado</p>
                <button 
                  class="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  onclick={() => flashcardsViewMode = 'create'}
                >
                  Criar seu primeiro flashcard
                </button>
              </div>
            </div>
          {:else}
            <div class="flashcards-list space-y-3">
              {#each recentFlashcards as card}
                <div class="flashcard-item p-3 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800 hover:shadow-md transition-shadow">
                  <div class="flashcard-front mb-2">
                    <h4 class="font-medium text-gray-800 dark:text-gray-100">{truncateText(card.front, 80)}</h4>
                  </div>
                  <div class="flashcard-back mb-3 text-sm text-gray-600 dark:text-gray-400">
                    <p>{truncateText(card.back, 100)}</p>
                  </div>
                  <div class="flashcard-meta text-xs text-gray-500 flex justify-between items-center">
                    <span class="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd" />
                      </svg>
                      {formatDate(card.dateCreated)}
                    </span>
                    {#if card.tags && card.tags.length > 0}
                      <div class="tags flex flex-wrap gap-1 justify-end">
                        {#each card.tags.slice(0, 2) as tag}
                          <span class="bg-gray-200/50 dark:bg-gray-800/50 px-2 py-0.5 rounded-full">{tag}</span>
                        {/each}
                        {#if card.tags.length > 2}
                          <span class="bg-gray-200/50 dark:bg-gray-800/50 px-2 py-0.5 rounded-full">+{card.tags.length - 2}</span>
                        {/if}
                      </div>
                    {/if}
                  </div>
                </div>
              {/each}
              <div class="text-center mt-4">
                <button 
                  class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm py-2 px-4 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors flex items-center mx-auto"
                  onclick={() => openOptions('flashcards')}
                >
                  <span>Ver mais flashcards</span>
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 ml-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clip-rule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          {/if}
        {/if}
      </div>
    {/if}
  </div>
  
  <footer class="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 text-center">
    <!-- Botão de Configurações removido -->
  </footer>
</main>

<style>
  :global(body) {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    margin: 0;
    padding: 0;
    background-color: white;
    color: #1a1a1a;
  }
  
  @media (prefers-color-scheme: dark) {
    :global(body) {
      background-color: #1a1a1a;
      color: #f9f9f9;
    }
  }

  .popup-container {
    width: 400px;
    box-sizing: border-box;
    padding: 16px;
  }
</style> 