<script lang="ts">
  import type { SavedItem } from "../../types";
  import { notes, savedItems } from "../../storage";
  import { format } from 'date-fns';
  import { ptBR } from 'date-fns/locale';
  import { toast } from "svelte-sonner";

  let { item } = $props<{ item: SavedItem }>();
  let content = $state("");
  let tags = $state("");
  let color = $state("#f9fafb");

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

  function saveNote() {
    if (!content.trim()) return;

    const tagList = tags
      .split(",")
      .map(tag => tag.trim())
      .filter(tag => tag !== "");

    // Criar nova nota
    const noteId = crypto.randomUUID();
    const now = Date.now();
    const newNote = {
      id: noteId,
      itemId: item.id,
      content,
      color,
      tags: tagList,
      dateCreated: now,
      lastModified: now
    };
    
    // Adicionar a nota à store
    notes.update(current => [...current, newNote]);
    
    // Atualizar o item salvo para incluir a referência à nota
    savedItems.update(items => 
      items.map(i => 
        i.id === item.id 
          ? { ...i, noteIds: [...(i.noteIds || []), noteId] }
          : i
      )
    );

    // Exibir toast de sucesso
    toast.success("Nota criada com sucesso!", {
      description: `Nota adicionada a "${item.title}"`,
      duration: 3000,
    });

    // Limpar o formulário após salvar
    content = "";
    tags = "";
    color = "#f9fafb";
  }

  function getCurrentDate() {
    return format(new Date(), "PP", { locale: ptBR });
  }
</script>

<div class="quick-note-input p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
  <div class="mb-4">
    <h3 class="text-lg font-semibold mb-1">Adicionar Nota</h3>
    <p class="text-sm text-gray-500 dark:text-gray-400">{getCurrentDate()}</p>
  </div>
  
  <div class="mb-4">
    <textarea 
      bind:value={content}
      placeholder="Escreva sua nota aqui..."
      class="w-full p-3 rounded border border-gray-300 dark:border-gray-700 dark:bg-gray-900 h-32 resize-none"
    ></textarea>
  </div>
  
  <div class="mb-4">
    <label class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
      Tags (separadas por vírgula)
    </label>
    <input 
      type="text" 
      bind:value={tags}
      placeholder="ex: importante, lembrete, ideia"
      class="w-full p-2 rounded border border-gray-300 dark:border-gray-700 dark:bg-gray-900"
    />
  </div>
  
  <div class="mb-4">
    <label class="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
      Cor de fundo
    </label>
    <div class="flex flex-wrap gap-2">
      {#each colorOptions as option}
        <div 
          class="color-option w-8 h-8 rounded-full cursor-pointer border-2 {color === option.value ? 'border-blue-500' : 'border-transparent'}"
          style="background-color: {option.value};"
          onclick={() => color = option.value}
          title={option.name}
        ></div>
      {/each}
    </div>
  </div>
  
  <button 
    onclick={(event) => {
      event.preventDefault();
      saveNote();
    }} 
    class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
    disabled={!content.trim()}
  >
    Salvar Nota
  </button>
</div> 