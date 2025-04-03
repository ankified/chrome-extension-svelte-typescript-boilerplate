<script lang="ts">
  import { onMount } from 'svelte';
  import SaveItemForm from './components/SaveItemForm.svelte';
  import { notes, flashcards, savedItems, fixReferences } from './storage';
  import type { Note, Flashcard } from './types';
  import PopupNoteCreator from './lib/components/PopupNoteCreator.svelte';
  import PopupFlashcardCreator from './lib/components/PopupFlashcardCreator.svelte';
  import { format } from 'date-fns/format';
  import { toast } from "svelte-sonner";
  
  // Importar componentes do Shadcn
  import * as Tabs from "./lib/components/ui/tabs/index.js";
  import * as ToggleGroup from "./lib/components/ui/toggle-group/index.js";
  import { Toaster } from "./lib/components/ui/sonner/index.js";
  
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
  let isFixingReferences = $state(false);
  let fixResult = $state<any>(null);
  let isLoading = $state(true);
  
  // Flags separadas para cada modo de visualização
  let notesCreateLoaded = $state(false);
  let notesViewLoaded = $state(false);
  let flashcardsCreateLoaded = $state(false);
  let flashcardsViewLoaded = $state(false);
  
  // Função para lidar com a mudança de abas (componente Tabs do Shadcn)
  function handleTabChange(tabValue: string) {
    activeTab = tabValue;
  }
  
  // Recuperar a última aba ativa do armazenamento local
  onMount(() => {
    // Restaurar a aba ativa salva anteriormente
    chrome.storage.local.get('popupActiveTab', (result) => {
      if (result.popupActiveTab) {
        activeTab = result.popupActiveTab;
      }
    });
    
    // Obter URL e título assincronamente
    getTabInfo();
    
    // Carregar dados iniciais
    setTimeout(() => {
      loadDataForActiveTab();
      isLoading = false;
    }, 100);
  });
  
  // Carregar dados conforme necessário quando a aba mudar
  $effect(() => {
    loadDataForActiveTab();
    
    // Salvar a aba ativa quando mudar
    chrome.storage.local.set({ popupActiveTab: activeTab });
  });
  
  // Monitorar mudanças nos modos de visualização para carregar dados quando necessário
  $effect(() => {
    if (activeTab === 'notes' && notesViewMode === 'view') {
      // Primeiro marcar como não carregado para mostrar o spinner
      notesViewLoaded = false;
      // Usar setTimeout para permitir a renderização do spinner
      setTimeout(() => {
        loadRecentNotes();
        notesViewLoaded = true;
      }, 100);
    }
  });
  
  $effect(() => {
    if (activeTab === 'flashcards' && flashcardsViewMode === 'view') {
      // Primeiro marcar como não carregado para mostrar o spinner
      flashcardsViewLoaded = false;
      // Usar setTimeout para permitir a renderização do spinner
      setTimeout(() => {
        loadRecentFlashcards();
        flashcardsViewLoaded = true;
      }, 100);
    }
  });
  
  // Função para obter informações da aba atual de forma otimizada
  function getTabInfo() {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0]) {
          currentUrl = tabs[0].url || "";
          currentTitle = tabs[0].title || "";
        }
      });
    }
  }
  
  // Função melhorada para carregar dados de acordo com a aba e modo de visualização ativos
  function loadDataForActiveTab() {
    if (activeTab === 'notes') {
      if (notesViewMode === 'view') {
        // Primeiro marcar como não carregado para mostrar o spinner
        notesViewLoaded = false;
        // Usar setTimeout para permitir a renderização do spinner
        setTimeout(() => {
          loadRecentNotes();
          notesViewLoaded = true;
        }, 100);
      } else if (notesViewMode === 'create' && !notesCreateLoaded) {
        notesCreateLoaded = true;
      }
    } else if (activeTab === 'flashcards') {
      if (flashcardsViewMode === 'view') {
        // Primeiro marcar como não carregado para mostrar o spinner
        flashcardsViewLoaded = false;
        // Usar setTimeout para permitir a renderização do spinner
        setTimeout(() => {
          loadRecentFlashcards();
          flashcardsViewLoaded = true;
        }, 100);
      } else if (flashcardsViewMode === 'create' && !flashcardsCreateLoaded) {
        flashcardsCreateLoaded = true;
      }
    }
  }
  
  // Carregar notas recentes da store - otimizado
  function loadRecentNotes() {
    let unsubscribe: () => void; // Definir tipo correto
    unsubscribe = notes.subscribe(allNotes => {
    if (allNotes.length > 0) {
      // Ordenar por data de criação (mais recentes primeiro) e pegar as 5 primeiras
        const sorted = allNotes
          .slice(0)
        .sort((a, b) => b.dateCreated - a.dateCreated)
        .slice(0, 5);
        
        recentNotes = sorted;
    }
      // Cancelar inscrição após obter os dados
      if (unsubscribe) unsubscribe();
    });
  }
  
  // Carregar flashcards recentes da store - otimizado
  function loadRecentFlashcards() {
    let unsubscribe: () => void; // Definir tipo correto
    unsubscribe = flashcards.subscribe(allFlashcards => {
    if (allFlashcards.length > 0) {
      // Ordenar por data de criação (mais recentes primeiro) e pegar os 5 primeiros
        const sorted = allFlashcards
          .slice(0)
        .sort((a, b) => b.dateCreated - a.dateCreated)
        .slice(0, 5);
        
        recentFlashcards = sorted;
      }
      // Cancelar inscrição após obter os dados
      if (unsubscribe) unsubscribe();
    });
  }
  
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

  function runFixReferences() {
    isFixingReferences = true;
    setTimeout(() => {
      try {
        const result = fixReferences();
        
        // Exibir toast com o resultado
        if (result && result.fixed) {
          toast.success("Referências corrigidas com sucesso!", {
            description: `${result.fixed} referências foram corrigidas.`,
            duration: 3000,
          });
        } else {
          toast.info("Verificação concluída", {
            description: "Nenhuma referência precisou ser corrigida.",
            duration: 3000,
          });
        }
        
        // Atualizar as notas e flashcards se estivermos na aba correspondente
        if (activeTab === 'notes' && notesViewMode === 'view') {
          loadRecentNotes();
        } else if (activeTab === 'flashcards' && flashcardsViewMode === 'view') {
          loadRecentFlashcards();
        }
      } catch (error) {
        console.error("Erro ao corrigir referências:", error);
        toast.error("Erro ao corrigir referências", {
          description: error instanceof Error ? error.message : "Ocorreu um erro desconhecido",
          duration: 5000,
        });
      } finally {
        isFixingReferences = false;
      }
    }, 100);
  }
