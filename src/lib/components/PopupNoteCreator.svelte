<script lang="ts">
  import { notes, savedItems, getAllTags } from "../../storage";
  import type { Note, SavedItem } from "../../types";
  import { onMount } from 'svelte';
  import { toast } from "svelte-sonner";
  
  let content = $state("");
  let tagInput = $state("");
  let selectedTags = $state<string[]>([]);
  let suggestedTags = $state<string[]>([]);
  let allAvailableTags = $state<string[]>([]);
  let showTagSuggestions = $state(false);
  let color = $state("#2563eb");
  let currentUrl = $state("");
  let pageTitle = $state("");
  
  const colorOptions = [
    { value: "#2563eb", label: "Azul" },
    { value: "#16a34a", label: "Verde" },
    { value: "#ea580c", label: "Laranja" },
    { value: "#dc2626", label: "Vermelho" },
    { value: "#7c3aed", label: "Roxo" },
    { value: "#f9fafb", label: "Branco" },
    { value: "#374151", label: "Cinza Escuro" }
  ];
  
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
  
  function saveNote() {
    // Validação básica
    if (!content.trim()) {
      toast.error("Erro ao salvar nota", {
        description: "O conteúdo da nota não pode estar vazio.",
        duration: 3000,
      });
      return;
    }
    
    // Criar nova nota
    const noteId = crypto.randomUUID();
    const now = Date.now();
    
    // Variável para armazenar o ID do item
    let itemId: string;

    // Verificar se já existe um item salvo para a URL atual
    let items = $savedItems;
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
        noteIds: [noteId],
        flashcardIds: []
      };
      
      // Salvar o itemId para uso posterior
      itemId = newItemId;
      
      // Adicionar o novo item à store
      savedItems.update(items => [...items, currentItem as SavedItem]);
    } else {
      // Atualizar o item existente com o novo noteId
      itemId = currentItem.id;
      
      // Atualizar o item existente
      savedItems.update(items => 
        items.map(item => {
          if (item.id === currentItem?.id) {
            return { 
              ...item,
              noteIds: [...(item.noteIds || []), noteId]
            };
          }
          return item;
        })
      );
    }

    // Criar e adicionar a nota com o itemId correto
    const newNote: Note = {
      id: noteId,
      itemId: itemId, // Usar o itemId definido acima
      content,
      dateCreated: now,
      lastModified: now,
      color,
      tags: selectedTags
    };
    
    // Adicionar a nota à store
    notes.update(existingNotes => [...existingNotes, newNote]);

    // Limpar o formulário
    content = "";
    selectedTags = [];
    tagInput = "";
    color = "#2563eb";

    // Feedback visual com toast
    toast.success("Nota criada com sucesso!", {
      description: currentItem ? `Nota adicionada a "${currentItem.title}"` : "Nota independente criada",
      duration: 3000,
    });
  }
</script>

<div class="note-creator p-2">
  <div class="form-group mb-4">
    <label class="block text-sm font-medium mb-1 text-white">Conteúdo</label>
    <textarea 
      bind:value={content} 
      rows="4"
      placeholder="Escreva sua nota aqui..."
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
    <label class="block text-sm font-medium mb-1 text-white">Cor</label>
    <div class="color-picker flex space-x-2">
      {#each colorOptions as option}
        <button 
          class="w-6 h-6 rounded-full border-2 {color === option.value ? 'border-white' : 'border-transparent'}"
          style="background-color: {option.value};"
          onclick={() => color = option.value}
          aria-label="Selecionar cor {option.label}"
        ></button>
      {/each}
    </div>
  </div>
  
  <div class="actions">
    <button 
      class="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
      onclick={(event) => {
        event.preventDefault();
        saveNote();
      }}
      disabled={!content.trim()}
    >
      Salvar Nota
    </button>
  </div>
</div> 