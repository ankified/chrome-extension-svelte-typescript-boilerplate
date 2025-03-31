<script lang="ts">
  import type { Flashcard } from "../../types";
  import { flashcards } from "../../storage";
  import { format } from 'date-fns';
  import { ptBR } from 'date-fns/locale';
  
  let { flashcard, showActions = true } = $props<{ 
    flashcard: Flashcard; 
    showActions?: boolean;
  }>();
  
  let isFlipped = $state(false);
  let isEditing = $state(false);
  let editedFront = $state(flashcard.front);
  let editedBack = $state(flashcard.back);
  let editedTags = $state(flashcard.tags.join(", "));
  let editedColor = $state(flashcard.color || "#f9fafb");
  
  // Lista de cores predefinidas para escolher
  const colorOptions = [
    { value: "#f9fafb", name: "Branco" },
    { value: "#fee2e2", name: "Vermelho" },
    { value: "#fef3c7", name: "Amarelo" },
    { value: "#d1fae5", name: "Verde" },
    { value: "#dbeafe", name: "Azul" },
    { value: "#f3e8ff", name: "Roxo" },
    { value: "#fce7f3", name: "Rosa" },
  ];
  
  function formatDate(timestamp: number) {
    return format(new Date(timestamp), "PPp", { locale: ptBR });
  }
  
  function toggleFlip() {
    isFlipped = !isFlipped;
  }
  
  function deleteFlashcard() {
    if (confirm("Tem certeza que deseja excluir este flashcard?")) {
      flashcards.update(currentFlashcards => 
        currentFlashcards.filter(f => f.id !== flashcard.id)
      );
    }
  }
  
  function startEditing() {
    isEditing = true;
    editedFront = flashcard.front;
    editedBack = flashcard.back;
    editedTags = flashcard.tags.join(", ");
    editedColor = flashcard.color || "#f9fafb";
  }
  
  function saveEdits() {
    const tagList = editedTags
      .split(",")
      .map((tag: string) => tag.trim())
      .filter((tag: string) => tag !== "");
    
    flashcards.update(currentFlashcards => 
      currentFlashcards.map(f => {
        if (f.id === flashcard.id) {
          return {
            ...f,
            front: editedFront,
            back: editedBack,
            tags: tagList,
            color: editedColor,
            lastModified: Date.now()
          };
        }
        return f;
      })
    );
    
    isEditing = false;
  }
  
  function cancelEditing() {
    isEditing = false;
  }
</script>

<div class="flashcard-card p-4 rounded-lg shadow-sm transition-all" style="background-color: {flashcard.color || '#f9fafb'}">
  {#if isEditing}
    <div class="flashcard-edit-form space-y-3">
      <div>
        <label class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
          Frente (pergunta)
        </label>
        <textarea 
          bind:value={editedFront}
          class="w-full p-2 rounded border border-gray-300 dark:border-gray-700 dark:bg-gray-900 h-24 resize-none"
        ></textarea>
      </div>
      
      <div>
        <label class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
          Verso (resposta)
        </label>
        <textarea 
          bind:value={editedBack}
          class="w-full p-2 rounded border border-gray-300 dark:border-gray-700 dark:bg-gray-900 h-24 resize-none"
        ></textarea>
      </div>
      
      <div>
        <label class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
          Tags
        </label>
        <input 
          type="text" 
          bind:value={editedTags}
          class="w-full p-2 rounded border border-gray-300 dark:border-gray-700 dark:bg-gray-900"
        />
      </div>
      
      <div>
        <label class="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
          Cor
        </label>
        <div class="flex flex-wrap gap-2">
          {#each colorOptions as option}
            <div 
              class="color-option w-6 h-6 rounded-full cursor-pointer border-2 {editedColor === option.value ? 'border-blue-500' : 'border-transparent'}"
              style="background-color: {option.value};"
              onclick={() => editedColor = option.value}
              title={option.name}
            ></div>
          {/each}
        </div>
      </div>
      
      <div class="flex gap-2">
        <button 
          onclick={saveEdits}
          class="px-3 py-1 bg-blue-600 text-white text-sm rounded"
        >
          Salvar
        </button>
        <button 
          onclick={cancelEditing}
          class="px-3 py-1 bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300 text-sm rounded"
        >
          Cancelar
        </button>
      </div>
    </div>
  {:else}
    <div class="flashcard-content" class:flipped={isFlipped}>
      <div class="flashcard-inner">
        <div class="front">
          <div class="mb-4">
            <div class="whitespace-pre-wrap">{flashcard.front}</div>
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
        
        <div class="back">
          <div class="mb-4">
            <div class="whitespace-pre-wrap">{flashcard.back}</div>
          </div>
          
          <div class="flashcard-footer flex justify-between items-center">
            <button 
              onclick={toggleFlip}
              class="px-3 py-1 bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300 text-sm rounded"
            >
              Voltar para a pergunta
            </button>
            
            {#if flashcard.tags.length > 0}
              <div class="flashcard-tags flex flex-wrap gap-1">
                {#each flashcard.tags as tag}
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
  }
  
  .front {
    z-index: 2;
  }
  
  .back {
    transform: rotateY(180deg);
  }
</style> 