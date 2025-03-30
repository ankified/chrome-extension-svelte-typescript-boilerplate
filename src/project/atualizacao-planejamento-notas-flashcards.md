# Atualização do Planejamento: Notas Rápidas e Flashcards

## Novas Funcionalidades

Adicionaremos ao planejamento original as seguintes funcionalidades:

1. **Notas Rápidas**: Permitir que o usuário adicione notas curtas associadas a páginas salvas
2. **Flashcards**: Criar e gerenciar flashcards de estudo vinculados a páginas web
3. **Views de Gerenciamento**: Interfaces dedicadas para organizar notas e flashcards
4. **Integração com SvelteFlow**: Criar vínculos visuais entre notas e flashcards

## Expansão do Modelo de Dados

### Novos Tipos

```typescript
interface Note {
  id: string;
  itemId: string; // ID do SavedItem relacionado
  content: string;
  dateCreated: number;
  lastModified: number;
  tags: string[];
  color?: string; // Para categorização visual
  position?: { x: number, y: number }; // Para SvelteFlow
}

interface Flashcard {
  id: string;
  itemId: string; // ID do SavedItem relacionado
  front: string; // Pergunta ou conceito
  back: string; // Resposta ou explicação
  dateCreated: number;
  lastModified: number;
  lastReviewed?: number;
  reviewCount: number;
  easeFactor: number; // Fator de facilidade para algoritmo de repetição espaçada
  nextReviewDate?: number;
  tags: string[];
  position?: { x: number, y: number }; // Para SvelteFlow
}

// Expandindo o SavedItem para incluir referências a notas e flashcards
interface SavedItem {
  // ... campos existentes ...
  noteIds: string[];
  flashcardIds: string[];
}

// Adicionando novos tipos de links para o SvelteFlow
interface ItemLink {
  // ... campos existentes ...
  type: 'item-item' | 'item-note' | 'note-note' | 'flashcard-flashcard' | 'flashcard-note';
}
```

### Armazenamento Adicional

```typescript
function createNotesStore() {
  return persistentStore<Note[]>("notes", []);
}

function createFlashcardsStore() {
  return persistentStore<Flashcard[]>("flashcards", []);
}

export const notes = createNotesStore();
export const flashcards = createFlashcardsStore();
```

## Interface do Usuário

### 1. Popup (Extensão)

Adicionaremos opções para:
- **Criar nota rápida**: Botão para adicionar uma nota associada à página atual
- **Criar flashcard**: Opção para gerar um flashcard a partir da página atual

### 2. Componentes de Entrada

#### Nota Rápida
```svelte
<!-- QuickNoteInput.svelte -->
<script lang="ts">
  import { notes, savedItems } from "../storage";
  import { Button } from "$lib/components/ui/button";
  import { Textarea } from "$lib/components/ui/textarea";
  
  export let itemId: string;
  
  let content = "";
  let tags = "";
  
  function saveNote() {
    if (!content.trim()) return;
    
    const newNote = {
      id: crypto.randomUUID(),
      itemId,
      content,
      dateCreated: Date.now(),
      lastModified: Date.now(),
      tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
      color: "#ffffff"
    };
    
    // Adicionar a nova nota
    notes.update(currentNotes => [...currentNotes, newNote]);
    
    // Atualizar o item salvo para incluir a referência à nota
    savedItems.update(items => 
      items.map(item => 
        item.id === itemId 
          ? { ...item, noteIds: [...(item.noteIds || []), newNote.id] }
          : item
      )
    );
    
    // Limpar o formulário
    content = "";
    tags = "";
  }
</script>

<div class="quick-note-input">
  <h3>Adicionar Nota Rápida</h3>
  
  <Textarea bind:value={content} placeholder="Digite sua nota aqui..." rows={3} />
  
  <div class="note-options">
    <input type="text" bind:value={tags} placeholder="Tags (separadas por vírgula)" />
    <Button on:click={saveNote} disabled={!content.trim()}>Salvar Nota</Button>
  </div>
</div>
```

