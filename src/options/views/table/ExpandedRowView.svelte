<script lang="ts">
  import { savedItems, notes, flashcards, updateItem } from '../../../storage';
  import type { SavedItem, Note, Flashcard } from '../../../types';
  import { Button } from '../../../lib/components/ui/button/index';
  import { Input } from '../../../lib/components/ui/input/index';
  import { Textarea } from '../../../lib/components/ui/textarea/index.js';
  import NoteCard from '../../../lib/components/NoteCard.svelte';
  import FlashcardCard from '../../../lib/components/FlashcardCard.svelte';
  import * as Sidebar from '../../../lib/components/ui/sidebar/index.js';
  import { toast } from 'svelte-sonner';
  import { onMount } from 'svelte';
  // Ícones
  import Info from '@lucide/svelte/icons/info';
  import StickyNote from '@lucide/svelte/icons/sticky-note';
  import Layers from '@lucide/svelte/icons/layers';
  import CalendarClock from '@lucide/svelte/icons/calendar-clock';
  import History from '@lucide/svelte/icons/history';
  import { Separator } from "../../../lib/components/ui/separator/index.js";

  // Prop de entrada
  let { itemId = "" } = $props();

  // Buscar o item reativamente
  const item = $derived($savedItems.find(i => i.id === itemId));

  // Buscar notas e flashcards reativamente (serão usados nas seções específicas)
  const relatedNotes = $derived($notes.filter(n => item?.noteIds?.includes(n.id)));
  const relatedFlashcards = $derived($flashcards.filter(fc => item?.flashcardIds?.includes(fc.id)));

  // Estado para a seção ativa da sidebar
  let activeSection = $state('overview'); // 'overview', 'notes', 'flashcards', 'scheduling', 'history'

  // Estados para edição do comentário
  let isEditingComment = $state(false);
  let editedComment = $state(item?.comments ?? '');

  // Efeito para atualizar editedComment se o item mudar externamente enquanto não edita
  $effect(() => {
    if (item && !isEditingComment) {
      editedComment = item.comments ?? '';
    }
  });

  // Funções para salvar/cancelar comentário
  async function saveComment() {
    if (!item) return;
    try {
      await updateItem(itemId, { comments: editedComment });
      toast.success("Comentário salvo com sucesso.");
      isEditingComment = false;
    } catch (error) {
      toast.error("Erro ao salvar comentário.");
      console.error("Erro ao salvar comentário:", error);
    }
  }

  function cancelEditComment() {
    editedComment = item?.comments ?? ''; // Restaura o comentário original
    isEditingComment = false;
  }

  function startEditingComment() {
    editedComment = item?.comments ?? ''; // Garante que começa com o valor atual
    isEditingComment = true;
  }

</script>

