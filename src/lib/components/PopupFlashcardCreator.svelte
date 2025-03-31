<script lang="ts">
  import { flashcards, savedItems } from "../../storage";
  import type { Flashcard } from "../../types";
  import { onMount } from 'svelte';
  
  let front = $state("");
  let back = $state("");
  let tags = $state("");
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
  });
  
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
      tags: tags.split(',').map(tag => tag.trim()).filter(Boolean)
    };
    
    // Atualizar o itemId do flashcard com base no item salvo
    const unsubscribe = savedItems.subscribe(items => {
      const relatedItem = items.find(item => item.url === currentUrl);
      if (relatedItem) {
        newFlashcard.itemId = relatedItem.id;
      }
      
      // Adicionar o flashcard à store
      flashcards.update(existingFlashcards => [...existingFlashcards, newFlashcard]);
    });
    unsubscribe();
    
    // Limpar o formulário
    front = "";
    back = "";
    tags = "";
    
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
    <label class="block text-sm font-medium mb-1 text-white">Tags (separadas por vírgula)</label>
    <input 
      type="text" 
      bind:value={tags} 
      placeholder="Ex: importante, revisar, matemática"
      class="w-full p-2 rounded border border-gray-500 dark:border-gray-600 bg-gray-800 text-white"
    />
  </div>
  
  <div class="actions">
    <button 
      class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
      onclick={saveFlashcard}
      disabled={!front.trim() || !back.trim()}
    >
      Salvar Flashcard
    </button>
  </div>
</div> 