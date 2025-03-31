<script lang="ts">
  import type { Flashcard, SavedItem } from "../../types";
  import { flashcards, savedItems } from "../../storage";
  import { format } from 'date-fns';
  import { ptBR } from 'date-fns/locale';
  import { onMount } from 'svelte';
  import * as Dialog from "../../lib/components/ui/dialog/index.js";
  
  let { card, showActions = true } = $props<{ 
    card: Flashcard; 
    showActions?: boolean;
  }>();
  
  let isFlipped = $state(false);
  let isDialogOpen = $state(false);
  let editedFront = $state(card?.front || "");
  let editedBack = $state(card?.back || "");
  let editedTags = $state<string[]>((card?.tags || []).slice());
  let tagInput = $state("");
  let editedColor = $state(card?.color || "#20b2aa");
  let hasError = $state(false);
  let errorMessage = $state("");
  
  // Referência ao item vinculado
  let linkedItem = $state<SavedItem | null>(null);
  
  // Obtém todas as tags existentes no banco de dados
  let allTags = $derived([...new Set($flashcards.flatMap(card => card.tags))].sort());
  
  onMount(() => {
    // Verificar se o flashcard é válido
    if (!card) {
      console.error("FlashcardCard: flashcard inválido ou indefinido");
      hasError = true;
      errorMessage = "Flashcard inválido ou indefinido";
      return;
    }
    
    // Verificar se o flashcard tem as propriedades necessárias
    if (!card.id || !card.front || !card.back) {
      console.error(`FlashcardCard: propriedades do flashcard ausentes - ID: ${card?.id}, front: ${card?.front?.substring(0, 30)}, back: ${card?.back?.substring(0, 30)}`);
      hasError = true;
      errorMessage = "Propriedades do flashcard ausentes";
      return;
    }
    
    // Buscar o item vinculado
    if (card.itemId) {
      const unsubscribe = savedItems.subscribe(items => {
        linkedItem = items.find(item => item.id === card.itemId) || null;
      });
      unsubscribe();
    }
    
    console.log(`FlashcardCard montado para flashcard ${card.id}: ${card.front.substring(0, 30)}...`);
  });
  
  // Lista de cores predefinidas para escolher
  const colorOptions = [
    { value: "#ffffff", name: "Branco" },
    { value: "#ef4444", name: "Vermelho" },
    { value: "#f59e0b", name: "Laranja" },
    { value: "#10b981", name: "Verde" },
    { value: "#3b82f6", name: "Azul" },
    { value: "#20b2aa", name: "Teal" },
    { value: "#8b5cf6", name: "Roxo" },
    { value: "#ec4899", name: "Rosa" },
  ];
  
  function formatDate(timestamp: number) {
    if (!timestamp) return "Data desconhecida";
    return format(new Date(timestamp), "PPp", { locale: ptBR });
  }
  
  function toggleFlip() {
    isFlipped = !isFlipped;
  }
  
  function deleteFlashcard() {
    if (confirm("Tem certeza que deseja excluir este flashcard?")) {
      flashcards.update(currentFlashcards => 
        currentFlashcards.filter(f => f.id !== card.id)
      );
    }
  }
  
  function startEditing() {
    editedFront = card.front;
    editedBack = card.back;
    editedTags = (card.tags || []).slice();
    tagInput = "";
    editedColor = card.color || "#20b2aa";
    
    // Atualizar a referência ao item vinculado
    if (card.itemId) {
      const unsubscribe = savedItems.subscribe(items => {
        linkedItem = items.find(item => item.id === card.itemId) || null;
      });
      unsubscribe();
    }
    
    isDialogOpen = true;
  }
  
  function saveEdits() {
    flashcards.update(currentFlashcards => 
      currentFlashcards.map(f => {
        if (f.id === card.id) {
          return {
            ...f,
            front: editedFront,
            back: editedBack,
            tags: editedTags,
            color: editedColor,
            lastModified: Date.now()
          };
        }
        return f;
      })
    );
    
    isDialogOpen = false;
  }
  
  function cancelEditing() {
    isDialogOpen = false;
  }
  
  // Abre o item vinculado em uma nova aba
  function openLinkedItem() {
    if (linkedItem && linkedItem.url) {
      window.open(linkedItem.url, "_blank");
    }
  }
  
  // Adiciona uma nova tag
  function addTag() {
    if (!tagInput.trim()) return;
    
    // Remove espaços em branco e converte para minúsculas
    const normalizedTag = tagInput.trim().toLowerCase();
    
    // Verificar se a tag já existe
    if (!editedTags.includes(normalizedTag)) {
      editedTags = [...editedTags, normalizedTag];
    }
    
    // Limpar o campo de input
    tagInput = "";
  }
  
  // Remove uma tag
  function removeTag(tagToRemove: string) {
    editedTags = editedTags.filter(tag => tag !== tagToRemove);
  }
  
  // Adiciona uma tag existente da lista
  function addExistingTag(tag: string) {
    if (!editedTags.includes(tag)) {
      editedTags = [...editedTags, tag];
    }
  }
  
  // Filtrar tags existentes que não estão já selecionadas e que correspondem ao input atual
  let filteredExistingTags = $derived(
    allTags.filter(tag => 
      !editedTags.includes(tag) && 
      (tagInput.trim() === "" || tag.toLowerCase().includes(tagInput.toLowerCase()))
    )
  );
  
  // Função para lidar com o evento keydown no input de tags
  function handleTagInputKeydown(e: KeyboardEvent) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    }
  }
  
  // Truncar texto longo
  function truncate(text: string, length: number) {
    if (text.length <= length) return text;
    return text.substring(0, length) + "...";
  }
