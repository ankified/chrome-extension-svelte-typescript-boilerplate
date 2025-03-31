<script lang="ts">
  import { notes, savedItems } from "../../storage";
  import type { Note, SavedItem } from "../../types";
  import { onMount } from 'svelte';
  
  let content = $state("");
  let tags = $state("");
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
        console.log("PopupNoteCreator - URL atual:", currentUrl);
      }
    });
  });
  
  function saveNote() {
    // Validação básica
    if (!content.trim()) {
      alert("O conteúdo da nota não pode estar vazio.");
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
      console.log("Item não encontrado para URL:", currentUrl, "Criando novo item...");
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
      console.log("Item encontrado para URL:", currentUrl, "ID:", currentItem.id);
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
      tags: tags.split(',').map(tag => tag.trim()).filter(Boolean)
    };
    
    console.log("Adicionando nova nota:", newNote);
    
    // Adicionar a nota à store
    notes.update(existingNotes => [...existingNotes, newNote]);

    // Limpar o formulário
    content = "";
    tags = "";
    color = "#2563eb";

    // Feedback visual
    alert("Nota adicionada com sucesso!");
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
    <label class="block text-sm font-medium mb-1 text-white">Tags (separadas por vírgula)</label>
    <input 
      type="text" 
      bind:value={tags} 
      placeholder="Ex: importante, revisar, trabalho"
      class="w-full p-2 rounded border border-gray-500 dark:border-gray-600 bg-gray-800 text-white"
    />
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
      onclick={saveNote}
      disabled={!content.trim()}
    >
      Salvar Nota
    </button>
  </div>
</div> 