#### Flashcard
```svelte
<!-- FlashcardInput.svelte -->
<script lang="ts">
  import { flashcards, savedItems } from "../storage";
  import { Button } from "$lib/components/ui/button";
  import { Textarea } from "$lib/components/ui/textarea";
  
  export let itemId: string;
  
  let front = "";
  let back = "";
  let tags = "";
  
  function saveFlashcard() {
    if (!front.trim() || !back.trim()) return;
    
    const newFlashcard = {
      id: crypto.randomUUID(),
      itemId,
      front,
      back,
      dateCreated: Date.now(),
      lastModified: Date.now(),
      reviewCount: 0,
      easeFactor: 2.5, // Padrão inicial para algoritmo SM-2
      tags: tags.split(',').map(tag => tag.trim()).filter(Boolean)
    };
    
    // Adicionar o novo flashcard
    flashcards.update(current => [...current, newFlashcard]);
    
    // Atualizar o item salvo para incluir a referência ao flashcard
    savedItems.update(items => 
      items.map(item => 
        item.id === itemId 
          ? { ...item, flashcardIds: [...(item.flashcardIds || []), newFlashcard.id] }
          : item
      )
    );
    
    // Limpar o formulário
    front = "";
    back = "";
    tags = "";
  }
</script>

<div class="flashcard-input">
  <h3>Adicionar Flashcard</h3>
  
  <Textarea bind:value={front} placeholder="Frente (pergunta ou conceito)" rows={2} />
  <Textarea bind:value={back} placeholder="Verso (resposta ou explicação)" rows={2} />
  
  <div class="flashcard-options">
    <input type="text" bind:value={tags} placeholder="Tags (separadas por vírgula)" />
    <Button on:click={saveFlashcard} disabled={!front.trim() || !back.trim()}>Salvar Flashcard</Button>
  </div>
</div>
```

### 3. Novas Views na Página de Opções

#### View de Notas
```svelte
<!-- NotesView.svelte -->
<script lang="ts">
  import { notes, savedItems, itemLinks } from "../storage";
  import { format } from 'date-fns';
  import { ptBR } from 'date-fns/locale';
  import NoteCard from "./NoteCard.svelte";
  import { Button } from "$lib/components/ui/button";
  
  let searchQuery = "";
  let selectedTags = [];
  let viewMode = "list"; // 'list' ou 'flow'
  
  // Notas filtradas
  $: filteredNotes = $notes.filter(note => {
    // Filtro por pesquisa
    const matchesSearch = !searchQuery || 
      note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Filtro por tags selecionadas
    const matchesTags = selectedTags.length === 0 || 
      selectedTags.every(tag => note.tags.includes(tag));
    
    return matchesSearch && matchesTags;
  });
  
  // Todas as tags existentes
  $: allTags = [...new Set($notes.flatMap(note => note.tags))];
  
  // Agrupar por item relacionado
  $: notesByItem = {};
  $: {
    $savedItems.forEach(item => {
      if (item.noteIds && item.noteIds.length > 0) {
        notesByItem[item.id] = filteredNotes.filter(note => 
          item.noteIds.includes(note.id)
        );
      }
    });
  }
  
  // Toggle seleção de tag
  function toggleTag(tag) {
    const index = selectedTags.indexOf(tag);
    if (index === -1) {
      selectedTags = [...selectedTags, tag];
    } else {
      selectedTags = selectedTags.filter(t => t !== tag);
    }
  }
</script>

<div class="notes-view">
  <header>
    <h2>Minhas Notas</h2>
    
    <div class="view-controls">
      <div class="search-box">
        <input 
          type="text" 
          bind:value={searchQuery} 
          placeholder="Pesquisar notas..."
        />
      </div>
      
      <div class="view-toggle">
        <Button 
          variant={viewMode === "list" ? "default" : "outline"} 
          on:click={() => viewMode = "list"}
        >
          Lista
        </Button>
        <Button 
          variant={viewMode === "flow" ? "default" : "outline"} 
          on:click={() => viewMode = "flow"}
        >
          Fluxo
        </Button>
      </div>
    </div>
  </header>
  
  <div class="tag-filters">
    {#each allTags as tag}
      <span 
        class="tag" 
        class:selected={selectedTags.includes(tag)}
        on:click={() => toggleTag(tag)}
      >
        {tag}
      </span>
    {/each}
  </div>
  
  {#if viewMode === "list"}
    {#if Object.keys(notesByItem).length === 0}
      <div class="empty-state">
        <p>Nenhuma nota encontrada.</p>
      </div>
    {:else}
      {#each Object.entries(notesByItem) as [itemId, itemNotes]}
        {@const item = $savedItems.find(i => i.id === itemId)}
        {#if item && itemNotes.length > 0}
          <div class="item-notes-section">
            <h3>{item.title}</h3>
            <a href={item.url} target="_blank" class="item-link">{item.url}</a>
            
            <div class="notes-grid">
              {#each itemNotes as note}
                <NoteCard {note} />
              {/each}
            </div>
          </div>
        {/if}
      {/each}
    {/if}
  {:else if viewMode === "flow"}
    <NotesFlow notes={filteredNotes} savedItems={$savedItems} links={$itemLinks} />
  {/if}
</div>
```

