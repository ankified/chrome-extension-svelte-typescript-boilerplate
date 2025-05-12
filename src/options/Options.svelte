<script lang="ts">
  import { onMount } from 'svelte';
  import FlashcardsView from './views/FlashcardsView.svelte';
  import SettingsView from './views/SettingsView.svelte';
  import SavedItemsView from './views/SavedItemsView.svelte';
  import ShortNotesView from './views/ShortNotesView.svelte';
  import AnnotationsView from './views/AnnotationsView.svelte';
  import { fixReferences, verifyAndFixGroupRelations } from '../storage';
  import { toast } from "svelte-sonner";
  import { Toaster } from "../lib/components/ui/sonner/index.js";
  import AppSidebar from '../lib/components/app-sidebar.svelte';
  import * as Sidebar from '../lib/components/ui/sidebar/index.js';
  import * as Breadcrumb from '../lib/components/ui/breadcrumb/index.js';
  import { Separator } from '../lib/components/ui/separator/index.js';
  import { Root as ToggleGroup, Item as ToggleGroupItem } from "../lib/components/ui/toggle-group/index.js";
  import List from "@lucide/svelte/icons/list";
  import LayoutGrid from "@lucide/svelte/icons/layout-grid";
  // Definição das abas de navegação
  // const tabs = [
  //   { id: 'saved', label: 'Itens Salvos', icon: 'bookmark' },
  //   { id: 'notes', label: 'Notas', icon: 'note' },
  //   { id: 'flashcards', label: 'Flashcards', icon: 'school' },
  //   { id: 'settings', label: 'Configurações', icon: 'settings' }
  // ];
  
  // activeTab agora será, por exemplo, 'home', 'saved-web', 'saved-local', 'kb-vademecum', etc.
  let activeTab = $state('home');
  let savedItemsViewMode = $state<'table' | 'cards'>('cards');
  
  let isFixingReferences = $state(false);
  // let fixResults = $state(null); // Não parece estar sendo usado
  let fixingGroupRelations = $state(false);
  let lastFixResult = $state<string | null>(null);
  
  // Mapeamento para o Breadcrumb
  const tabLabels: Record<string, string> = {
    'home': 'Início',
    'kb-vademecum': 'Vade-mecum',
    'kb-updates': 'Atualizações',
    'kb-wiki': 'Wiki',
    'saved-web': 'Web',
    'saved-local': 'Local',
    'project-kanban': 'Kanban',
    'project-flow': 'Fluxo',
    'project-schedule': 'Cronograma',
    'personal-heuristics': 'Heurísticas',
    'personal-notes-short': 'Notas curtas',
    'personal-notes-annotations': 'Anotações',
    'personal-flashcards': 'Flashcards',
    'settings': 'Configurações',
    'alerts': 'Alertas'
    // Adicionar outros conforme necessário
  };

  const parentTabLabels: Record<string, string> = {
    'kb-vademecum': 'Base de conhecimento',
    'kb-updates': 'Base de conhecimento',
    'kb-wiki': 'Base de conhecimento',
    'saved-web': 'Itens Salvos',
    'saved-local': 'Itens Salvos',
    'project-kanban': 'Projeto',
    'project-flow': 'Projeto',
    'project-schedule': 'Projeto',
    'personal-notes-short': 'Notas',
    'personal-notes-annotations': 'Notas',
  };

  $effect(() => {
    // Quando activeTab for 'saved-web', definir modo de visualização para 'table'
    if (activeTab === 'saved-web') {
      savedItemsViewMode = 'cards';
    }
    // Poderia adicionar lógica para 'saved-local' se precisar de um padrão diferente
  });
  
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

    // fixReferences();
    // verifyAndFixGroupRelations();
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
  
  // getSavedViewMode não é mais necessária
  // function getSavedViewMode(tab: string): 'cards' | 'table' | 'kanban' | 'flow' { ... }
  
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

  function getItemCategory(currentTab: string): 'web' | 'local' | null {
    if (currentTab === 'saved-web') return 'web';
    if (currentTab === 'saved-local') return 'local';
    return null;
  }
</script>

<Sidebar.Provider>
  <AppSidebar {activeTab} onTabChange={changeTab} />
  <Sidebar.Inset class="!h-2 min-h-0 p-1 overflow-y-auto">
    <header class="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <div class="flex flex-1 items-center gap-2">
        <Sidebar.Trigger class="-ml-1" />
        <Separator orientation="vertical" class="mr-2 h-6" />
        <Breadcrumb.Root>
          <Breadcrumb.List>
            {#if parentTabLabels[activeTab]}
              <Breadcrumb.Item>
                <Breadcrumb.Link href="#">{parentTabLabels[activeTab]}</Breadcrumb.Link>
              </Breadcrumb.Item>
              <Breadcrumb.Separator />
            {/if}
            <Breadcrumb.Item>
              <Breadcrumb.Page>{tabLabels[activeTab] ?? activeTab}</Breadcrumb.Page>
            </Breadcrumb.Item>
          </Breadcrumb.List>
        </Breadcrumb.Root>

        {#if activeTab === 'saved-web' || activeTab === 'saved-local'}
          <div class="ml-auto flex items-center gap-2">
            <ToggleGroup type="single" bind:value={savedItemsViewMode} size="sm">
              <ToggleGroupItem value="table" aria-label="Visualização em Tabela">
                <List class="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="cards" aria-label="Visualização em Cartões">
                <LayoutGrid class="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        {/if}
      </div>
  </header>
    <main class="flex-1 flex-grow !h-2 min-h-0 overflow-hidden p-4">
      {#if activeTab === 'saved-web' || activeTab === 'saved-local'}
        {@const category = getItemCategory(activeTab)}
        {#if category}
          <SavedItemsView itemCategory={category} viewMode={savedItemsViewMode} />
        {/if}
      {:else if activeTab === 'personal-notes-short'}
        <ShortNotesView />
      {:else if activeTab === 'personal-notes-annotations'}
        <AnnotationsView />
      {:else if activeTab === 'flashcards' || activeTab === 'personal-flashcards'}
        <FlashcardsView />
      {:else if activeTab === 'settings'}
        <SettingsView />
      {:else}
         <!-- Renderizar algo para 'home', 'kb-...', 'project-...', 'personal-heuristics', 'alerts' -->
         <!-- ou deixar em branco/mostrar uma mensagem de "Em desenvolvimento" -->
         <div class="p-4 text-center text-muted-foreground">
           Visualização para "{tabLabels[activeTab] ?? activeTab}" não implementada.
         </div>
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