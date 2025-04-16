<script lang="ts">
  import { onMount } from 'svelte';
  import NotesView from './views/NotesView.svelte';
  import FlashcardsView from './views/FlashcardsView.svelte';
  import SettingsView from './views/SettingsView.svelte';
  import SavedItemsView from './views/SavedItemsView.svelte';
  import { fixReferences, verifyAndFixGroupRelations } from '../storage';
  import { toast } from "svelte-sonner";
  import { Toaster } from "../lib/components/ui/sonner/index.js";
  import AppSidebar from '../lib/components/app-sidebar.svelte';
  import * as Sidebar from '../lib/components/ui/sidebar/index.js';
  
  // Definição das abas de navegação
  const tabs = [
    { id: 'saved', label: 'Itens Salvos', icon: 'bookmark' },
    { id: 'notes', label: 'Notas', icon: 'note' },
    { id: 'flashcards', label: 'Flashcards', icon: 'school' },
    { id: 'settings', label: 'Configurações', icon: 'settings' }
  ];
  
  // Agora o valor padrão é 'saved-cards'
  let activeTab = $state('saved-cards');
  let isFixingReferences = $state(false);
  let fixResults = $state(null);
  let fixingGroupRelations = $state(false);
  let lastFixResult = $state<string | null>(null);
  
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
      if (result.activeOptionsTab) {
        activeTab = result.activeOptionsTab;
        // Limpar a preferência para não influenciar aberturas futuras
        chrome.storage.local.remove(['activeOptionsTab']);
      }
    });
    } catch (error) {
      console.error('Erro ao acessar storage:', error);
    }

    fixReferences();
    verifyAndFixGroupRelations();
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
  
  function changeTab(tabId: string) {
    activeTab = tabId;
  }
  
  function getSavedViewMode(tab: string): 'cards' | 'table' | 'kanban' | 'flow' {
    if (tab.startsWith('saved-')) {
      const mode = tab.replace('saved-', '');
      if (["cards", "table", "kanban", "flow"].includes(mode)) {
        return mode as 'cards' | 'table' | 'kanban' | 'flow';
      }
    }
    return 'cards';
  }
  
  // Função para corrigir as relações entre grupos e itens
  async function fixGroupRelations() {
    fixingGroupRelations = true;
    
    try {
      const result = await verifyAndFixGroupRelations();
      
      if (result.success) {
        lastFixResult = `Relações de grupos corrigidas com sucesso! ${result.itemsUpdated} itens e ${result.groupsUpdated} grupos foram atualizados.`;
        
        // Exibir toast de sucesso
        toast.success("Relações de grupos corrigidas!", {
          description: `${result.itemsUpdated} itens e ${result.groupsUpdated} grupos foram atualizados.`,
          duration: 5000,
        });
      } else {
        lastFixResult = "Ocorreu um erro ao corrigir as relações de grupos.";
        
        // Exibir toast de erro
        toast.error("Erro ao corrigir relações de grupos", {
          description: "Ocorreu um problema durante o processo. Por favor, tente novamente.",
          duration: 5000,
        });
      }
    } catch (error) {
      console.error("Erro ao corrigir relações de grupos:", error);
      lastFixResult = "Ocorreu um erro ao corrigir as relações de grupos.";
      
      // Exibir toast de erro
      toast.error("Erro ao corrigir relações de grupos", {
        description: "Ocorreu um problema durante o processo. Por favor, tente novamente.",
        duration: 5000,
      });
    } finally {
      fixingGroupRelations = false;
    }
  }
</script>

<Sidebar.Provider>
  <AppSidebar {activeTab} onTabChange={changeTab} />
  <Sidebar.Inset>
    <header class="bg-white dark:bg-gray-800 shadow px-6 py-0 flex justify-between items-center">
      <!-- Título removido conforme solicitado -->
    </header>
    <main class="flex-1 h-full overflow-auto p-1">
      {#if activeTab.startsWith('saved')}
        <SavedItemsView viewMode={getSavedViewMode(activeTab)} />
      {:else if activeTab === 'notes'}
        <NotesView />
      {:else if activeTab === 'flashcards'}
        <FlashcardsView />
      {:else if activeTab === 'settings'}
        <SettingsView />
      {/if}
    </main>
  </Sidebar.Inset>
  <Toaster richColors position="top-right" />
</Sidebar.Provider>

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