<div class="flex min-h-[250px] max-h-[400px] border-t bg-background">
  {#if !item}
    <p class="text-sm text-muted-foreground p-4">Carregando detalhes do item...</p>
  {:else}
    <!-- Coluna de Conteúdo Principal (Esquerda) -->
    <div class="flex-grow p-4 overflow-y-auto space-y-4">
      
      {#if activeSection === 'overview'}
        <!-- Seção: Visão Geral -->
        <div>
          <h3 class="text-lg font-semibold truncate mb-0.5">{item.title}</h3>
          <a href={item.url} target="_blank" rel="noopener noreferrer" class="text-xs text-primary hover:underline break-all">{item.url}</a>
          <p class="text-xs text-muted-foreground mt-1">ID: {item.id}</p>
        </div>

        <Separator />

        <div>
          <h4 class="text-sm font-medium mb-2">Comentário</h4>
          {#if isEditingComment}
            <Textarea bind:value={editedComment} placeholder="Adicione um comentário..." class="min-h-[80px] mb-2 text-sm" />
            <div class="flex justify-end gap-2">
              <Button variant="outline" size="sm" onclick={cancelEditComment}>Cancelar</Button>
              <Button size="sm" onclick={saveComment}>Salvar Comentário</Button>
            </div>
          {:else}
            <div class="text-sm text-muted-foreground p-3 border rounded-md min-h-[80px] whitespace-pre-wrap">
              {item.comments || "Nenhum comentário adicionado."}
            </div>
            <div class="flex justify-end mt-2">
              <Button variant="outline" size="sm" onclick={startEditingComment}>Editar</Button>
            </div>
          {/if}
        </div>

        <Separator />

        <div>
            <h4 class="text-sm font-medium mb-2">Histórico de Visualizações</h4>
            <div class="p-4 border rounded-md bg-muted/30 text-center text-muted-foreground text-sm">
              (Placeholder para Calendário e Seleção de Mês)
            </div>
        </div>
      
      {:else if activeSection === 'notes'}
         <!-- Seção: Notas -->
         <h4 class="text-sm font-medium mb-2">Notas Associadas</h4>
         {#if relatedNotes.length > 0}
           <div class="space-y-3">
             {#each relatedNotes as note (note.id)}
               <NoteCard {note} showActions={false} /> <!-- Ações desabilitadas por enquanto -->
             {/each}
           </div>
         {:else}
           <p class="text-sm text-muted-foreground italic">Nenhuma nota associada a este item.</p>
         {/if}

      {:else if activeSection === 'flashcards'}
         <!-- Seção: Flashcards -->
          <h4 class="text-sm font-medium mb-2">Flashcards Associados</h4>
          {#if relatedFlashcards.length > 0}
            <div class="space-y-3">
              {#each relatedFlashcards as card (card.id)}
                <FlashcardCard {card} showActions={false} /> <!-- Ações desabilitadas -->
              {/each}
            </div>
          {:else}
            <p class="text-sm text-muted-foreground italic">Nenhum flashcard associado a este item.</p>
          {/if}

      {:else if activeSection === 'scheduling'}
         <!-- Seção: Agendamento (Placeholder) -->
          <h4 class="text-sm font-medium mb-2">Agendamento</h4>
          <p class="text-sm text-muted-foreground italic">(Funcionalidade em desenvolvimento)</p>
      {:else if activeSection === 'history'}
          <!-- Seção: Histórico (Placeholder) -->
           <h4 class="text-sm font-medium mb-2">Histórico</h4>
           <p class="text-sm text-muted-foreground italic">(Funcionalidade em desenvolvimento)</p>
      {/if}

    </div>

    <!-- Coluna da Sidebar (Direita) -->
    <Sidebar.Root side="right" collapsible="none" class="border-l w-48 flex-shrink-0 !bg-transparent !relative !h-auto">
       <Sidebar.Content class="p-2">
        <Sidebar.Menu>
           <Sidebar.MenuItem>
            <Sidebar.MenuButton isActive={activeSection === 'overview'} onclick={() => activeSection = 'overview'}>
              <Info class="size-4 mr-2"/> Visão geral
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
          <Sidebar.MenuItem>
            <Sidebar.MenuButton isActive={activeSection === 'notes'} onclick={() => activeSection = 'notes'}>
               <StickyNote class="size-4 mr-2"/> Notas ({relatedNotes.length})
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
           <Sidebar.MenuItem>
            <Sidebar.MenuButton isActive={activeSection === 'flashcards'} onclick={() => activeSection = 'flashcards'}>
               <Layers class="size-4 mr-2"/> Flashcards ({relatedFlashcards.length})
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
           <Sidebar.MenuItem>
            <Sidebar.MenuButton isActive={activeSection === 'scheduling'} onclick={() => activeSection = 'scheduling'} >
               {#snippet child({ props })}
                 <button {...props} disabled>
                   <CalendarClock class="size-4 mr-2"/> Agendamento
                 </button>
               {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
           <Sidebar.MenuItem>
            <Sidebar.MenuButton isActive={activeSection === 'history'} onclick={() => activeSection = 'history'} >
              {#snippet child({ props })}
                <button {...props} disabled>
                  <History class="size-4 mr-2"/> Histórico
                </button>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
        </Sidebar.Menu>
      </Sidebar.Content>
    </Sidebar.Root>
  {/if}
</div> 