</script>

<main class="popup-container">
  <!-- {#if isLoading}
    <div class="flex justify-center items-center p-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
    </div> -->
  <!-- {:else} -->
    <!-- Usando o componente Tabs do Shadcn-Svelte -->
    <Tabs.Root value={activeTab} onValueChange={handleTabChange} class="w-full flex flex-col flex-1">
      <Tabs.List class="flex border-b border-gray-200 dark:border-gray-700 mb-4">
        <Tabs.Trigger value="save" class="flex-1 py-2 px-3 transition-colors focus:outline-none">
          <div class="flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
              </svg>
            <span>Salvar</span>
          </div>
        </Tabs.Trigger>
        <Tabs.Trigger value="notes" class="flex-1 py-2 px-3 transition-colors focus:outline-none">
          <div class="flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                <path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd" />
              </svg>
            <span>Notas</span>
          </div>
        </Tabs.Trigger>
        <Tabs.Trigger value="flashcards" class="flex-1 py-2 px-3 transition-colors focus:outline-none">
          <div class="flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
              </svg>
            <span>Flashcards</span>
          </div>
        </Tabs.Trigger>
      </Tabs.List>
      
      <!-- Conteúdo de cada aba -->
      <Tabs.Content value="save" class="focus:outline-none tab-content flex-1">
        <div class="content-container">
          <SaveItemForm initialUrl={currentUrl} initialTitle={currentTitle} />
        </div>
      </Tabs.Content>
    
      <Tabs.Content value="notes" class="focus:outline-none tab-content flex-1">
        <div class="content-container notes-tab">
          <div class="view-toggle flex justify-between items-center mb-4">
              <ToggleGroup.Root type="single" value={notesViewMode} onValueChange={(value: string | null) => value && (notesViewMode = value)} class="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
                <ToggleGroup.Item value="create" class="px-3 py-1.5 text-sm transition-colors data-[state=on]:bg-blue-600 data-[state=on]:text-white data-[state=off]:bg-transparent data-[state=off]:text-gray-700 data-[state=off]:dark:text-gray-300 data-[state=off]:hover:bg-gray-100 data-[state=off]:dark:hover:bg-gray-800">
                Criar
                </ToggleGroup.Item>
                <ToggleGroup.Item value="view" class="px-3 py-1.5 text-sm transition-colors data-[state=on]:bg-blue-600 data-[state=on]:text-white data-[state=off]:bg-transparent data-[state=off]:text-gray-700 data-[state=off]:dark:text-gray-300 data-[state=off]:hover:bg-gray-100 data-[state=off]:dark:hover:bg-gray-800">
                  Visualizar
                </ToggleGroup.Item>
              </ToggleGroup.Root>
              
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
          
          <div class="notes-content-wrapper flex-1 overflow-auto">
            {#if notesViewMode === 'create'}
              <PopupNoteCreator />
            {:else if notesViewMode === 'view'}
                {#if !notesViewLoaded}
                  <div class="flex justify-center items-center p-6">
                    <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                  </div>
                {:else if recentNotes.length === 0}
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
        </div>
      </Tabs.Content>
    
      <Tabs.Content value="flashcards" class="focus:outline-none tab-content flex-1">
        <div class="content-container flashcards-tab">
          <div class="view-toggle flex justify-between items-center mb-4">
              <ToggleGroup.Root type="single" value={flashcardsViewMode} onValueChange={(value: string | null) => value && (flashcardsViewMode = value)} class="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
                <ToggleGroup.Item value="create" class="px-3 py-1.5 text-sm transition-colors data-[state=on]:bg-blue-600 data-[state=on]:text-white data-[state=off]:bg-transparent data-[state=off]:text-gray-700 data-[state=off]:dark:text-gray-300 data-[state=off]:hover:bg-gray-100 data-[state=off]:dark:hover:bg-gray-800">
                Criar
                </ToggleGroup.Item>
                <ToggleGroup.Item value="view" class="px-3 py-1.5 text-sm transition-colors data-[state=on]:bg-blue-600 data-[state=on]:text-white data-[state=off]:bg-transparent data-[state=off]:text-gray-700 data-[state=off]:dark:text-gray-300 data-[state=off]:hover:bg-gray-100 data-[state=off]:dark:hover:bg-gray-800">
                  Visualizar
                </ToggleGroup.Item>
              </ToggleGroup.Root>
              
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
          
          <div class="flashcards-content-wrapper flex-1 overflow-auto">
            {#if flashcardsViewMode === 'create'}
              <PopupFlashcardCreator />
            {:else if flashcardsViewMode === 'view'}
                {#if !flashcardsViewLoaded}
                  <div class="flex justify-center items-center p-6">
                    <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                  </div>
                {:else if recentFlashcards.length === 0}
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
        </div>
      </Tabs.Content>
    </Tabs.Root>
    
    
  <!-- {/if} -->
  
  <!-- Componente Toaster para exibir notificações -->
  <Toaster richColors position="top-right" />
</main>

<style>
  :global(body) {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    margin: 0;
    padding: 0;
    background-color: white;
    color: #1a1a1a;
    min-width: 400px;
    min-height: 500px;
    overflow-x: hidden;
  }
  
  @media (prefers-color-scheme: dark) {
    :global(body) {
      background-color: #1a1a1a;
      color: #f9f9f9;
    }
  }

  .popup-container {
    width: 400px;
    min-height: 500px;
    max-height: 500px;
    box-sizing: border-box;
    padding: 16px;
    display: flex;
    flex-direction: column;
  }
  
  /* Estilização personalizada para o componente Tabs do Shadcn-Svelte */
  :global(.tab-content) {
    margin-top: 0; /* Ajustado para o layout do componente Tabs */
  }
  
  /* Garantir que o conteúdo das abas tenha altura consistente */
  :global(.tab-content > div) {
    min-height: 400px;
    overflow-y: auto;
    overflow-x: hidden;
  }
  
  /* Estilização para garantir que os containers de conteúdo tenham dimensões consistentes */
  :global(.content-container) {
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow: auto;
  }
</style> 