</script>

<div class="flashcard-card p-4 rounded-lg shadow-sm transition-all">
  {#if hasError}
    <div class="error-message p-3 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-md">
      <p>Erro ao renderizar flashcard: {errorMessage}</p>
    </div>
  {:else}
    <div class="flashcard-content" class:flipped={isFlipped}>
      <div class="flashcard-inner">
        <div class="front" style="background-color: {card?.color || '#20b2aa'}">
          {#if linkedItem}
            <div class="linked-item-indicator mb-2 text-xs flex items-center gap-1 text-gray-800 dark:text-gray-200 opacity-75">
              {#if linkedItem.favicon}
                <img src={linkedItem.favicon} alt="" class="w-4 h-4 rounded-sm" />
              {:else}
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              {/if}
              <button 
                class="text-gray-700 dark:text-gray-300 underline hover:text-blue-600 dark:hover:text-blue-400"
                onclick={openLinkedItem}
                title="Abrir página vinculada"
              >
                {truncate(linkedItem.title, 30)}
              </button>
            </div>
          {/if}
          
          <div class="mb-4">
            <div class="whitespace-pre-wrap">{card?.front || "Sem pergunta"}</div>
          </div>
          
          <div class="flashcard-footer flex justify-between items-center">
            <button 
              onclick={toggleFlip}
              class="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              Mostrar resposta
            </button>
            
            {#if showActions}
              <div class="flashcard-actions flex gap-2">
                <button 
                  onclick={startEditing}
                  class="p-1 hover:text-blue-600 dark:hover:text-blue-400"
                  title="Editar flashcard"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button 
                  onclick={deleteFlashcard}
                  class="p-1 hover:text-red-600 dark:hover:text-red-400"
                  title="Excluir flashcard"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            {/if}
          </div>
        </div>
        
        <div class="back" style="background-color: {card?.color || '#20b2aa'}">
          {#if linkedItem}
            <div class="linked-item-indicator mb-2 text-xs flex items-center gap-1 text-gray-800 dark:text-gray-200 opacity-75">
              {#if linkedItem.favicon}
                <img src={linkedItem.favicon} alt="" class="w-4 h-4 rounded-sm" />
              {:else}
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              {/if}
              <button 
                class="text-gray-700 dark:text-gray-300 underline hover:text-blue-600 dark:hover:text-blue-400"
                onclick={openLinkedItem}
                title="Abrir página vinculada"
              >
                {truncate(linkedItem.title, 30)}
              </button>
            </div>
          {/if}
          
          <div class="mb-4">
            <div class="whitespace-pre-wrap">{card?.back || "Sem resposta"}</div>
          </div>
          
          <div class="flashcard-footer flex justify-between items-center">
            <button 
              onclick={toggleFlip}
              class="px-3 py-1 bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300 text-sm rounded"
            >
              Voltar para a pergunta
            </button>
            
            {#if card?.tags?.length > 0}
              <div class="flashcard-tags flex flex-wrap gap-1">
                {#each card.tags as tag}
                  <span class="tag text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded-full">
                    {tag}
                  </span>
                {/each}
              </div>
            {/if}
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<!-- Dialog de edição -->
<Dialog.Root bind:open={isDialogOpen}>
  <Dialog.Content class="w-full max-w-lg">
    <Dialog.Header>
      <Dialog.Title>Editar Flashcard</Dialog.Title>
      <Dialog.Description>
        Faça alterações no seu flashcard e clique em salvar quando finalizar.
      </Dialog.Description>
    </Dialog.Header>
    
    <div class="flashcard-edit-form space-y-3 py-4">
      <!-- Item vinculado -->
      {#if linkedItem}
        <div class="linked-item p-3 bg-gray-100 dark:bg-gray-800 rounded-md">
          <h3 class="text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Item vinculado:</h3>
          <div class="flex items-center gap-2">
            {#if linkedItem.favicon}
              <img src={linkedItem.favicon} alt="" class="w-5 h-5 rounded-sm" />
            {:else}
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            {/if}
            <button 
              onclick={openLinkedItem}
              class="text-blue-600 dark:text-blue-400 hover:underline text-sm flex-1 text-left truncate"
              title={linkedItem.title}
            >
              {linkedItem.title}
            </button>
            <a 
              href={linkedItem.url} 
              target="_blank" 
              rel="noopener noreferrer"
              class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              title="Abrir em nova aba"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>
      {/if}
      
      <div>
        <label class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
          Frente (pergunta)
        </label>
        <textarea 
          bind:value={editedFront}
          placeholder="Digite a pergunta ou conceito aqui"
          class="w-full p-2 rounded border border-gray-300 dark:border-gray-700 dark:bg-gray-900 h-24 resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        ></textarea>
      </div>
      
      <div>
        <label class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
          Verso (resposta)
        </label>
        <textarea 
          bind:value={editedBack}
          placeholder="Digite a resposta ou explicação aqui"
          class="w-full p-2 rounded border border-gray-300 dark:border-gray-700 dark:bg-gray-900 h-24 resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        ></textarea>
      </div>
      
      <div>
        <label class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
          Tags
        </label>
        
        <!-- Tags selecionadas exibidas como chips -->
        {#if editedTags.length > 0}
          <div class="flex flex-wrap gap-1 mb-2">
            {#each editedTags as tag}
              <div class="tag-chip flex items-center bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 px-2 py-1 rounded-full text-sm">
                <span>{tag}</span>
                <button 
                  type="button"
                  class="ml-1 text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-200"
                  onclick={() => removeTag(tag)}
                  title="Remover tag"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                  </svg>
                </button>
              </div>
            {/each}
          </div>
        {/if}
        
        <!-- Input para adicionar nova tag -->
        <div class="flex">
          <input 
            type="text" 
            bind:value={tagInput}
            placeholder="Digite e pressione Enter para adicionar uma tag"
            class="flex-1 p-2 rounded-l border border-gray-300 dark:border-gray-700 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            onkeydown={handleTagInputKeydown}
          />
          <button 
            type="button"
            onclick={addTag}
            class="px-3 py-2 bg-blue-600 text-white rounded-r hover:bg-blue-700"
          >
            Adicionar
          </button>
        </div>
        
        <!-- Sugestão de tags existentes -->
        {#if filteredExistingTags.length > 0}
          <div class="mt-2">
            <p class="text-xs text-gray-600 dark:text-gray-400 mb-1">Tags existentes:</p>
            <div class="flex flex-wrap gap-1">
              {#each filteredExistingTags as tag}
                <button
                  type="button"
                  onclick={() => addExistingTag(tag)}
                  class="existing-tag text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                >
                  {tag}
                </button>
              {/each}
            </div>
          </div>
        {/if}
      </div>
      
      <div>
        <label class="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
          Cor
        </label>
        <div class="flex flex-wrap gap-3 mt-2">
          {#each colorOptions as option}
            <button 
              type="button"
              class="color-option w-8 h-8 rounded-full cursor-pointer border-2 {editedColor === option.value ? 'border-blue-500 ring-2 ring-blue-300' : 'border-gray-300 dark:border-gray-600'}"
              style="background-color: {option.value};"
              onclick={() => editedColor = option.value}
              title={option.name}
            ></button>
          {/each}
        </div>
      </div>
    </div>
    
    <Dialog.Footer>
      <div class="flex justify-end gap-3">
        <button 
          onclick={cancelEditing}
          class="px-5 py-2 bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          Cancelar
        </button>
        <button 
          onclick={saveEdits}
          class="px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Salvar
        </button>
      </div>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<style>
  .flashcard-content {
    position: relative;
    perspective: 1000px;
    min-height: 150px;
  }
  
  .flashcard-inner {
    position: relative;
    width: 100%;
    height: 100%;
    text-align: left;
    transition: transform 0.6s;
    transform-style: preserve-3d;
  }
  
  .flipped .flashcard-inner {
    transform: rotateY(180deg);
  }
  
  .front, .back {
    position: absolute;
    width: 100%;
    -webkit-backface-visibility: hidden;
    backface-visibility: hidden;
    padding: 1rem;
    border-radius: 0.375rem;
  }
  
  .front {
    z-index: 2;
  }
  
  .back {
    transform: rotateY(180deg);
  }
  
  /* Estilos para o seletor de cores */
  .color-option {
    position: relative;
    transition: transform 0.1s ease-in-out;
  }
  
  .color-option:hover {
    transform: scale(1.1);
  }
  
  /* Estilo específico para a cor branca no modo escuro */
  .color-option[style*="background-color: #ffffff"] {
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.1) inset;
  }
  
  /* Highlight na cor selecionada */
  .color-option[class*="border-blue-500"] {
    z-index: 1;
    box-shadow: 0 0 8px rgba(59, 130, 246, 0.5);
  }
  
  /* Estilos para as tags */
  .tag-chip {
    transition: background-color 0.2s ease;
  }
  
  .tag-chip:hover {
    background-color: rgba(59, 130, 246, 0.2);
  }
  
  .existing-tag {
    cursor: pointer;
  }
  
  /* Estilos para o indicador de item vinculado */
  .linked-item-indicator {
    transition: opacity 0.2s ease;
  }
  
  .linked-item-indicator:hover {
    opacity: 1;
  }
</style> 