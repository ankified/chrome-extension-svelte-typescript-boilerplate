<script lang="ts">
  import { onMount } from 'svelte';
  import { savedItems, notes, flashcards, groups, fixReferences, verifyAndFixGroupRelations } from '../../storage';
  import * as Dialog from "../../lib/components/ui/dialog/index.js";
  import type { SavedItem, Note, Flashcard, Group } from '../../types';
  import { toast } from "svelte-sonner";
  import { ScrollArea } from '../../lib/components/ui/scroll-area';
  import * as Card from '../../lib/components/ui/card/index.js';
  
  let darkMode = $state(false);
  let syncEnabled = $state(false);
  let notificationEnabled = $state(false);
  let showDataDialog = $state(false);
  let currentData = $state<{
    savedItems: SavedItem[],
    notes: Note[],
    flashcards: Flashcard[],
    groups: Group[]
  }>({ savedItems: [], notes: [], flashcards: [], groups: [] });
  
  let fixingReferences = $state(false);
  let fixingGroupRelations = $state(false);
  let lastFixResult = $state("");
  
  // Função para exportar todos os dados
  async function exportData() {
    // Obter todos os dados armazenados
    const data = {
      savedItems: await getStoreValue(savedItems),
      notes: await getStoreValue(notes),
      flashcards: await getStoreValue(flashcards),
      groups: await getStoreValue(groups),
      exportDate: new Date().toISOString()
    };
    
    // Criar um blob com os dados JSON
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Criar um link temporário para download
    const a = document.createElement('a');
    a.href = url;
    a.download = `browser-extension-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    
    // Limpar
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
  }
  
  // Função auxiliar para obter o valor de uma store Svelte
  function getStoreValue<T>(store: any): Promise<T> {
    return new Promise<T>(resolve => {
      let value: T;
      const unsubscribe = store.subscribe((v: T) => {
        value = v;
      });
      
      // Executar unsubscribe e resolver após o valor ser obtido
      setTimeout(() => {
        unsubscribe();
        resolve(value);
      }, 0);
    });
  }
  
  // Função para importar dados
  function importData(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        if (!e.target?.result) return;
        
        const data = JSON.parse(e.target.result as string);
        
        // Validação básica dos dados
        if (!data.savedItems || !data.notes || !data.flashcards || !data.groups) {
          throw new Error('Formato de arquivo inválido. O arquivo não contém todos os dados necessários.');
        }
        
        // Confirmar a importação
        if (confirm('Isso substituirá todos os seus dados atuais. Deseja continuar?')) {
          // Importar os dados
          savedItems.set(data.savedItems);
          notes.set(data.notes);
          flashcards.set(data.flashcards);
          groups.set(data.groups);
          
          alert('Dados importados com sucesso!');
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        alert(`Erro ao importar dados: ${errorMessage}`);
      }
      
      // Limpar o input para permitir importar o mesmo arquivo novamente
      if (input) input.value = "";
    };
    
    reader.readAsText(file);
  }
  
  // Função para limpar todos os dados
  function clearAllData() {
    if (confirm('Tem certeza que deseja excluir TODOS os seus dados? Esta ação não pode ser desfeita.')) {
      if (confirm('ÚLTIMA CHANCE: Todos os seus itens salvos, notas e flashcards serão excluídos permanentemente.')) {
        savedItems.set([]);
        notes.set([]);
        flashcards.set([]);
        groups.set([]);
        
        alert('Todos os dados foram excluídos.');
      }
    }
  }
  
  onMount(() => {
    // Obter configurações salvas
    chrome.storage.sync.get(['darkMode', 'syncEnabled', 'notificationEnabled'], (result) => {
      darkMode = result.darkMode || false;
      syncEnabled = result.syncEnabled || false;
      notificationEnabled = result.notificationEnabled || false;
    });
  });
  
  // Atualizar configurações quando mudarem
  function updateSettings() {
    chrome.storage.sync.set({
      darkMode,
      syncEnabled,
      notificationEnabled
    });
  }

  // Função para visualizar todos os dados armazenados
  async function viewAllData() {
    try {
      console.log("Carregando dados...");
      
      // Obter dados de todas as stores
      const savedItemsData = await getStoreValue<SavedItem[]>(savedItems);
      const notesData = await getStoreValue<Note[]>(notes);
      const flashcardsData = await getStoreValue<Flashcard[]>(flashcards);
      const groupsData = await getStoreValue<Group[]>(groups);
      
      console.log("Dados carregados com sucesso");
      
      // Atualizar os dados
      currentData = {
        savedItems: savedItemsData,
        notes: notesData,
        flashcards: flashcardsData,
        groups: groupsData
      };
      
      // Exibir o dialog
      showDataDialog = true;
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      alert("Ocorreu um erro ao carregar os dados. Consulte o console para mais detalhes.");
    }
  }

  // Formatar dados para exibição
  function formatDate(timestamp: number): string {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString();
  }

  // Verificar quantos bytes um objeto ocupa (aproximadamente)
  function getObjectSize(obj: any): number {
    const json = JSON.stringify(obj);
    return (json.length * 2) / 1024; // Aproximação em KB
  }

  // Corrigir referências entre notas, flashcards e itens
  async function fixItemReferences() {
    fixingReferences = true;
    
    try {
      const result = await fixReferences();
      
      if (result.itemsUpdated > 0 || result.notesUpdated > 0 || result.flashcardsUpdated > 0) {
        lastFixResult = `Referências corrigidas: ${result.itemsUpdated} itens, ${result.notesUpdated} notas e ${result.flashcardsUpdated} flashcards atualizados.`;
        
        toast.success("Referências corrigidas com sucesso!", {
          description: lastFixResult,
          duration: 5000,
        });
      } else {
        lastFixResult = "Todas as referências já estão corretas. Nenhuma alteração foi necessária.";
        
        toast.success("Verificação concluída", {
          description: lastFixResult,
          duration: 5000,
        });
      }
    } catch (error) {
      console.error("Erro ao corrigir referências:", error);
      lastFixResult = "Ocorreu um erro ao corrigir as referências.";
      
      toast.error("Erro", {
        description: "Ocorreu um erro ao processar os dados.",
        duration: 5000,
      });
    } finally {
      fixingReferences = false;
    }
  }
  
  // Corrigir relações entre grupos e itens salvos
  async function fixGroupRelations() {
    fixingGroupRelations = true;
    
    try {
      const result = await verifyAndFixGroupRelations();
      
      if (result.success) {
        lastFixResult = `Relações de grupos corrigidas com sucesso! ${result.itemsUpdated} itens e ${result.groupsUpdated} grupos foram atualizados.`;
        
        toast.success("Relações de grupos corrigidas!", {
          description: `${result.itemsUpdated} itens e ${result.groupsUpdated} grupos foram atualizados.`,
          duration: 5000,
        });
      } else {
        lastFixResult = "Ocorreu um erro ao corrigir as relações de grupos.";
        
        toast.error("Erro ao corrigir relações de grupos", {
          description: "Ocorreu um problema durante o processo. Por favor, tente novamente.",
          duration: 5000,
        });
      }
    } catch (error) {
      console.error("Erro ao corrigir relações de grupos:", error);
      lastFixResult = "Ocorreu um erro ao corrigir as relações de grupos.";
      
      toast.error("Erro ao corrigir relações de grupos", {
        description: "Ocorreu um problema durante o processo. Por favor, tente novamente.",
        duration: 5000,
      });
    } finally {
      fixingGroupRelations = false;
    }
  }
</script>

<!-- <div class="settings-view"> -->
 
  <ScrollArea class="min-h-0 h-full">
    <!-- Visualizar Dados -->
    <Card.Root class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
      <Card.Header class="text-xl font-semibold mb-4">
        <Card.Title>Visualizar Dados</Card.Title>
        <Card.Description class="text-sm text-gray-600 dark:text-gray-400">
          Visualize todos os dados armazenados pela extensão. Esta opção é útil para fins de diagnóstico.
        </Card.Description>
      </Card.Header>
      
      <Card.Content class="space-y-4">
        <!-- <p class="text-sm text-gray-600 dark:text-gray-400">
          Visualize todos os dados armazenados pela extensão. Esta opção é útil para fins de diagnóstico.
        </p> -->
        
        <button
          class="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded flex items-center space-x-2"
          onclick={viewAllData}
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
            <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd" />
          </svg>
          <span>Visualizar Dados Armazenados</span>
        </button>
      </Card.Content>
      
      <Dialog.Root bind:open={showDataDialog}>
        <Dialog.Content class="max-w-[90vw] max-h-[90vh] overflow-auto">
          <Dialog.Header>
            <Dialog.Title>Dados Armazenados</Dialog.Title>
            <Dialog.Description>
              Visão geral de todos os dados atualmente armazenados pela extensão.
            </Dialog.Description>
          </Dialog.Header>
          
          <div class="data-view space-y-6 py-4">
            <!-- Itens salvos -->
            <div class="data-Card.Root">
              <h3 class="text-lg font-medium mb-2">Itens Salvos ({currentData.savedItems.length})</h3>
              {#if currentData.savedItems.length === 0}
                <p class="text-gray-500 dark:text-gray-400 text-sm">Nenhum item salvo.</p>
              {:else}
                <div class="bg-gray-100 dark:bg-gray-900 p-3 rounded overflow-auto max-h-60">
                  <table class="w-full text-sm text-left">
                    <thead class="text-xs uppercase bg-gray-200 dark:bg-gray-800">
                      <tr>
                        <th class="px-3 py-2">Título</th>
                        <th class="px-3 py-2">URL</th>
                        <th class="px-3 py-2">Data</th>
                        <th class="px-3 py-2">Notas</th>
                        <th class="px-3 py-2">Flashcards</th>
                      </tr>
                    </thead>
                    <tbody>
                      {#each currentData.savedItems as item}
                        <tr class="border-b dark:border-gray-700">
                          <td class="px-3 py-2">{item.title || 'Sem título'}</td>
                          <td class="px-3 py-2 truncate max-w-[200px]">{item.url}</td>
                          <td class="px-3 py-2">{formatDate(item.dateAdded)}</td>
                          <td class="px-3 py-2">{item.noteIds?.length || 0}</td>
                          <td class="px-3 py-2">{item.flashcardIds?.length || 0}</td>
                        </tr>
                      {/each}
                    </tbody>
                  </table>
                </div>
              {/if}
            </div>
            
            <!-- Notas -->
            <div class="data-Card.Root">
              <h3 class="text-lg font-medium mb-2">Notas ({currentData.notes.length})</h3>
              {#if currentData.notes.length === 0}
                <p class="text-gray-500 dark:text-gray-400 text-sm">Nenhuma nota.</p>
              {:else}
                <div class="bg-gray-100 dark:bg-gray-900 p-3 rounded overflow-auto max-h-60">
                  <table class="w-full text-sm text-left">
                    <thead class="text-xs uppercase bg-gray-200 dark:bg-gray-800">
                      <tr>
                        <th class="px-3 py-2">ID</th>
                        <th class="px-3 py-2">Item ID</th>
                        <th class="px-3 py-2">Conteúdo</th>
                        <th class="px-3 py-2">Data Criação</th>
                        <th class="px-3 py-2">Tags</th>
                      </tr>
                    </thead>
                    <tbody>
                      {#each currentData.notes as note}
                        <tr class="border-b dark:border-gray-700">
                          <td class="px-3 py-2">{note.id.slice(0, 8)}...</td>
                          <td class="px-3 py-2">{note.itemId ? note.itemId.slice(0, 8) + '...' : 'N/A'}</td>
                          <td class="px-3 py-2 truncate max-w-[200px]">{note.content}</td>
                          <td class="px-3 py-2">{formatDate(note.dateCreated)}</td>
                          <td class="px-3 py-2">{note.tags?.join(', ') || 'Sem tags'}</td>
                        </tr>
                      {/each}
                    </tbody>
                  </table>
                </div>
              {/if}
            </div>
            
            <!-- Flashcards -->
            <div class="data-Card.Root">
              <h3 class="text-lg font-medium mb-2">Flashcards ({currentData.flashcards.length})</h3>
              {#if currentData.flashcards.length === 0}
                <p class="text-gray-500 dark:text-gray-400 text-sm">Nenhum flashcard.</p>
              {:else}
                <div class="bg-gray-100 dark:bg-gray-900 p-3 rounded overflow-auto max-h-60">
                  <table class="w-full text-sm text-left">
                    <thead class="text-xs uppercase bg-gray-200 dark:bg-gray-800">
                      <tr>
                        <th class="px-3 py-2">ID</th>
                        <th class="px-3 py-2">Item ID</th>
                        <th class="px-3 py-2">Frente</th>
                        <th class="px-3 py-2">Verso</th>
                        <th class="px-3 py-2">Data Criação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {#each currentData.flashcards as card}
                        <tr class="border-b dark:border-gray-700">
                          <td class="px-3 py-2">{card.id.slice(0, 8)}...</td>
                          <td class="px-3 py-2">{card.itemId ? card.itemId.slice(0, 8) + '...' : 'N/A'}</td>
                          <td class="px-3 py-2 truncate max-w-[150px]">{card.front}</td>
                          <td class="px-3 py-2 truncate max-w-[150px]">{card.back}</td>
                          <td class="px-3 py-2">{formatDate(card.dateCreated)}</td>
                        </tr>
                      {/each}
                    </tbody>
                  </table>
                </div>
              {/if}
            </div>
            
            <!-- Estatísticas de armazenamento -->
            <div class="data-Card.Root bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <h3 class="text-lg font-medium mb-2">Estatísticas de Armazenamento</h3>
              <div class="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div class="stat-card p-3 bg-white dark:bg-gray-700 rounded shadow-sm">
                  <div class="text-lg font-bold">{currentData.savedItems.length}</div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">Itens salvos</div>
                </div>
                <div class="stat-card p-3 bg-white dark:bg-gray-700 rounded shadow-sm">
                  <div class="text-lg font-bold">{currentData.notes.length}</div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">Notas</div>
                </div>
                <div class="stat-card p-3 bg-white dark:bg-gray-700 rounded shadow-sm">
                  <div class="text-lg font-bold">{currentData.flashcards.length}</div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">Flashcards</div>
                </div>
                <div class="stat-card p-3 bg-white dark:bg-gray-700 rounded shadow-sm">
                  <div class="text-lg font-bold">{getObjectSize(currentData).toFixed(2)} KB</div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">Tamanho total</div>
                </div>
              </div>
            </div>
          </div>
          
          <Dialog.Footer>
            <button 
              class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              onclick={() => showDataDialog = false}
            >
              Fechar
            </button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Root>
    </Card.Root>
    
    <!-- Aparência -->
    <Card.Root class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
      <Card.Header class="text-xl font-semibold mb-4">
        <Card.Title>Aparência</Card.Title>
        <Card.Description class="text-sm text-gray-600 dark:text-gray-400">
          Personalize a aparência da extensão.
        </Card.Description>
      </Card.Header>
      
      <div class="option-row flex items-center mb-4">
        <label class="flex items-center cursor-pointer">
          <input 
            type="checkbox" 
            bind:checked={darkMode} 
            onchange={updateSettings}
            class="form-checkbox h-5 w-5 text-blue-600"
          />
          <span class="ml-2">Modo escuro</span>
        </label>
        <span class="text-xs text-gray-500 dark:text-gray-400 ml-2">
          (Usar tema escuro para a extensão)
        </span>
      </div>
      
      <p class="text-sm text-gray-600 dark:text-gray-400">
        Por padrão, a extensão segue o tema do seu navegador. Esta configuração substitui o comportamento padrão.
      </p>
    </Card.Root>
    
    <!-- Sincronização e Notificações -->
    <Card.Root class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
      <Card.Header class="text-xl font-semibold mb-4">
        <Card.Title>Sincronização e Notificações</Card.Title>
        <Card.Description class="text-sm text-gray-600 dark:text-gray-400">
          Configure a sincronização entre dispositivos e as notificações.
        </Card.Description>
      </Card.Header>
      
      <div class="option-row flex items-center mb-4">
        <label class="flex items-center cursor-pointer">
          <input 
            type="checkbox" 
            bind:checked={syncEnabled} 
            onchange={updateSettings}
            class="form-checkbox h-5 w-5 text-blue-600"
          />
          <span class="ml-2">Sincronizar entre dispositivos</span>
        </label>
        <span class="text-xs text-gray-500 dark:text-gray-400 ml-2">
          (Recurso em desenvolvimento)
        </span>
      </div>
      
      <div class="option-row flex items-center mb-4">
        <label class="flex items-center cursor-pointer">
          <input 
            type="checkbox" 
            bind:checked={notificationEnabled} 
            onchange={updateSettings}
            class="form-checkbox h-5 w-5 text-blue-600"
          />
          <span class="ml-2">Notificações</span>
        </label>
        <span class="text-xs text-gray-500 dark:text-gray-400 ml-2">
          (Receber lembretes de items para "Ler mais tarde")
        </span>
      </div>
    </Card.Root>
    
    <!-- Backup e Restauração -->
    <Card.Root class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
      <Card.Header class="text-xl font-semibold mb-4">
        <Card.Title>Backup e Restauração</Card.Title>
        <Card.Description class="text-sm text-gray-600 dark:text-gray-400">
          Faça backup dos seus dados e restaure-os em caso de perda.
        </Card.Description>
      </Card.Header>
      
      <div class="actions space-y-4">
        <div>
          <button 
            class="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
            onclick={exportData}
          >
            Exportar Dados
          </button>
          <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Baixa um arquivo JSON com todos os seus dados salvos.
          </p>
        </div>
        
        <div>
          <label class="block">
            <span class="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white py-2 px-4 rounded cursor-pointer inline-block">
              Importar Dados
              <input 
                type="file" 
                accept=".json" 
                onchange={importData}
                class="hidden"
              />
            </span>
          </label>
          <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Restaura seus dados a partir de um arquivo de backup. Isso substituirá todos os dados existentes.
          </p>
        </div>
        
        <div class="pt-4 border-t border-gray-200 dark:border-gray-700 mt-4">
          <button 
            class="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded"
            onclick={clearAllData}
          >
            Excluir Todos os Dados
          </button>
          <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Exclui permanentemente todos os seus dados (itens salvos, notas, flashcards). Esta ação não pode ser desfeita.
          </p>
        </div>
      </div>
    </Card.Root>
    
    <!-- Sobre -->
    <Card.Root class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
      <Card.Header class="text-xl font-semibold mb-4">
        <Card.Title>Sobre</Card.Title>
        <Card.Description class="text-sm text-gray-600 dark:text-gray-400">
          Informações sobre a extensão e como ela funciona.
        </Card.Description>
      </Card.Header>
      
      <div class="about-info">
        <p class="mb-2">
          <strong>Extensor de Navegador</strong> v1.0.0
        </p>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Uma extensão para salvar páginas, fazer anotações e criar flashcards.
        </p>
        
        <div class="links text-blue-600 dark:text-blue-400 space-y-1 text-sm">
          <p><a href="#" target="_blank" rel="noopener noreferrer">Política de Privacidade</a></p>
          <p><a href="#" target="_blank" rel="noopener noreferrer">Termos de Uso</a></p>
          <p><a href="#" target="_blank" rel="noopener noreferrer">Reportar um Problema</a></p>
        </div>
      </div>
    </Card.Root>

    <!-- Manutenção de Dados -->
    <Card.Root class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm mb-8">
      <Card.Header class="text-xl font-semibold mb-4">
        <Card.Title>Manutenção de Dados</Card.Title>
        <Card.Description class="text-sm text-gray-600 dark:text-gray-400">
          Ferramentas para manutenção e correção de dados
        </Card.Description>
      </Card.Header>
      
      <Card.Content class="space-y-4">
        <div>
          <p class="mb-2 text-sm text-gray-500 dark:text-gray-400">
            Corrija referências entre notas, flashcards e itens salvos.
          </p>
          <button 
            class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onclick={() => fixItemReferences()}
            disabled={fixingReferences || fixingGroupRelations}
          >
            {fixingReferences ? "Corrigindo..." : "Corrigir Referências"}
          </button>
        </div>
        
        <div class="border-t pt-4">
          <p class="mb-2 text-sm text-gray-500 dark:text-gray-400">
            Corrija associações entre grupos e itens salvos.
          </p>
          <button 
            class="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            onclick={() => fixGroupRelations()}
            disabled={fixingReferences || fixingGroupRelations}
          >
            {fixingGroupRelations ? "Corrigindo..." : "Corrigir Relações de Grupos"}
          </button>
        </div>
      </Card.Content>
      
      {#if lastFixResult}
        <div class="mt-4 p-3 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">
          <p><strong>Resultado:</strong> {lastFixResult}</p>
        </div>
      {/if}
    </Card.Root>
  </ScrollArea>
<!-- </div>  -->