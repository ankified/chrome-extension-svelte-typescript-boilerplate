<script lang="ts">
  import { savedItems, groups, getAllTags, itemLinksUtils } from "../storage";
  import type { SavedItem, Group, VisitItem, VisitTransition } from "../types";
  import QuickNoteInput from "../lib/components/QuickNoteInput.svelte";
  import FlashcardInput from "../lib/components/FlashcardInput.svelte";
  import PagePreviewCard from "../lib/components/PagePreviewCard.svelte";
  import * as Popover from "../lib/components/ui/popover/index.js";
  import * as ToggleGroup from "../lib/components/ui/toggle-group/index.js";
  import * as DropdownMenu from "../lib/components/ui/dropdown-menu/index.js";
  import * as Tooltip from "../lib/components/ui/tooltip/index.js";
  import { buttonVariants } from "../lib/components/ui/button/index.js";
  import { toast } from "svelte-sonner";
  
  // Props do componente
  let { 
    initialUrl = "", 
    initialTitle = "",
    saveMode // Recebendo o saveMode como prop
  } = $props<{ 
    initialUrl?: string, 
    initialTitle?: string,
    saveMode: string
  }>();
  
  // Obter URL e título da página atual
  let currentUrl = $state(initialUrl);
  let currentTitle = $state(initialTitle);
  let comments = $state("");
  let tagInput = $state("");
  let selectedTags = $state<string[]>([]);
  let suggestedTags = $state<string[]>([]);
  let allAvailableTags = $state<string[]>([]);
  let showTagSuggestions = $state(false);
  let selectedGroups = $state<string[]>([]);
  let newGroupName = $state("");
  let newGroupColor = $state("#3b82f6");
  let showNewGroupInput = $state(false);
  let showGroupsDropdown = $state(false);
  let scheduledDate = $state<string | null>(null);
  
  // Controle da UI
  let showNoteInput = $state(false);
  let showFlashcardInput = $state(false);
  let itemSaved = $state(false);
  let savedItem = $state<SavedItem | null>(null);
  
  // Carregar grupos disponíveis
  let availableGroups = $derived($groups || []);
  
  // Atualizar valores quando os props mudarem
  $effect(() => {
    if (initialUrl) currentUrl = initialUrl;
    if (initialTitle) currentTitle = initialTitle;
  });
  
  // Obter informações da página atual quando o componente é montado
  $effect.root(() => {
    if (!currentUrl || !currentTitle) {
      if (typeof chrome !== 'undefined' && chrome.tabs) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs && tabs[0]) {
            if (!currentUrl) currentUrl = tabs[0].url || "";
            if (!currentTitle) currentTitle = tabs[0].title || "";
          } else {
            console.error("Não foi possível obter a aba atual");
          }
        });
      } else {
        console.error("API chrome.tabs não disponível");
      }
    }
    
    // Carregar todas as tags disponíveis
    loadAllTags();
  });
  
  // Carregar todas as tags disponíveis
  async function loadAllTags() {
    try {
      // Buscar os itens salvos primeiro
      const currentItems = await new Promise<SavedItem[]>((resolve) => {
          const unsubscribe = savedItems.subscribe(items => {
              // Usar setTimeout para garantir que a store foi atualizada antes de resolver
              setTimeout(() => {
                  unsubscribe();
                  resolve(items);
              }, 0);
          });
      });
      // Agora chamar getAllTags com os itens
      const tags = getAllTags(currentItems); 
      // Garantir que todas as tags são strings válidas
      allAvailableTags = tags.filter(tag => typeof tag === 'string');
    } catch (error) {
      console.error("Erro ao carregar tags:", error);
    }
  }
  
  // Função para filtrar sugestões de tags baseado no input
  $effect(() => {
    if (tagInput.trim() === "") {
      suggestedTags = [];
      showTagSuggestions = false;
      return;
    }
    
    const input = tagInput.trim().toLowerCase();
    const filteredTags = allAvailableTags
      .filter(tag => tag.toLowerCase().includes(input) && !selectedTags.includes(tag))
      .slice(0, 5); // Limitar a 5 sugestões
      
    suggestedTags = filteredTags;
    showTagSuggestions = filteredTags.length > 0;
  });
  
  // Adicionar uma tag
  function addTag() {
    if (tagInput.trim() === "") return;
    
    const newTag = tagInput.trim();
    if (!selectedTags.includes(newTag)) {
      selectedTags = [...selectedTags, newTag];
    }
    tagInput = "";
    showTagSuggestions = false;
  }
  
  // Adicionar uma tag sugerida
  function addSuggestedTag(tag: string) {
    if (typeof tag !== 'string') {
      console.error("Tag não é uma string:", tag);
      return;
    }
    
    if (!selectedTags.includes(tag)) {
      selectedTags = [...selectedTags, tag];
    }
    tagInput = "";
    showTagSuggestions = false;
  }
  
  // Remover uma tag
  function removeTag(tagToRemove: string) {
    selectedTags = selectedTags.filter(tag => tag !== tagToRemove);
  }
  
  // Toggle uma tag existente
  function toggleExistingTag(tag: string) {
    if (typeof tag !== 'string') {
      console.error("Tag não é uma string:", tag);
      return;
    }
    
    if (selectedTags.includes(tag)) {
      selectedTags = selectedTags.filter(t => t !== tag);
    } else {
      selectedTags = [...selectedTags, tag];
    }
  }
  
  // Converter array de tags para string separada por vírgulas
  function getTagsAsString(): string {
    return selectedTags.join(", ");
  }
  
  // Cores pré-definidas para os grupos
  const groupColors = [
    "#3b82f6", // azul
    "#ef4444", // vermelho
    "#10b981", // verde
    "#f59e0b", // amarelo
    "#8b5cf6", // roxo
    "#ec4899", // rosa
    "#6366f1", // indigo
    "#14b8a6", // teal
  ];
  
  function createGroup() {
    if (!newGroupName.trim()) return;
    
    const newGroup: Group = {
      id: crypto.randomUUID(),
      name: newGroupName.trim(),
      color: newGroupColor,
      itemIds: [] // Adicionado para corrigir o erro do tipo Group
    };
    
    groups.update(allGroups => [...allGroups, newGroup]);
    
    // Adicionar o novo grupo aos selecionados
    selectedGroups = [...selectedGroups, newGroup.id];
    
    // Resetar o formulário de novo grupo
    newGroupName = "";
    showNewGroupInput = false;
  }
  
  function handleSave() {
    const newItem: SavedItem = {
      id: crypto.randomUUID(),
      url: currentUrl,
      title: currentTitle,
      dateAdded: Date.now(),
      comments,
      tags: selectedTags.filter(tag => typeof tag === 'string'), // Garantir que todas as tags são strings
      groupIds: [...selectedGroups],
      readLater: saveMode === "read_later",
      scheduledDates: saveMode === "read_later" && scheduledDate ? [new Date(scheduledDate).getTime()] : [], // Inicializa como array
      noteIds: [],
      flashcardIds: [],
      // Removido campo visitHistory
    };
    
    // Código original de salvamento (sem a função completeSaving e a chamada a getVisits)
    console.log(`[SaveItemForm] Salvando item com ${selectedGroups.length} grupos:`, selectedGroups);
    console.log(`[SaveItemForm] Detalhes do item a ser salvo:`, newItem);

    chrome.storage.local.get(['savedItems'], (result) => {
        const existingItems: SavedItem[] = result.savedItems || [];
        const isDuplicate = existingItems.some((item: SavedItem) => item.url === newItem.url);

        if (isDuplicate) {
            console.log(`[SaveItemForm] Item já existe com esta URL: ${newItem.url}`);
            toast.error("Item já existe", {
                description: "Um item com esta URL já existe nos seus favoritos.",
                duration: 3000,
            });
            return;
        }

        const updatedItems = [...existingItems, newItem];
        console.log(`[SaveItemForm] Salvando no storage local. Total: ${updatedItems.length}`);

        chrome.storage.local.set({ savedItems: updatedItems }, () => {
            const setError = chrome.runtime.lastError;
            if (setError) {
                console.error("[SaveItemForm] Erro ao salvar savedItems:", setError);
                toast.error("Erro ao salvar item", { description: setError.message });
                return;
            }

            savedItems.set(updatedItems);

            if (newItem.groupIds && newItem.groupIds.length > 0) {
                console.log("[SaveItemForm] Atualizando grupos com o novo item");
                chrome.storage.local.get(['groups'], (groupsResult) => {
                    const existingGroups: Group[] = groupsResult.groups || [];
                    const updatedGroups = existingGroups.map((group: Group) => {
                        if (newItem.groupIds.includes(group.id)) {
                            const currentItemIds = Array.isArray(group.itemIds) ? [...group.itemIds] : [];
                            return { ...group, itemIds: [...currentItemIds, newItem.id] };
                        }
                        return group;
                    });

                    chrome.storage.local.set({ groups: updatedGroups }, () => {
                        const groupSetError = chrome.runtime.lastError;
                        if (groupSetError) {
                            console.error("[SaveItemForm] Erro ao salvar grupos atualizados:", groupSetError);
                            toast.error("Erro ao atualizar grupos", { description: groupSetError.message });
                            // Continua mesmo com erro nos grupos?
                        } else {
                            groups.set(updatedGroups);
                        }
                        // Exibir toast de sucesso APÓS tentar atualizar grupos
                        toast.success(`"${newItem.title}" foi salvo com sucesso!`, {
                            description: newItem.readLater ? "Adicionado à lista de leitura." : "Adicionado aos favoritos.",
                            duration: 3000,
                        });
                        // Recarregar e resetar
                        setTimeout(() => { loadAllTags(); resetForm(); }, 500);
                    });
                });
            } else {
                // Se não houver grupos, exibir toast imediatamente após salvar item
                toast.success(`"${newItem.title}" foi salvo com sucesso!`, {
                    description: newItem.readLater ? "Adicionado à lista de leitura." : "Adicionado aos favoritos.",
                    duration: 3000,
                });
                // Recarregar e resetar
                setTimeout(() => { loadAllTags(); resetForm(); }, 500);
            }
        });
    });
  }
  
  function toggleNoteInput() {
    showNoteInput = !showNoteInput;
    if (showNoteInput) {
      showFlashcardInput = false;
    }
  }
  
  function toggleFlashcardInput() {
    showFlashcardInput = !showFlashcardInput;
    if (showFlashcardInput) {
      showNoteInput = false;
    }
  }
  
  function resetForm() {
    itemSaved = false;
    savedItem = null;
    comments = "";
    tagInput = "";
    selectedTags = [];
    selectedGroups = [];
    saveMode = "favorite";
    scheduledDate = null;
    showNoteInput = false;
    showFlashcardInput = false;
  }
  
  // Função para atualizar o título quando o usuário editar através do PagePreviewCard
  function handleTitleChange(newTitle: string) {
    currentTitle = newTitle;
  }
