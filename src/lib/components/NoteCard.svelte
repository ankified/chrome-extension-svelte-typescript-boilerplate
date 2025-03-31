<script lang="ts">
  import type { Note } from "../../types";
  import { notes } from "../../storage";
  import { format } from 'date-fns';
  import { ptBR } from 'date-fns/locale';
  
  let { note, showActions = true } = $props<{ 
    note: Note; 
    showActions?: boolean;
  }>();
  
  let isEditing = $state(false);
  let editedContent = $state(note.content);
  let editedTags = $state(note.tags.join(", "));
  let editedColor = $state(note.color || "#f9fafb");
  
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
  
  function deleteNote() {
    if (confirm("Tem certeza que deseja excluir esta nota?")) {
      notes.update(currentNotes => 
        currentNotes.filter(n => n.id !== note.id)
      );
    }
  }
  
  function startEditing() {
    isEditing = true;
    editedContent = note.content;
    editedTags = note.tags.join(", ");
    editedColor = note.color || "#f9fafb";
  }
  
  function saveEdits() {
    const tagList = editedTags
      .split(",")
      .map((tag: string) => tag.trim())
      .filter((tag: string) => tag !== "");
    
    notes.update(currentNotes => 
      currentNotes.map(n => {
        if (n.id === note.id) {
          return {
            ...n,
            content: editedContent,
            tags: tagList,
            color: editedColor,
            lastModified: Date.now()
          };
        }
        return n;
      })
    );
    
    isEditing = false;
  }
  
  function cancelEditing() {
    isEditing = false;
  }
</script>

<div class="note-card p-4 rounded-lg shadow-sm transition-all" style="background-color: {note.color || '#f9fafb'}">
  {#if isEditing}
    <div class="note-edit-form space-y-3">
      <div>
        <textarea 
          bind:value={editedContent}
          class="w-full p-2 rounded border border-gray-300 dark:border-gray-700 dark:bg-gray-900 h-32 resize-none"
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
    <div class="note-content">
      <div class="whitespace-pre-wrap mb-3">{note.content}</div>
      
      {#if note.tags.length > 0}
        <div class="note-tags flex flex-wrap gap-1 mb-3">
          {#each note.tags as tag}
            <span class="tag text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded-full">
              {tag}
            </span>
          {/each}
        </div>
      {/if}
      
      <div class="note-meta flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
        <span>
          Criada em {formatDate(note.dateCreated)}
        </span>
        
        {#if showActions}
          <div class="note-actions flex gap-2">
            <button 
              onclick={startEditing}
              class="p-1 hover:text-blue-600 dark:hover:text-blue-400"
              title="Editar nota"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            <button 
              onclick={deleteNote}
              class="p-1 hover:text-red-600 dark:hover:text-red-400"
              title="Excluir nota"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div> 