#### View de Flashcards
```svelte
<!-- FlashcardsView.svelte -->
<script lang="ts">
  import { flashcards, savedItems } from "../storage";
  import { format } from 'date-fns';
  import { ptBR } from 'date-fns/locale';
  import FlashcardCard from "./FlashcardCard.svelte";
  import { Button } from "$lib/components/ui/button";
  
  let searchQuery = "";
  let selectedTags = [];
  let viewMode = "study"; // 'study', 'list', ou 'flow'
  
  // Flashcards filtrados
  $: filteredFlashcards = $flashcards.filter(card => {
    // Filtro por pesquisa
    const matchesSearch = !searchQuery || 
      card.front.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.back.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Filtro por tags selecionadas
    const matchesTags = selectedTags.length === 0 || 
      selectedTags.every(tag => card.tags.includes(tag));
    
    return matchesSearch && matchesTags;
  });
  
  // Ordenar por data de próxima revisão
  $: sortedFlashcards = [...filteredFlashcards].sort((a, b) => {
    if (!a.nextReviewDate) return 1;
    if (!b.nextReviewDate) return -1;
    return a.nextReviewDate - b.nextReviewDate;
  });
  
  // Todas as tags existentes
  $: allTags = [...new Set($flashcards.flatMap(card => card.tags))];
  
  // Toggle seleção de tag
  function toggleTag(tag) {
    const index = selectedTags.indexOf(tag);
    if (index === -1) {
      selectedTags = [...selectedTags, tag];
    } else {
      selectedTags = selectedTags.filter(t => t !== tag);
    }
  }
  
  // Flashcards due for review today
  const today = new Date().setHours(0, 0, 0, 0);
  $: dueCards = sortedFlashcards.filter(card => 
    card.nextReviewDate && card.nextReviewDate <= Date.now()
  );
</script>

<div class="flashcards-view">
  <header>
    <h2>Meus Flashcards</h2>
    
    <div class="view-controls">
      <div class="search-box">
        <input 
          type="text" 
          bind:value={searchQuery} 
          placeholder="Pesquisar flashcards..."
        />
      </div>
      
      <div class="view-toggle">
        <Button 
          variant={viewMode === "study" ? "default" : "outline"} 
          on:click={() => viewMode = "study"}
        >
          Estudar
        </Button>
        <Button 
          variant={viewMode === "list" ? "default" : "outline"} 
          on:click={() => viewMode = "list"}
        >
          Lista
        </Button>
        <Button 
          variant={viewMode === "flow" ? "default" : "outline"} 
          on:click={() => viewMode = "flow"}
        >
          Fluxo
        </Button>
      </div>
    </div>
  </header>
  
  <div class="tag-filters">
    {#each allTags as tag}
      <span 
        class="tag" 
        class:selected={selectedTags.includes(tag)}
        on:click={() => toggleTag(tag)}
      >
        {tag}
      </span>
    {/each}
  </div>
  
  {#if viewMode === "study"}
    <div class="study-section">
      <h3>Revisão de Hoje ({dueCards.length})</h3>
      
      {#if dueCards.length === 0}
        <div class="empty-state">
          <p>Não há cartões para revisar hoje.</p>
          <Button on:click={() => viewMode = "list"}>Ver Todos os Cartões</Button>
        </div>
      {:else}
        <FlashcardStudySession cards={dueCards} />
      {/if}
    </div>
  {:else if viewMode === "list"}
    {#if filteredFlashcards.length === 0}
      <div class="empty-state">
        <p>Nenhum flashcard encontrado.</p>
      </div>
    {:else}
      <div class="flashcards-grid">
        {#each filteredFlashcards as card}
          <FlashcardCard {card} />
        {/each}
      </div>
    {/if}
  {:else if viewMode === "flow"}
    <FlashcardsFlow flashcards={filteredFlashcards} savedItems={$savedItems} notes={$notes} />
  {/if}
</div>
```

### 4. Integração com SvelteFlow