</script>

<div class="save-item-form box-border">
    <div class="mb-5">
      <PagePreviewCard 
        url={currentUrl} 
        title={currentTitle} 
        editable={true}
        showFavicon={true}
        on:titleChange={(e) => handleTitleChange(e.detail)}
      />
    </div>
    
    <div class="form-group mb-4">
      <textarea 
        bind:value={comments} 
        rows="3"
      placeholder="Adicione um comentário..."
        class="w-full p-2 rounded border border-gray-500 dark:border-gray-600 bg-gray-800 text-white"
      ></textarea>
    </div>
    
  <!-- Tags selecionadas -->
  {#if selectedTags.length > 0}
    <div class="flex flex-wrap gap-1 mb-4">
          {#each selectedTags as tag}
            {#if typeof tag === 'string'}
            <div class="tag flex items-center bg-blue-600/20 text-blue-400 text-xs rounded-full px-2 py-1">
              <span>{tag}</span>
              <button
                type="button"
                class="ml-1 text-blue-400 hover:text-blue-300"
                onclick={() => removeTag(tag)}
                aria-label="Remover tag {tag}"
              >
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            {/if}
          {/each}
        </div>
  {/if}
  
  <!-- Grupos selecionados -->
  {#if selectedGroups.length > 0}
    <div class="mb-4 flex flex-wrap gap-1">
      {#each selectedGroups as groupId}
        {#each availableGroups.filter(g => g.id === groupId) as group}
          <div class="group-tag flex items-center bg-gray-700 text-white text-xs rounded-full px-2 py-1">
            <span class="w-2 h-2 rounded-full mr-1" style="background-color: {group.color};"></span>
            <span>{group.name}</span>
            <button
              type="button"
              class="ml-1 text-gray-400 hover:text-white"
              onclick={() => selectedGroups = selectedGroups.filter(id => id !== group.id)}
              aria-label="Remover do grupo {group.name}"
            >
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        {/each}
      {/each}
    </div>
  {/if}
  
  <!-- Barra de botões inferior -->
  <div class="border-t border-gray-700 pt-3 mt-auto">
    <div class="flex justify-between items-center">
      <!-- Botões de funcionalidade: Tag, Grupo, Data -->
      <div class="flex space-x-2">
        <!-- Botão de Tag -->
        <div class="relative">
          <Popover.Root>
            <Popover.Trigger class="p-2 rounded-md hover:bg-gray-700 relative" title="Adicionar Tags">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-300" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
              </svg>
              {#if selectedTags.length > 0}
                <span class="absolute -top-2 -right-2 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {selectedTags.length}
                </span>
              {/if}
            </Popover.Trigger>
            <Popover.Content class="w-72 bg-gray-800 border border-gray-700 text-white rounded-md p-4 shadow-md">
              <div class="mb-3">
                <label for="tag-input" class="block text-xs font-medium mb-1 text-gray-300">Adicionar Tag</label>
        <div class="input-with-button flex">
      <input 
        type="text" 
            bind:value={tagInput} 
            placeholder="Digite uma tag e pressione Enter"
            id="tag-input"
                    class="flex-grow p-2 rounded-l border border-gray-600 bg-gray-700 text-white"
            onkeydown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
          />
          <button 
            type="button"
            class="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-r"
            onclick={addTag}
          >
            Adicionar
          </button>
        </div>
        
        {#if showTagSuggestions}
                  <div class="suggestions mt-1 bg-gray-700 border border-gray-600 rounded-md shadow-lg max-h-32 overflow-y-auto">
            {#each suggestedTags as tag}
              <button 
                type="button"
                        class="block w-full text-left px-3 py-2 hover:bg-gray-600 text-white"
                onclick={() => addSuggestedTag(tag)}
              >
                {tag}
              </button>
            {/each}
          </div>
        {/if}
      </div>
              
              <div class="border-t border-gray-700 pt-3">
                <div class="block text-xs font-medium mb-2 text-gray-300">Tags Existentes</div>
                <div class="max-h-40 overflow-y-auto">
                  {#if allAvailableTags.length === 0}
                    <div class="text-sm text-gray-400 italic p-2">Nenhuma tag disponível.</div>
                  {:else}
                    <div class="flex flex-wrap gap-1 p-1">
                      {#each allAvailableTags as tag}
                        {#if typeof tag === 'string'}
                          <button 
                            type="button" 
                            class="tag text-xs px-2 py-1 rounded-full flex items-center gap-1 {selectedTags.includes(tag) ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}"
                            onclick={() => toggleExistingTag(tag)}
                          >
                            {#if selectedTags.includes(tag)}
                              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                              </svg>
                            {/if}
                            <span>{tag}</span>
                          </button>
                        {/if}
                      {/each}
                    </div>
                  {/if}
                </div>
              </div>
            </Popover.Content>
          </Popover.Root>
    </div>
    
        <!-- Botão de Grupo -->
        <div class="relative">
          <Popover.Root>
            <Popover.Trigger class="p-2 rounded-md hover:bg-gray-700 relative" title="Gerenciar Grupos">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-300" viewBox="0 0 20 20" fill="currentColor">
                <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
            </svg>
              {#if selectedGroups.length > 0}
                <span class="absolute -top-2 -right-2 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {selectedGroups.length}
                </span>
              {/if}
            </Popover.Trigger>
            <Popover.Content class="w-72 bg-gray-800 border border-gray-700 text-white rounded-md p-4 shadow-md">
              <div class="mb-3">
                <div class="block text-xs font-medium mb-1 text-gray-300">Selecionar Grupos</div>
                <div class="max-h-32 overflow-y-auto mb-2 border border-gray-700 rounded-md">
                {#if availableGroups.length === 0}
                  <div class="text-sm text-gray-400 italic p-3">Nenhum grupo disponível.</div>
                {:else}
                  {#each availableGroups as group}
                      <label class="flex items-center px-3 py-2 hover:bg-gray-700 border-b border-gray-700 last:border-b-0">
                        <input 
                          type="checkbox" 
                      checked={selectedGroups.includes(group.id)}
                          class="mr-2"
                          onchange={(e) => {
                            const target = e.target as HTMLInputElement;
                            if (target.checked) {
                          selectedGroups = [...selectedGroups, group.id];
                        } else {
                          selectedGroups = selectedGroups.filter(id => id !== group.id);
                        }
                      }}
                        />
                      <span class="w-3 h-3 rounded-full mr-2" style="background-color: {group.color || '#3b82f6'};"></span>
                        <span class="text-sm">{group.name}</span>
                      </label>
                  {/each}
                {/if}
                </div>
                
                <div class="border-t border-gray-700 pt-3 mt-2">
                  <div class="block text-xs font-medium mb-1 text-gray-300">Criar Novo Grupo</div>
                <input 
                  type="text" 
                    class="w-full p-2 mb-2 bg-gray-700 border border-gray-600 rounded text-white"
                    placeholder="Nome do grupo"
                  bind:value={newGroupName}
                />
                  <div class="flex flex-wrap gap-2 mb-2">
                  {#each groupColors as clr}
                    <button
                      type="button"
                      class="w-6 h-6 rounded-full border {newGroupColor === clr ? 'border-white' : 'border-transparent'}"
                      style="background-color: {clr};"
                      onclick={() => newGroupColor = clr}
                      aria-label="Selecionar cor {clr}"
                    ></button>
                  {/each}
                </div>
                <button
                  type="button"
                    class="w-full px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm"
                  disabled={!newGroupName.trim()}
                  onclick={createGroup}
                >
                  Criar Grupo
                </button>
                </div>
              </div>
            </Popover.Content>
          </Popover.Root>
      </div>
      
        <!-- Botão de Data (apenas se ler depois estiver ativo) -->
        {#if saveMode === "read_later"}
          <div class="relative">
            <Popover.Root>
              <Popover.Trigger class="p-2 rounded-md hover:bg-gray-700" title="Definir Data">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-300" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd" />
                  </svg>
              </Popover.Trigger>
              <Popover.Content class="w-72 bg-gray-800 border border-gray-700 text-white rounded-md p-4 shadow-md">
                <div class="mb-3">
                  <label for="schedule-date-input" class="block text-xs font-medium mb-1 text-gray-300">Quando ler?</label>
        <input 
          type="datetime-local" 
          bind:value={scheduledDate}
          id="schedule-date-input"
                    class="w-full p-2 rounded border border-gray-600 bg-gray-700 text-white"
        />
      </div>
              </Popover.Content>
            </Popover.Root>
          </div>
        {/if}
      </div>
        
      <!-- Espaço vazio onde antes estava o Toggle Favorito/Ler Depois -->
    </div>
          </div>
        
        <div class="mt-4">
          <button 
      class="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
      onclick={(event) => {
        event.preventDefault();
        handleSave();
      }}
    >
      Salvar
          </button>
        </div>
</div> 