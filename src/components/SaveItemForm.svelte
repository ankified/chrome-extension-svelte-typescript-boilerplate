<script lang="ts">
  import { savedItems, groups, getAllTags } from "../storage";
  import type { SavedItem, Group } from "../types";
  import QuickNoteInput from "../lib/components/QuickNoteInput.svelte";
  import FlashcardInput from "../lib/components/FlashcardInput.svelte";
  import PagePreviewCard from "../lib/components/PagePreviewCard.svelte";
  import * as Popover from "../lib/components/ui/popover/index.js";
  import * as ToggleGroup from "../lib/components/ui/toggle-group/index.js";
  import * as DropdownMenu from "../lib/components/ui/dropdown-menu/index.js";
  import { buttonVariants } from "../lib/components/ui/button/index.js";
  
  // Props do componente
  let { initialUrl = "", initialTitle = "" } = $props<{ initialUrl?: string, initialTitle?: string }>();
  
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
  let saveMode = $state("favorite"); // 'favorite' ou 'read_later'
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
      allAvailableTags = await getAllTags();
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
      tags: selectedTags,
      groupIds: selectedGroups,
      readLater: saveMode === "read_later",
      scheduledDate: saveMode === "read_later" && scheduledDate ? new Date(scheduledDate).getTime() : undefined,
      noteIds: [],
      flashcardIds: []
    };
    
    // Adicionar o item à lista de itens salvos
    savedItems.update(items => [...items, newItem]);
    
    // Atualizar grupos selecionados para incluir o novo item
    if (selectedGroups.length > 0) {
      groups.update(existingGroups => {
        return existingGroups.map(group => {
          if (selectedGroups.includes(group.id)) {
            return {
              ...group,
              itemIds: [...(group.itemIds || []), newItem.id]
            };
          }
          return group;
        });
      });
    }
    
    // Atualizar UI
    itemSaved = true;
    savedItem = newItem;
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
  {#if !itemSaved}
    <div class="view-toggle flex justify-between items-center mb-4">
      <ToggleGroup.Root type="single" value={saveMode} onValueChange={(value: string | null) => value && (saveMode = value)} class="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
        <ToggleGroup.Item value="favorite" class="px-3 py-1.5 text-sm transition-colors data-[state=on]:bg-blue-600 data-[state=on]:text-white data-[state=off]:bg-transparent data-[state=off]:text-gray-700 data-[state=off]:dark:text-gray-300 data-[state=off]:hover:bg-gray-100 data-[state=off]:dark:hover:bg-gray-800">
          <div class="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
            </svg>
            Favorito
          </div>
        </ToggleGroup.Item>
        <ToggleGroup.Item value="read_later" class="px-3 py-1.5 text-sm transition-colors data-[state=on]:bg-blue-600 data-[state=on]:text-white data-[state=off]:bg-transparent data-[state=off]:text-gray-700 data-[state=off]:dark:text-gray-300 data-[state=off]:hover:bg-gray-100 data-[state=off]:dark:hover:bg-gray-800">
          <div class="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" />
            </svg>
            Ler Depois
          </div>
        </ToggleGroup.Item>
      </ToggleGroup.Root>
      
      <button 
        class="text-sm rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 transition-colors hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center px-3 py-1.5"
        onclick={() => chrome.runtime.openOptionsPage()}
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
        </svg>
        Gerenciar
      </button>
    </div>
    
    <!-- Substituímos os campos de entrada por um card de preview -->
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
      <label class="block text-sm font-medium mb-1 text-white">Comentários</label>
      <textarea 
        bind:value={comments} 
        rows="3"
        class="w-full p-2 rounded border border-gray-500 dark:border-gray-600 bg-gray-800 text-white"
      ></textarea>
    </div>
    
    <div class="form-group mb-4">
      <label class="block text-sm font-medium mb-1 text-white">Tags</label>
      <div class="tag-input-container relative">
        <div class="flex flex-wrap gap-1 mb-2">
          {#each selectedTags as tag}
            <div class="tag flex items-center bg-blue-600/20 text-blue-400 text-xs rounded-full px-2 py-1">
              <span>{tag}</span>
              <button
                type="button"
                class="ml-1 text-blue-400 hover:text-blue-300"
                onclick={() => removeTag(tag)}
              >
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
          {/each}
        </div>
        
        <div class="input-with-button flex">
      <input 
        type="text" 
            bind:value={tagInput} 
            placeholder="Digite uma tag e pressione Enter"
            class="flex-grow p-2 rounded-l border border-gray-500 dark:border-gray-600 bg-gray-800 text-white"
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
          <div class="suggestions absolute z-10 mt-1 w-full bg-gray-800 border border-gray-700 rounded-md shadow-lg max-h-40 overflow-y-auto">
            {#each suggestedTags as tag}
              <button 
                type="button"
                class="block w-full text-left px-3 py-2 hover:bg-gray-700 text-white"
                onclick={() => addSuggestedTag(tag)}
              >
                {tag}
              </button>
            {/each}
          </div>
        {/if}
      </div>
    </div>
    
    <div class="form-group mb-4">
      <label class="block text-sm font-medium mb-1 text-white">Grupos</label>
      
      <div class="flex flex-col relative">
        <div class="flex mb-2">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger class={buttonVariants({ variant: "outline", class: "flex-grow rounded-l bg-gray-700 hover:bg-gray-600 text-white border-gray-600 justify-between" })}>
            <span>{selectedGroups.length === 0 ? "Selecionar grupos" : `${selectedGroups.length} grupo(s) selecionado(s)`}</span>
            <svg class="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
            </svg>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content class="w-56 bg-gray-800 border border-gray-700 text-white">
              <DropdownMenu.Group>
                <DropdownMenu.GroupHeading class="text-gray-400 text-xs pl-2">Grupos Disponíveis</DropdownMenu.GroupHeading>
                <DropdownMenu.Separator class="bg-gray-700" />
                {#if availableGroups.length === 0}
                  <div class="text-sm text-gray-400 italic p-3">Nenhum grupo disponível.</div>
                {:else}
                  {#each availableGroups as group}
                    <DropdownMenu.CheckboxItem 
                      checked={selectedGroups.includes(group.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          selectedGroups = [...selectedGroups, group.id];
                        } else {
                          selectedGroups = selectedGroups.filter(id => id !== group.id);
                        }
                      }}
                      class="flex items-center"
                    >
                      <span class="w-3 h-3 rounded-full mr-2" style="background-color: {group.color || '#3b82f6'};"></span>
                      {group.name}
                    </DropdownMenu.CheckboxItem>
                  {/each}
                {/if}
              </DropdownMenu.Group>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
          
          <Popover.Root>
            <Popover.Trigger class="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-r text-sm border-l border-blue-700 flex items-center">
              <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
              </svg>
              Novo Grupo
            </Popover.Trigger>
            <Popover.Content class="w-72 bg-gray-800 border border-gray-700 text-white rounded-md p-4 shadow-md">
              <div class="mb-3">
                <label class="block text-xs font-medium mb-1 text-gray-300">Nome do Grupo</label>
                <input 
                  type="text" 
                  class="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                  placeholder="Digite o nome do grupo"
                  bind:value={newGroupName}
                />
              </div>
              
              <div class="mb-3">
                <label class="block text-xs font-medium mb-1 text-gray-300">Cor do Grupo</label>
                <div class="flex flex-wrap gap-2">
                  {#each groupColors as clr}
                    <button
                      type="button"
                      class="w-6 h-6 rounded-full border {newGroupColor === clr ? 'border-white' : 'border-transparent'}"
                      style="background-color: {clr};"
                      onclick={() => newGroupColor = clr}
                    ></button>
                  {/each}
                </div>
              </div>
              
              <div class="flex justify-end">
                <Popover.Close class="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded-md text-sm mr-2">
                  Cancelar
                </Popover.Close>
                <button
                  type="button"
                  class="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm"
                  disabled={!newGroupName.trim()}
                  onclick={createGroup}
                >
                  Criar Grupo
                </button>
              </div>
            </Popover.Content>
          </Popover.Root>
        </div>
      </div>
      
      {#if selectedGroups.length > 0}
        <div class="selected-groups mt-2 flex flex-wrap gap-1">
          {#each selectedGroups as groupId}
            {#each availableGroups.filter(g => g.id === groupId) as group}
              <div class="group-tag flex items-center bg-gray-700 text-white text-xs rounded-full px-2 py-1">
                <span class="w-2 h-2 rounded-full mr-1" style="background-color: {group.color};"></span>
                <span>{group.name}</span>
                <button
                  type="button"
                  class="ml-1 text-gray-400 hover:text-white"
                  onclick={() => selectedGroups = selectedGroups.filter(id => id !== group.id)}
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
    </div>
    
    {#if saveMode === 'read_later'}
      <div class="form-group mb-4">
        <label class="block text-sm font-medium mb-1 text-white">Quando ler?</label>
        <input 
          type="datetime-local" 
          bind:value={scheduledDate}
          class="w-full p-2 rounded border border-gray-500 dark:border-gray-600 bg-gray-800 text-white"
        />
      </div>
    {/if}
    
    <div class="actions mb-4 flex gap-2">
      <button 
        class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
        onclick={handleSave}
      >
        Salvar
      </button>
    </div>
  {:else}
    {#if itemSaved && savedItem}
      <div class="saved-success mb-4">
        <div class="bg-green-100 dark:bg-green-900 p-4 rounded mb-4">
          <h3 class="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">
            Página salva com sucesso!
          </h3>
          <p class="text-green-700 dark:text-green-300">
            "{savedItem.title}" foi adicionada aos seus favoritos.
          </p>
        </div>
        
        <div class="additional-actions flex gap-4 mb-4">
          <button 
            class="flex items-center px-3 py-2 bg-gray-200 dark:bg-gray-700 rounded"
            onclick={toggleNoteInput}
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd" />
            </svg>
            {showNoteInput ? 'Cancelar Nota' : 'Adicionar Nota'}
          </button>
          
          <button 
            class="flex items-center px-3 py-2 bg-gray-200 dark:bg-gray-700 rounded"
            onclick={toggleFlashcardInput}
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z" />
            </svg>
            {showFlashcardInput ? 'Cancelar Flashcard' : 'Adicionar Flashcard'}
          </button>
        </div>
        
        {#if showNoteInput && savedItem}
          <div class="note-input-container border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
            <QuickNoteInput item={savedItem} />
          </div>
        {/if}
        
        {#if showFlashcardInput && savedItem}
          <div class="flashcard-input-container border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
            <FlashcardInput item={savedItem} />
          </div>
        {/if}
        
        <div class="mt-4">
          <button 
            class="px-4 py-2 bg-blue-600 text-white rounded"
            onclick={resetForm}
          >
            Salvar outra página
          </button>
        </div>
      </div>
    {/if}
  {/if}
</div> 