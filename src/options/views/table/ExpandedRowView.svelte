<script lang="ts">
  import { savedItems, notes, flashcards, updateItem } from '../../../storage';
  import type { SavedItem, Note, Flashcard, VisitItem } from '../../../types';
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
  import AtSign from '@lucide/svelte/icons/at-sign';
  import { Separator } from "../../../lib/components/ui/separator/index.js";
  // Imports para Calendário e Datas
  import Calendar from "../../../lib/components/ui/calendar/calendar.svelte";
  import { ScrollArea } from "../../../lib/components/ui/scroll-area/index.js";
  import { today, getLocalTimeZone, CalendarDate, parseAbsoluteToLocal, toCalendarDate } from "@internationalized/date";
  import { format } from 'date-fns';
  import { ptBR } from 'date-fns/locale';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import CalendarPlus from '@lucide/svelte/icons/calendar-plus';
  import CalendarX2 from '@lucide/svelte/icons/calendar-x-2';
  import X from '@lucide/svelte/icons/x';
  // NOVO: Importar AlertDialog
  import * as AlertDialog from "../../../lib/components/ui/alert-dialog/index.js";
  import CircleAlert from '@lucide/svelte/icons/circle-alert';
  import LoaderCircle from '@lucide/svelte/icons/loader-circle';

  // Props de entrada
  let { 
    itemId = "", 
    historyFetchResult = undefined 
  } = $props<{ 
    itemId: string; 
    historyFetchResult?: { 
      status: 'idle' | 'loading' | 'error' | 'loaded'; 
      data?: VisitItem[]; 
      error?: string; 
    }
  }>();

  // Buscar o item reativamente
  const item = $derived($savedItems.find(i => i.id === itemId));

  // Buscar notas e flashcards reativamente
  const relatedNotes = $derived(() => $notes.filter(n => item?.noteIds?.includes(n.id)));
  const relatedFlashcards = $derived(() => $flashcards.filter(fc => item?.flashcardIds?.includes(fc.id)));

  // Estado para a seção ativa da sidebar
  let activeSection = $state('overview');

  // Estados para edição do comentário
  let isEditingComment = $state(false);
  let editedComment = $state('');

  // --- Estados para Agendamento ---
  let calendarMonth = $state(today(getLocalTimeZone()));
  let selectedCalendarDates = $state<CalendarDate[]>([]);
  let sortedScheduledDates = $derived(item?.scheduledDates?.slice().sort((a, b) => a - b) ?? []);
  let isSchedulingModeActive = $state(false);
  let showDeleteAllConfirmDialog = $state(false); // NOVO ESTADO para AlertDialog

  // Efeito para sincronizar selectedCalendarDates com item.scheduledDates
  $effect(() => {
      if (item?.scheduledDates) {
          selectedCalendarDates = item.scheduledDates.map(ts => toCalendarDate(parseAbsoluteToLocal(new Date(ts).toISOString())));
      } else {
          selectedCalendarDates = [];
      }
      // Define o mês do calendário para a primeira data agendada, se houver
      if (item?.scheduledDates && item.scheduledDates.length > 0 && activeSection === 'scheduling') {
          const firstDate = parseAbsoluteToLocal(new Date(item.scheduledDates[0]).toISOString());
          // Só atualiza o mês se for diferente para evitar loop
          if (firstDate.month !== calendarMonth.month || firstDate.year !== calendarMonth.year) {
             calendarMonth = toCalendarDate(firstDate);
          }
      } else if (activeSection === 'scheduling') {
          // Se não houver datas, volta para o mês atual
          calendarMonth = today(getLocalTimeZone());
      }
  });

  // Efeito para atualizar editedComment se o item mudar externamente enquanto não edita
  $effect(() => {
      if (item && !isEditingComment) {
          editedComment = item.comments ?? '';
      }
  });

  // Efeito para resetar isSchedulingModeActive quando o item mudar
  $effect(() => {
      // Acessar itemId faz este efeito re-executar quando a prop muda
      const currentItemId = itemId;
      isSchedulingModeActive = false;
  });

  // --- Funções de Agendamento ---
  async function addDatesToSchedule() {
      if (!item || selectedCalendarDates.length === 0) return;

      const existingTimestampsSet = new Set(item.scheduledDates ?? []);
      const timestampsToAdd = selectedCalendarDates
          .map(date => date.toDate(getLocalTimeZone()).getTime())
          .filter(ts => !existingTimestampsSet.has(ts));

      if (timestampsToAdd.length === 0) {
           toast.info("Nenhuma nova data selecionada para adicionar.");
           return;
      }

      const existingTimestamps = item.scheduledDates ?? [];
      const combinedTimestamps = [...new Set([...existingTimestamps, ...timestampsToAdd])]; 
      combinedTimestamps.sort((a, b) => a - b);

      try {
          await updateItem(itemId, { scheduledDates: combinedTimestamps, readLater: true }); 
          toast.success(`${timestampsToAdd.length} nova(s) data(s) adicionada(s) ao agendamento.`);
          isSchedulingModeActive = false;
      } catch (error) {
          toast.error("Erro ao adicionar datas ao agendamento.");
          console.error("Erro ao salvar agendamento:", error);
      }
  }

  async function removeDateFromSchedule(timestampToRemove: number) {
      if (!item || !item.scheduledDates) return;

      const updatedDates = item.scheduledDates.filter(ts => ts !== timestampToRemove);
      
      // Prepara o objeto de atualizações
      let updates: Partial<SavedItem> = { scheduledDates: updatedDates };

      // Verifica se esta era a última data
      if (updatedDates.length === 0) {
          updates.readLater = false; // Reverte para bookmark
      }

      try {
          await updateItem(itemId, updates); // Aplica as atualizações combinadas
          toast.success("Data removida do agendamento.");
          // Adiciona feedback extra se voltou a ser bookmark
          if (updates.readLater === false) {
              toast.info("Item revertido para bookmark pois não há mais datas agendadas.");
          }
      } catch (error) {
          toast.error("Erro ao remover data do agendamento.");
          console.error("Erro ao remover agendamento:", error);
      }
  }

  // MODIFICADO: Renomeado para indicar que apenas *tenta* abrir o diálogo
  function tryDeleteAllDates() {
      if (!item || !item.scheduledDates || item.scheduledDates.length === 0) return;
      showDeleteAllConfirmDialog = true; // Apenas abre o diálogo
  }

  // NOVO: Função para confirmar a exclusão (chamada pelo AlertDialog.Action)
  async function confirmDeleteAllDates() {
      if (!item) return;
      showDeleteAllConfirmDialog = false; // Fecha o diálogo primeiro

      try {
          // MODIFICADO: Define readLater como false também
          await updateItem(itemId, { scheduledDates: [], readLater: false });
          toast.success("Todas as datas agendadas foram removidas e o item voltou a ser um bookmark.");
          // isSchedulingModeActive = false; // Opcional: Resetar modo se voltou a ser bookmark? 
                                        // Decisão: Não resetar, pode querer adicionar data logo em seguida.
      } catch (error) {
          toast.error("Erro ao remover todas as datas agendadas.");
          console.error("Erro ao remover agendamentos:", error);
      }
  }

  function navigateCalendarToDate(timestamp: number) {
      const zonedDate = parseAbsoluteToLocal(new Date(timestamp).toISOString());
      calendarMonth = toCalendarDate(zonedDate);
  }

  // --- Funções para salvar/cancelar comentário ---
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

  // Função para formatar data para a lista
  function formatListedDate(timestamp: number): string {
      try {
          // Capitaliza a primeira letra do dia da semana
          const formatted = format(new Date(timestamp), "dd/MM/yyyy (EEEE)", { locale: ptBR });
          return formatted.charAt(0).toUpperCase() + formatted.slice(1);
      } catch (e) {
          return "Data inválida";
      }
  }

