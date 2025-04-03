<script lang="ts">
  import type { SavedItem } from "../../types";
  import { flashcards, savedItems } from "../../storage";
  import { format } from 'date-fns';
  import { ptBR } from 'date-fns/locale';
  import { toast } from "svelte-sonner";

  let { item } = $props<{ item: SavedItem }>();
  
  let front = $state("");
  let back = $state("");
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

  function saveFlashcard() {
    if (!front.trim() || !back.trim()) return;

    const tagList = tags
      .split(",")
      .map(tag => tag.trim())
      .filter(tag => tag !== "");

    // Criar novo flashcard
    const now = Date.now();
    const newFlashcard = {
      id: crypto.randomUUID(),
      itemId: item.id,
      front,
      back,
      color,
      tags: tagList,
      dateCreated: now,
      lastModified: now,
      reviewCount: 0,
      easeFactor: 2.5
    };
    
    // Adicionar à store
    flashcards.update(current => [...current, newFlashcard]);
    
    // Atualizar o item salvo para incluir a referência ao flashcard
    savedItems.update(items => 
      items.map(i => 
        i.id === item.id 
          ? { ...i, flashcardIds: [...(i.flashcardIds || []), newFlashcard.id] }
          : i
      )
    );

    // Exibir toast de sucesso
    toast.success("Flashcard criado com sucesso!", {
      description: `Flashcard adicionado a "${item.title}"`,
      duration: 3000,
    });

    // Limpar o formulário após salvar
    front = "";
    back = "";
    tags = "";
    color = "#f9fafb";
  }

  function getCurrentDate() {
    return format(new Date(), "PP", { locale: ptBR });
  }
</script>

<div class="flashcard-input p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
  <div class="mb-4">
    <h3 class="text-lg font-semibold mb-1">Criar Flashcard</h3>
    <p class="text-sm text-gray-500 dark:text-gray-400">{getCurrentDate()}</p>
  </div>
  
  <div class="mb-4">
    <label class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
      Frente (pergunta)
    </label>
    <textarea 
      bind:value={front}
      placeholder="Escreva a pergunta aqui..."
      class="w-full p-3 rounded border border-gray-300 dark:border-gray-700 dark:bg-gray-900 h-24 resize-none"
    ></textarea>
  </div>
  
  <div class="mb-4">
    <label class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
      Verso (resposta)
    </label>
    <textarea 
      bind:value={back}
      placeholder="Escreva a resposta aqui..."
      class="w-full p-3 rounded border border-gray-300 dark:border-gray-700 dark:bg-gray-900 h-24 resize-none"
    ></textarea>
  </div>
  
  <div class="mb-4">
    <label class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
      Tags (separadas por vírgula)
    </label>
    <input 
      type="text" 
      bind:value={tags}
      placeholder="ex: matemática, história, idiomas"
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
      saveFlashcard();
    }} 
    class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
    disabled={!front.trim() || !back.trim()}
  >
    Salvar Flashcard
  </button>
</div> 