<script lang="ts">
  import { flashcards, savedItems, getAllTags } from "../../storage";
  import type { Flashcard } from "../../types";
  import { onMount } from 'svelte';
  
  let front = $state("");
  let back = $state("");
  let tagInput = $state("");
  let selectedTags = $state<string[]>([]);
  let suggestedTags = $state<string[]>([]);
  let allAvailableTags = $state<string[]>([]);
  let showTagSuggestions = $state(false);
  let currentUrl = $state("");
  let pageTitle = $state("");
  
  onMount(() => {
    // Obter URL e título atual
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs && tabs[0]) {
        currentUrl = tabs[0].url || "";
        pageTitle = tabs[0].title || "";
      }
    });
    
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
  
  function saveFlashcard() {
    // Validação básica
    if (!front.trim() || !back.trim()) {
      alert("Frente e verso do flashcard não podem estar vazios.");
      return;
    }
    
    // Criar novo flashcard
    const flashcardId = crypto.randomUUID();
    const now = Date.now();
    
    // Verificar se já existe um item salvo para a URL atual
    savedItems.update(items => {
      let currentItem = items.find(item => item.url === currentUrl);
      
      // Se não existir um item para esta URL, criar um novo
      if (!currentItem) {
        const newItemId = crypto.randomUUID();
        currentItem = {
          id: newItemId,
          url: currentUrl,
          title: pageTitle,
          dateAdded: now,
          comments: "",
          tags: [],
          groupIds: [],
          readLater: false,
          noteIds: [],
          flashcardIds: [flashcardId]
        };
        
        // Adicionar o novo item
        return [...items, currentItem];
      } else {
        // Atualizar o item existente com o novo flashcardId
        return items.map(item => {
          if (item.id === currentItem?.id) {
            return { 
              ...item, 
              flashcardIds: [...(item.flashcardIds || []), flashcardId] 
            };
          }
          return item;
        });
      }
    });
    
    // Criar e adicionar o flashcard
    const newFlashcard: Flashcard = {
      id: flashcardId,
      itemId: "", // Será preenchido após encontrar/criar o item
      front,
      back,
      dateCreated: now,
      lastModified: now,
      reviewCount: 0,
      easeFactor: 2.5, // Padrão inicial para algoritmo SM-2
      tags: selectedTags
    };
    
    // Atualizar o itemId do flashcard com base no item salvo
    const unsubscribe = savedItems.subscribe(items => {
      const relatedItem = items.find(item => item.url === currentUrl);
      if (relatedItem) {
        newFlashcard.itemId = relatedItem.id;
      }
      
      // Adicionar o flashcard à store
      flashcards.update(existingFlashcards => [...existingFlashcards, newFlashcard]);
      
      // Usar setTimeout para garantir que o callback complete antes de chamar unsubscribe
      setTimeout(() => {
        unsubscribe();
      }, 0);
    });
    
    // Limpar o formulário
    front = "";
    back = "";
    selectedTags = [];
    tagInput = "";
    
    // Feedback visual
    alert("Flashcard adicionado com sucesso!");
  }
</script>

<div class="flashcard-creator p-2">
  <div class="form-group mb-4">
    <label class="block text-sm font-medium mb-1 text-white">Frente (pergunta ou conceito)</label>
    <textarea 
      bind:value={front} 
      rows="2"
      placeholder="Escreva a pergunta ou conceito aqui..."
      class="w-full p-2 rounded border border-gray-500 dark:border-gray-600 bg-gray-800 text-white"
    ></textarea>
  </div>
  
  <div class="form-group mb-4">
    <label class="block text-sm font-medium mb-1 text-white">Verso (resposta ou explicação)</label>
    <textarea 
      bind:value={back} 
      rows="3"
      placeholder="Escreva a resposta ou explicação aqui..."
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
  
  <div class="actions">
    <button 
      class="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
      onclick={saveFlashcard}
      disabled={!front.trim() || !back.trim()}
    >
      Salvar Flashcard
    </button>
  </div>
</div> 