#### Vista de Fluxo de Notas
```svelte
<!-- NotesFlow.svelte -->
<script lang="ts">
  import { writable } from 'svelte/store';
  import {
    SvelteFlow,
    Controls,
    Background,
    BackgroundVariant,
    useSvelteFlow
  } from '@xyflow/svelte';
  import { itemLinks } from "../storage";
  import NoteNode from './NoteNode.svelte';
  import ItemNode from './ItemNode.svelte';
  
  export let notes = [];
  export let savedItems = [];
  export let links = [];
  
  // Criar nós para notas
  $: noteNodes = notes.map(note => ({
    id: `note-${note.id}`,
    type: 'note',
    data: { note },
    position: note.position || { x: Math.random() * 500, y: Math.random() * 500 }
  }));
  
  // Criar nós para itens relacionados
  $: relatedItemIds = [...new Set(notes.map(note => note.itemId))];
  $: itemNodes = savedItems
    .filter(item => relatedItemIds.includes(item.id))
    .map(item => ({
      id: `item-${item.id}`,
      type: 'item',
      data: { item },
      position: item.position || { x: Math.random() * 500, y: Math.random() * 500 }
    }));
  
  // Combinar todos os nós
  $: nodes = [...noteNodes, ...itemNodes];
  
  // Criar arestas entre nós
  $: edges = links
    .filter(link => 
      link.type === 'note-note' || 
      link.type === 'item-note'
    )
    .map(link => ({
      id: link.id,
      source: link.type === 'note-note' 
        ? `note-${link.sourceId}` 
        : `item-${link.sourceId}`,
      target: link.type === 'note-note' 
        ? `note-${link.targetId}` 
        : `note-${link.targetId}`,
      label: link.label || ''
    }));
  
  // Registrar tipos de nós customizados
  const nodeTypes = {
    note: NoteNode,
    item: ItemNode
  };
  
  const { screenToFlowPosition } = useSvelteFlow();
  
  // Criar uma nova ligação entre nós
  const onConnect = (connection) => {
    const { source, target } = connection;
    const sourceType = source.startsWith('note-') ? 'note' : 'item';
    const targetType = target.startsWith('note-') ? 'note' : 'item';
    
    // Determinar o tipo de link
    const linkType = `${sourceType}-${targetType}`;
    
    // Extrair os IDs limpos
    const sourceId = source.replace(/^(note-|item-)/, '');
    const targetId = target.replace(/^(note-|item-)/, '');
    
    const newLink = {
      id: crypto.randomUUID(),
      sourceId,
      targetId,
      type: linkType,
      label: ''
    };
    
    itemLinks.update(links => [...links, newLink]);
  };
  
  // Atualizar posição de um nó após arrastar
  const onNodeDragStop = (event, node) => {
    const nodeType = node.type;
    const id = node.id.replace(/^(note-|item-)/, '');
    
    if (nodeType === 'note') {
      // Atualizar posição da nota
      const updatedNotes = notes.map(note => 
        note.id === id 
          ? { ...note, position: node.position }
          : note
      );
      // Code to update the notes store
    } else if (nodeType === 'item') {
      // Atualizar posição do item
      const updatedItems = savedItems.map(item => 
        item.id === id 
          ? { ...item, position: node.position }
          : item
      );
      // Code to update the savedItems store
    }
  };
</script>

<div class="notes-flow-container">
  <SvelteFlow 
    {nodes} 
    {edges} 
    {nodeTypes}
    fitView
    on:connect={onConnect}
    on:nodedragstop={onNodeDragStop}
  >
    <Controls />
    <Background variant={BackgroundVariant.Dots} />
  </SvelteFlow>
</div>
```

#### Vista de Fluxo de Flashcards (similar à de Notas)
```svelte
<!-- FlashcardsFlow.svelte -->
<script lang="ts">
  // Implementação similar à NotesFlow.svelte, 
  // mas adaptada para flashcards, notas e itens relacionados
</script>

<div class="flashcards-flow-container">
  <SvelteFlow ...>
    <!-- Similar à implementação de NotesFlow -->
  </SvelteFlow>
</div>
```

## Atualização do Cronograma

1. **Semana 1-2**: Estrutura básica e armazenamento (incluindo modelos para notas e flashcards)
2. **Semana 3-4**: Interface de usuário básica (popup e sidebar)
3. **Semana 5-6**: Visualizações KanBan e SvelteFlow, componentes de notas e flashcards
4. **Semana 7-8**: Sistema de notificações, view de agendamentos, view de notas e flashcards
5. **Semana 9-10**: Visualizações de fluxo (SvelteFlow) para notas e flashcards, testes e correções
6. **Semana 11**: Preparação para lançamento

## Próximos Passos (Atualizados)

1. Expandir o modelo de dados para incluir notas e flashcards
2. Implementar componentes para criação e edição de notas e flashcards
3. Criar views dedicadas para gerenciamento de notas e flashcards
4. Integrar notas e flashcards com SvelteFlow para visualização de relacionamentos
5. Implementar algoritmo de repetição espaçada para revisão de flashcards 