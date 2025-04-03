<script lang="ts">
  import { onMount } from 'svelte';
  import NotesView from './views/NotesView.svelte';
  import FlashcardsView from './views/FlashcardsView.svelte';
  import SettingsView from './views/SettingsView.svelte';
  import SavedItemsView from './views/SavedItemsView.svelte';
  import { fixReferences } from '../storage';
  import { toast } from "svelte-sonner";
  import { Toaster } from "../lib/components/ui/sonner/index.js";
  
  // Definição das abas de navegação
  const tabs = [
    { id: 'saved', label: 'Itens Salvos', icon: 'bookmark' },
    { id: 'notes', label: 'Notas', icon: 'note' },
    { id: 'flashcards', label: 'Flashcards', icon: 'school' },
    { id: 'settings', label: 'Configurações', icon: 'settings' }
  ];
  
  // Usando let para variáveis de estado em vez de $state
  let activeTab = 'saved';
  let isFixingReferences = false;
  let fixResults = null;
  
  onMount(() => {
    // Tratamento para o erro "Extension context invalidated"
    window.addEventListener('error', (event) => {
      if (event.message.includes('Extension context invalidated')) {
        console.warn('Contexto da extensão invalidado. Recarregando a página...');
        // Recarregar a página após um pequeno delay
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    });
    
    // Verificar se há uma aba específica para abrir
    try {
      chrome.storage.local.get(['activeOptionsTab'], (result) => {
        if (result.activeOptionsTab && tabs.find(tab => tab.id === result.activeOptionsTab)) {
          activeTab = result.activeOptionsTab;
          // Limpar a preferência para não influenciar aberturas futuras
          chrome.storage.local.remove(['activeOptionsTab']);
        }
      });
    } catch (error) {
      console.error('Erro ao acessar storage:', error);
    }
  });
  
  function runFixReferences() {
    isFixingReferences = true;
    setTimeout(async () => {
      try {
        const result = await fixReferences();
        
        // Exibir toast com o resultado
        if (result && result.itemsUpdated) {
          toast.success("Referências corrigidas com sucesso!", {
            description: `Referências foram corrigidas nos itens.`,
            duration: 3000,
          });
        } else {
          toast.info("Verificação concluída", {
            description: "Nenhuma referência precisou ser corrigida.",
            duration: 3000,
          });
        }
      } catch (error) {
        console.error("Erro ao consertar referências:", error);
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

<main class="options-page flex flex-col h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
  <header class="bg-white dark:bg-gray-800 shadow px-6 py-4 flex justify-between items-center">
    <h1 class="text-2xl font-bold">Extensor de Navegador</h1>
    
    <div class="actions flex gap-2">
      <button 
        class="text-sm px-3 py-1 rounded-md bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors flex items-center gap-1"
        onclick={runFixReferences}
        disabled={isFixingReferences}
      >
        {#if isFixingReferences}
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Corrigindo...</span>
        {:else}
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
          <span>Corrigir Referências</span>
        {/if}
      </button>
    </div>
  </header>
  
  <div class="flex flex-1 overflow-hidden">
    <!-- Barra lateral de navegação -->
    <aside class="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex-shrink-0">
      <nav class="py-4">
        <ul class="space-y-1">
          {#each tabs as tab}
            <li>
              <button
                class="w-full flex items-center px-4 py-3 text-left transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
                class:bg-gray-200={activeTab === tab.id}
                class:dark:bg-gray-700={activeTab === tab.id}
                class:text-blue-600={activeTab === tab.id}
                class:dark:text-blue-400={activeTab === tab.id}
                onclick={() => activeTab = tab.id}
              >
                {#if tab.icon === 'bookmark'}
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                  </svg>
                {:else if tab.icon === 'note'}
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                    <path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd" />
                  </svg>
                {:else if tab.icon === 'school'}
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                  </svg>
                {:else if tab.icon === 'settings'}
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
                  </svg>
                {/if}
                <span>{tab.label}</span>
              </button>
            </li>
          {/each}
        </ul>
      </nav>
    </aside>
    
    <!-- Conteúdo principal -->
    <div class="flex-1 overflow-auto p-6">
      {#if activeTab === 'saved'}
        <SavedItemsView />
      {:else if activeTab === 'notes'}
        <NotesView />
      {:else if activeTab === 'flashcards'}
        <FlashcardsView />
      {:else if activeTab === 'settings'}
        <SettingsView />
      {/if}
    </div>
  </div>
  
  <!-- Componente Toaster para exibir notificações -->
  <Toaster richColors position="top-right" />
</main>

<style>
  :global(body) {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    margin: 0;
    padding: 0;
    height: 100vh;
    overflow: hidden;
  }
  
  @media (prefers-color-scheme: dark) {
    :global(body) {
      background-color: #121212;
      color: #f9f9f9;
    }
  }
</style> 