</script>

<div class="flex min-h-[300px] max-h-[450px] border-t bg-background">  {#if !item}
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

        {:else if activeSection === 'mentions'}
          <h4 class="text-sm font-medium mb-2">Menções</h4>
          <p class="text-sm text-muted-foreground italic">(Funcionalidade em desenvolvimento)</p>

        {:else if activeSection === 'notes'}
           <!-- Seção: Notas -->
           <h4 class="text-sm font-medium mb-2">Notas Associadas</h4>
           {#if relatedNotes.length > 0}
             <div class="space-y-3">
               {#each relatedNotes() as note (note.id)}
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
                {#each relatedFlashcards() as card (card.id)}
                  <FlashcardCard {card} showActions={false} /> <!-- Ações desabilitadas -->
                {/each}
              </div>
            {:else}
              <p class="text-sm text-muted-foreground italic">Nenhum flashcard associado a este item.</p>
            {/if}

        {:else if activeSection === 'scheduling'}
           <!-- Seção: Agendamento -->
            <h4 class="text-sm font-medium mb-2">Agendamento</h4>
            {#if item.readLater || isSchedulingModeActive}
              <div class="flex flex-col md:flex-row gap-4">
                  <!-- Coluna do Calendário -->
                  <div class="flex-shrink-0 mx-auto md:mx-0">
                      <Calendar
                          type="multiple"
                          bind:value={selectedCalendarDates}
                          placeholder={calendarMonth}
                          locale="pt-BR"
                          class="rounded-md border"
                      />
                  </div>
                  <!-- Coluna da Lista de Datas e Ações -->
                  <div class="flex-grow flex flex-col space-y-3 min-w-0">
                      <div class="flex justify-between items-center gap-2 flex-wrap">
                           <Button size="sm" variant="outline" onclick={addDatesToSchedule} disabled={selectedCalendarDates.length === 0}>
                              <CalendarPlus class="w-4 h-4 mr-2" /> Adicionar Data(s)
                           </Button>
                           <Button size="sm" variant="destructive" onclick={tryDeleteAllDates} disabled={!item.scheduledDates || item.scheduledDates.length === 0}>
                               <CalendarX2 class="w-4 h-4 mr-2" /> Excluir Todas
                           </Button>
                      </div>
                      <p class="text-xs text-muted-foreground text-center">Datas Agendadas:</p>
                      <ScrollArea class="h-48 border rounded-md p-2 flex-grow">
                          {#if sortedScheduledDates && sortedScheduledDates.length > 0}
                              <ul class="space-y-1">
                                  {#each sortedScheduledDates as scheduleTs (scheduleTs)}
                                      <li class="group relative flex items-center justify-between p-1.5 rounded hover:bg-accent focus-within:bg-accent">
                                          <button
                                              class="flex-grow text-left text-sm focus:outline-none"
                                              onclick={() => navigateCalendarToDate(scheduleTs)}
                                              title="Ver no calendário"
                                          >
                                              {formatListedDate(scheduleTs)}
                                          </button>
                                          <button
                                              class="p-1 rounded-full text-destructive opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-destructive/10 transition-opacity flex-shrink-0"
                                              onclick={() => removeDateFromSchedule(scheduleTs)}
                                              title="Excluir esta data"
                                              aria-label="Excluir data {formatListedDate(scheduleTs)}"
                                          >
                                              <X class="w-3.5 h-3.5" />
                                          </button>
                                      </li>
                                  {/each}
                              </ul>
                          {:else}
                              <p class="text-xs text-muted-foreground italic text-center py-4">Nenhuma data agendada.</p>
                          {/if}
                      </ScrollArea>
                  </div>
              </div>
            {:else if !isSchedulingModeActive} 
              <!-- Botão para Adicionar Agendamento (Bookmark) -->
              <div class="text-center py-10">
                <p class="text-sm text-muted-foreground mb-4">Este item é um bookmark. Clique abaixo para adicionar datas de agendamento e marcá-lo como 'Ler Mais Tarde'.</p>
                <Button onclick={() => isSchedulingModeActive = true}>
                  <CalendarPlus class="w-4 h-4 mr-2" /> Adicionar Agendamento
                </Button>
              </div>
            {/if}

        {:else if activeSection === 'history'}
            <!-- Seção: Histórico (com base na prop) -->
             <h4 class="text-sm font-medium mb-2">Histórico de Visitas</h4>
             <ScrollArea class="h-[calc(100%-3rem)] border rounded-md p-2">
                  {#if historyFetchResult?.status === 'loading'}
                      <div class="flex justify-center items-center h-full">
                          <LoaderCircle class="w-6 h-6 animate-spin text-primary" />
                          <span class="ml-2 text-muted-foreground">Carregando histórico...</span>
                      </div>
                  {:else if historyFetchResult?.status === 'error'}
                      <div class="flex flex-col justify-center items-center h-full text-destructive">
                          <CircleAlert class="w-8 h-8 mb-2" />
                          <p class="text-sm font-medium">Erro ao buscar histórico</p>
                          <p class="text-xs text-center mt-1">{historyFetchResult.error || 'Ocorreu um erro desconhecido.'}</p>
                      </div>
                  {:else if historyFetchResult?.status === 'loaded' && historyFetchResult.data && historyFetchResult.data.length > 0}
                      <ul class="space-y-2">
                          {#each historyFetchResult.data as visit (visit.visitId)}
                              <li class="text-xs border-b border-dashed border-gray-700 pb-1 last:border-b-0">
                                  <span class="font-mono text-muted-foreground">{format(new Date(visit.visitTime), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}</span>
                                  <span class="ml-2 text-primary/80">({visit.transition})</span>
                              </li>
                          {/each}
                      </ul>
                  {:else if historyFetchResult?.status === 'loaded'}
                      <p class="text-sm text-muted-foreground italic text-center py-4">Nenhum histórico de visitas registrado para este item.</p>
                  {:else} <!-- Status idle ou undefined -->
                       <p class="text-sm text-muted-foreground italic text-center py-4">Histórico não carregado.</p>
                  {/if}
             </ScrollArea>
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
              <Sidebar.MenuButton isActive={activeSection === 'mentions'} onclick={() => activeSection = 'mentions'}>
                 <AtSign class="size-4 mr-2"/> Menções (0)
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
                 <CalendarClock class="size-4 mr-2"/> Agendamento ({item?.scheduledDates?.length ?? 0})
              </Sidebar.MenuButton>
            </Sidebar.MenuItem>
             <Sidebar.MenuItem>
              <Sidebar.MenuButton isActive={activeSection === 'history'} onclick={() => activeSection = 'history'}>
                  <History class="size-4 mr-2"/> Histórico
              </Sidebar.MenuButton>
            </Sidebar.MenuItem>
          </Sidebar.Menu>
        </Sidebar.Content>
      </Sidebar.Root>
    {/if}
</div>

<!-- NOVO: AlertDialog para confirmar exclusão de todas as datas -->
<AlertDialog.Root bind:open={showDeleteAllConfirmDialog}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Confirmar Exclusão</AlertDialog.Title>
      <AlertDialog.Description>
        Tem certeza que deseja remover <strong>todas</strong> as datas agendadas para este item?
        {#if item?.readLater} Isso também o converterá de volta para um bookmark.{/if}
        Esta ação não pode ser desfeita.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel onclick={() => showDeleteAllConfirmDialog = false}>Cancelar</AlertDialog.Cancel>
      <AlertDialog.Action class="bg-destructive text-destructive-foreground hover:bg-destructive/90" onclick={confirmDeleteAllDates}>
        Excluir Todas
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>