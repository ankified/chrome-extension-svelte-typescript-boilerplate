<script lang="ts">
  import { savedItems, groups } from "../../../storage"; // Import 'savedItems' para as funções de tag/grupo
  import type { SavedItem, Group } from "../../../types";
  import * as AlertDialog from "../../../lib/components/ui/alert-dialog/index.js";
  import { Button } from "../../../lib/components/ui/button/index.js";
  import * as Tooltip from "../../../lib/components/ui/tooltip/index.js";
  import * as DropdownMenu from "../../../lib/components/ui/dropdown-menu/index.js";
  import { Info, Trash2, Edit, Tags, FileText, Layers, CalendarClock, Folder, Tag, X, StickyNote, Layers3 } from "@lucide/svelte";
  import { toast } from "svelte-sonner";
  import chroma from 'chroma-js';
  import { formatDistanceToNowStrict, isToday, isTomorrow, isYesterday, differenceInDays, format as formatDateFn } from 'date-fns';
  import { ptBR } from 'date-fns/locale';
  import { ScrollArea } from "../../../lib/components/ui/scroll-area/index.js";
  import * as Carousel from "../../../lib/components/ui/carousel/index.js";
  import * as Dialog from "../../../lib/components/ui/dialog/index.js";
  import { Input } from "../../../lib/components/ui/input/index.js";

  // Props recebidos de SavedItemsView
  let { data, groups: allGroups }: { data: SavedItem[], groups: Group[] } = $props();

  // Garantir que newTagInput existe
  let newTagInput = $state("");

  // Funções auxiliares movidas de SavedItemsView
  function getGroupInfo(groupId: string): { name: string; color: string } {
    const group = allGroups.find(g => g.id === groupId);
    return group ? { name: group.name, color: group.color || '#cccccc' } : { name: 'Sem Grupo', color: '#cccccc' };
  }

  function getTextColorForBackground(bgColor: string): string {
    try {
      return chroma(bgColor).luminance() > 0.5 ? '#000000' : '#ffffff';
    } catch (e) {
      console.warn(`Cor de fundo inválida: ${bgColor}. Usando preto.`);
      return '#000000'; // Fallback para cor inválida
    }
  }

  function formatDateRelative(timestamp: number): string {
    try {
      return formatDistanceToNowStrict(new Date(timestamp), { addSuffix: true, locale: ptBR });
    } catch (e) {
      return "Data inválida";
    }
  }
  
  function formatDate(timestamp: number): string {
    if (!timestamp) return "Data não definida";
    try {
      return new Date(timestamp).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
      }) + 'h';
    } catch (e) {
      return "Data inválida";
    }
  }
  
  // Função original para tooltip de data de adição
  function formatDateAddedTooltip(timestamp: number): string {
    if (!timestamp) return "Data não definida";
    try {
      return new Date(timestamp).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
      }) + 'h';
    } catch (e) {
      return "Data inválida";
    }
  }

  // Nova função para tooltip de agendamento
  function formatScheduleTooltip(timestamp: number): string {
    if (!timestamp) return "Não agendado";
    try {
      const date = new Date(timestamp);
      const now = new Date();
      let relativePart = "";
      const diffDays = differenceInDays(date, now);

      if (isToday(date)) {
        relativePart = "Hoje";
      } else if (isTomorrow(date)) {
        relativePart = "Amanhã";
      } else if (isYesterday(date)) {
        relativePart = "Ontem";
      } else if (diffDays > 0) {
        relativePart = `Em ${diffDays} dia${diffDays > 1 ? 's' : ''}`;
      } else { // diffDays < 0 e não é Ontem
        relativePart = `Há ${Math.abs(diffDays)} dia${Math.abs(diffDays) > 1 ? 's' : ''}`;
      }

      const timePart = formatDateFn(date, 'HH:mm') + 'h';
      return `${relativePart}, às ${timePart}`;
    } catch (e) {
      console.error("Erro ao formatar data de agendamento:", e);
      return "Data inválida";
    }
  }

  // Placeholder para função de edição de agendamento
  function editSchedule(item: SavedItem) {
    toast.info("Edição de agendamento ainda não implementada.", {
        description: `Item: ${item.title}`
    });
  }
  
  // Funções de ação (precisam acessar savedItems store)
  function deleteItem(id: string) {
    // Adicionar confirmação se desejado
    savedItems.update(items => items.filter(item => item.id !== id));
    groups.update(currentGroups =>
        currentGroups.map(group => ({
            ...group,
            itemIds: group.itemIds.filter(itemId => itemId !== id)
        }))
    );
    toast.success("Item excluído com sucesso.");
  }
  
  function removeItemFromGroup(itemId: string, groupId: string) {
      savedItems.update(items =>
          items.map(item => {
              if (item.id === itemId) {
                  return {
                      ...item,
                      groupIds: item.groupIds.filter(gid => gid !== groupId)
                  };
              }
              return item;
          })
      );
      groups.update(currentGroups =>
          currentGroups.map(group => {
              if (group.id === groupId) {
                  return {
                      ...group,
                      itemIds: group.itemIds.filter(id => id !== itemId)
                  };
              }
              return group;
          })
      );
      toast.success("Item removido do grupo.");
  }
  
  function openURL(url: string) {
    chrome.tabs.create({ url });
  }
  
  function removeTagFromItem(item: SavedItem, tagToRemove: string) {
    if (!item.tags || !Array.isArray(item.tags)) return;
    
    savedItems.update(items => {
      return items.map(i => {
        if (i.id === item.id) {
          return {
            ...i,
            tags: i.tags.filter(tag => tag !== tagToRemove)
          };
        }
        return i;
      });
    });
    
    toast.success(`Tag "${tagToRemove}" removida com sucesso.`);
  }
  
  // Função saveNewTag é mantida para o Dialog
  function saveNewTag(item: SavedItem) {
    if (!newTagInput.trim()) {
      return;
    }
    const newTag = newTagInput.trim();
    savedItems.update(items => {
      return items.map(i => {
        if (i.id === item.id) {
          const currentTags = Array.isArray(i.tags) ? [...i.tags] : [];
          const tagExists = currentTags.some(tag => 
            typeof tag === 'string' && tag.toLowerCase() === newTag.toLowerCase()
          );
          if (!tagExists) {
            return {
              ...i,
              tags: [...currentTags, newTag]
            };
          }
        }
        return i;
      });
    });
    toast.success(`Tag "${newTag}" adicionada.`);
    // Limpar input é feito no onkeydown/onclick agora
  }

  // Novas funções (placeholders) para navegação/exibição de notas/flashcards
  function viewNotes(item: SavedItem) {
    toast.info("Visualizar/Gerenciar Notas (Não implementado)", {
        description: `Item: ${item.title}`
    });
  }

  function viewFlashcards(item: SavedItem) {
    toast.info("Visualizar/Gerenciar Flashcards (Não implementado)", {
        description: `Item: ${item.title}`
    });
  }

</script>

<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
    {#each data as item (item.id)}
      {@const noteCount = item.noteIds?.length || 0}
      {@const flashcardCount = item.flashcardIds?.length || 0}
      {@const groupCount = item.groupIds?.length || 0}
      {@const tagCount = item.tags?.length || 0}

      <div class="saved-item-card border rounded-lg overflow-hidden shadow-sm dark:border-gray-700 flex flex-col bg-white dark:bg-gray-800">
        <!-- Header com Favicon e Título/URL -->
        <div class="p-3 flex items-start space-x-3 border-b dark:border-gray-700">
          <img 
            src={`https://www.google.com/s2/favicons?domain=${item.url}&sz=32`} 
            alt="Favicon" 
            class="w-8 h-8 rounded flex-shrink-0 mt-1"
            
          />
          <div class="flex-grow min-w-0">
            <h3 
              class="text-sm font-semibold text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer truncate"
              onclick={() => openURL(item.url)}
              title={item.title}
            >
              {item.title || "Sem título"}
            </h3>
            <p 
              class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 hover:text-blue-500 dark:hover:text-blue-300 cursor-pointer truncate"
              onclick={() => openURL(item.url)}
              title={item.url}
            >
              {item.url}
            </p>
          </div>
        </div>
        
        <!-- Corpo com Grupos, Tags e Conteúdo Principal -->
        <div class="p-3 flex-grow flex flex-col justify-between min-h-0">
          <div class="flex-shrink mb-2">
            <!-- Grupos com Carousel -->
            {#if item.groupIds && item.groupIds.length > 0}
              <Carousel.Root class="w-full max-w-xs mx-auto relative mb-2 group" opts={{ align: "start", dragFree: true }}>
                 <Carousel.Content class="-ml-1"> 
                   {#each item.groupIds as groupId}
                     <Carousel.Item class="pl-1 basis-auto"> 
                       {@const group = getGroupInfo(groupId)}
                       {@const bgColor = group.color || '#cccccc'}
                       {@const textColor = getTextColorForBackground(bgColor)}
                       <span
                         class="group-chip relative text-xs py-0.5 pl-2 pr-1.5 rounded-full flex items-center group whitespace-nowrap overflow-hidden flex-shrink-0 h-full"
                         style={`background-color: ${bgColor}; color: ${textColor};`}
                         title={group.name}
                       >
                         <Folder class="h-3 w-3 mr-1 opacity-75 flex-shrink-0" style={`fill: ${textColor};`} />
                         <span class="mr-1 flex-shrink-0">{group.name}</span>
                         <button
                           class="delete-group-btn inline-flex items-center justify-center p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 max-w-0 group-hover:max-w-4 transition-[max-width] duration-200 ease-in-out ml-1"
                           onclick={(e) => { e.stopPropagation(); removeItemFromGroup(item.id, groupId); }}
                           title="Remover do grupo"
                         >
                           <X class="h-3 w-3" style={`stroke: ${textColor}; stroke-width: 2.5;`} />
                         </button>
                       </span>
                     </Carousel.Item>
                   {/each}
                 </Carousel.Content>
                 <!-- Botões Previous/Next controlados por group-hover -->
                 {#if item.groupIds.length > 3} 
                    <!-- Adicionar opacity-0, group-hover:opacity-100 e transition-opacity -->
                   <Carousel.Previous class="absolute -left-2 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0"/>
                   <Carousel.Next class="absolute -right-2 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0"/>
                 {/if}
               </Carousel.Root>
            {/if}

            <!-- Tags com Carousel -->
            {#if item.tags && item.tags.length > 0}
              <Carousel.Root class="w-full max-w-xs mx-auto relative mb-2 group" opts={{ align: "start", dragFree: true }}>
                <Carousel.Content class="-ml-1">
                  {#if Array.isArray(item.tags)}
                    {#each item.tags as tag}
                      <Carousel.Item class="pl-1 basis-auto">
                        <div class="tag relative text-xs py-0.5 pl-2 pr-1.5 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center group whitespace-nowrap overflow-hidden flex-shrink-0 h-full" title={`Tag: ${tag}`}>
                          <Tag class="h-3 w-3 mr-1 opacity-75 flex-shrink-0" />
                          <span class="mr-1 flex-shrink-0">{tag}</span>
                          <div class="flex items-center max-w-0 group-hover:max-w-4 transition-[max-width] duration-200 ease-in-out ml-1">
                            <button
                              class="text-red-500 hover:text-red-600 dark:text-red-400 p-0.5"
                              onclick={() => removeTagFromItem(item, tag)}
                              title="Remover tag"
                            >
                              <X class="h-3 w-3" style="stroke-width: 2.5;" />
                            </button>
                          </div>
                        </div>
                      </Carousel.Item>
                    {/each}
                  {/if}
                </Carousel.Content>
                 {#if item.tags.length > 3} 
                   <!-- Adicionar opacity-0, group-hover:opacity-100 e transition-opacity -->
                   <Carousel.Previous class="absolute -left-2 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0"/>
                   <Carousel.Next class="absolute -right-2 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0"/>
                 {/if}
              </Carousel.Root>
            {/if}
          </div>
            
          <!-- Comentário com ScrollArea -->
          <div class="flex-grow mb-2 overflow-hidden">
            {#if item.comments}
              <ScrollArea class="h-16 w-full rounded-md border dark:border-gray-700 p-2">
                   <p class="text-xs text-gray-600 dark:text-gray-300">{item.comments}</p>
              </ScrollArea>
            {:else}
              <div class="h-16 flex items-center justify-center text-xs text-gray-400 italic border rounded-md dark:border-gray-700">
                Sem comentário
              </div>
            {/if}
          </div>

          <!-- Seção Inferior: Ler Mais Tarde / Adicionado em -->
          <div class="mt-auto pt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 border-t dark:border-gray-700">
            <!-- Ícone de Info (Adicionado em) - Sempre visível -->
            <Tooltip.Provider>
              <Tooltip.Root>
                <Tooltip.Trigger class="flex items-center cursor-default p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                  <Info class="h-3.5 w-3.5" />
                </Tooltip.Trigger>
                <Tooltip.Content>
                  Adicionado em: {formatDateAddedTooltip(item.dateAdded)}
                </Tooltip.Content>
              </Tooltip.Root>
            </Tooltip.Provider>
            
            <!-- Ícones da direita: Notas, Flashcards, Agendamento (se houver) e Ações -->
            <div class="flex items-center space-x-1">
              <!-- Botão/Contador de Notas -->
              <Tooltip.Provider>
                <Tooltip.Root>
                  <Tooltip.Trigger>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      class="h-6 w-6 relative"
                      onclick={() => viewNotes(item)}

                      aria-label="Notas"
                    >
                      <StickyNote class="h-4 w-4" />
                      {#if noteCount > 0}
                        <span class="absolute -top-1 -right-1 bg-blue-500 text-white text-[10px] font-bold rounded-full h-3.5 w-3.5 flex items-center justify-center leading-none">{noteCount}</span>
                      {/if}
                    </Button>
                  </Tooltip.Trigger>
                  <Tooltip.Content>
                    {noteCount === 0 ? 'Adicionar Nota' : noteCount === 1 ? '1 Nota' : `${noteCount} Notas`}
                  </Tooltip.Content>
                </Tooltip.Root>
              </Tooltip.Provider>

              <!-- Botão/Contador de Flashcards -->
              <Tooltip.Provider>
                <Tooltip.Root>
                  <Tooltip.Trigger>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      class="h-6 w-6 relative"
                      onclick={() => viewFlashcards(item)}

                      aria-label="Flashcards"
                    >
                      <Layers3 class="h-4 w-4" />
                      {#if flashcardCount > 0}
                         <span class="absolute -top-1 -right-1 bg-purple-500 text-white text-[10px] font-bold rounded-full h-3.5 w-3.5 flex items-center justify-center leading-none">{flashcardCount}</span>
                      {/if}
                    </Button>
                  </Tooltip.Trigger>
                  <Tooltip.Content>
                    {flashcardCount === 0 ? 'Adicionar Flashcard' : flashcardCount === 1 ? '1 Flashcard' : `${flashcardCount} Flashcards`}
                  </Tooltip.Content>
                </Tooltip.Root>
              </Tooltip.Provider>

              <!-- NOVO: Botão/Contador de Grupos -->
              <Tooltip.Provider>
                <Tooltip.Root>
                  <Tooltip.Trigger>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      class="h-6 w-6 relative"
                      onclick={() => { /* Placeholder para Gerenciar Grupos */ toast.info('Gerenciar Grupos (Não implementado)', { description: `Item: ${item.title}` }); }}
                      aria-label="Grupos"
                    >
                      <Folder class="h-4 w-4" />
                      {#if groupCount > 0}
                        <span class="absolute -top-1 -right-1 bg-gray-500 text-white text-[10px] font-bold rounded-full h-3.5 w-3.5 flex items-center justify-center leading-none">{groupCount}</span>
                      {/if}
                    </Button>
                  </Tooltip.Trigger>
                  <Tooltip.Content>
                    {groupCount === 0 ? 'Adicionar a Grupo' : groupCount === 1 ? '1 Grupo' : `${groupCount} Grupos`}
                  </Tooltip.Content>
                </Tooltip.Root>
              </Tooltip.Provider>

              <!-- NOVO: Botão/Contador de Tags com DIALOG DENTRO -->
              <Dialog.Root>
                 <Tooltip.Provider>
                   <Tooltip.Root>
                     <Dialog.Trigger>
                        <Tooltip.Trigger>
                           <Button 
                             variant="ghost" 
                             size="icon" 
                             class="h-6 w-6 relative"
                             aria-label="Tags"
                           >
                             <Tag class="h-4 w-4" />
                             {#if tagCount > 0}
                               <span class="absolute -top-1 -right-1 bg-teal-500 text-white text-[10px] font-bold rounded-full h-3.5 w-3.5 flex items-center justify-center leading-none">{tagCount}</span>
                             {/if}
                           </Button>
                       </Tooltip.Trigger>
                      </Dialog.Trigger>
                     <Tooltip.Content>
                       {tagCount === 0 ? 'Adicionar Tag' : tagCount === 1 ? '1 Tag' : `${tagCount} Tags`}
                     </Tooltip.Content>
                   </Tooltip.Root>
                 </Tooltip.Provider>
                 <!-- MOVIDO: Conteúdo do Dialog para cá -->
                 <Dialog.Content class="sm:max-w-[425px]">
                   <Dialog.Header>
                     <Dialog.Title>Gerenciar Tags para</Dialog.Title>
                     <!-- Usar 'item' do loop -->
                     <Dialog.Description class="truncate text-xs text-muted-foreground pt-1" title={item.title}> {item.title || item.url}</Dialog.Description>
                   </Dialog.Header>
                   <div class="grid gap-4 py-4">
                     <!-- Input para adicionar nova tag -->
                     <div class="flex items-center space-x-2">
                       <Input 
                         id="new-tag-input-{item.id}" 
                         placeholder="Adicionar nova tag..." 
                         bind:value={newTagInput} 
                         onkeydown={(e) => { if(e.key === 'Enter') { saveNewTag(item); newTagInput='';} }}
                       />
                       <Button onclick={() => { saveNewTag(item); newTagInput=''; }} disabled={!newTagInput.trim()}>Adicionar</Button>
                     </div>
                     
                     <!-- Lista de tags existentes -->
                     <div class="text-sm font-medium mb-1">Tags Atuais:</div>
                     {#if item.tags && item.tags.length > 0}
                       <ScrollArea class="h-32 w-full rounded-md border p-2">
                           <div class="flex flex-wrap gap-2">
                           {#each item.tags as tag}
                               <div class="tag relative text-xs py-0.5 pl-2 pr-1.5 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center whitespace-nowrap overflow-hidden flex-shrink-0" title={`Tag: ${tag}`}>
                               <Tag class="h-3 w-3 mr-1 opacity-75 flex-shrink-0" />
                               <span class="mr-1 flex-shrink-0">{tag}</span>
                               <button
                                   class="text-red-500 hover:text-red-600 dark:text-red-400 p-0.5 ml-1"
                                   onclick={() => removeTagFromItem(item, tag)}
                                   title="Remover tag"
                               >
                                   <X class="h-3 w-3" style="stroke-width: 2.5;" />
                               </button>
                               </div>
                           {/each}
                           </div>
                       </ScrollArea>
                     {:else}
                       <p class="text-xs text-muted-foreground italic">Nenhuma tag adicionada.</p>
                     {/if}
                   </div>
                 </Dialog.Content>
               </Dialog.Root> 
               <!-- FIM DO DIALOG DE TAGS -->

              <!-- Ícone de Agendamento (Ler Mais Tarde) - Apenas se estiver agendado -->
              {#if item.readLater && item.scheduledDate}
                <Tooltip.Provider>
                  <Tooltip.Root>
                    <Tooltip.Trigger>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        class="h-6 w-6 text-orange-500 hover:text-orange-600 dark:text-orange-400 dark:hover:text-orange-300" 
                        onclick={() => editSchedule(item)}
  
                        aria-label="Editar agendamento"
                      >
                        <CalendarClock class="h-4 w-4" />
                      </Button>
                    </Tooltip.Trigger>
                    <Tooltip.Content>
                      {formatScheduleTooltip(item.scheduledDate)}
                    </Tooltip.Content>
                  </Tooltip.Root>
                </Tooltip.Provider>
              {/if}

              <!-- Botão Dropdown de Ações -->
              <DropdownMenu.Root>
                <DropdownMenu.Trigger>
                  <Button variant="ghost" size="icon" class="h-6 w-6">
                    <Edit class="h-4 w-4" />
                    <span class="sr-only">Ações</span>
                  </Button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content align="end">
                  <DropdownMenu.Label>Ações do Item</DropdownMenu.Label>
                  <DropdownMenu.Separator />
                  <DropdownMenu.Item onclick={() => openURL(item.url)}>Abrir Link</DropdownMenu.Item>
                  <DropdownMenu.Item onclick={() => { /* Lógica para Editar Item */ toast.info('Edição de item ainda não implementada.'); }}>Editar Detalhes</DropdownMenu.Item>
                  <DropdownMenu.Sub>
                    <DropdownMenu.SubTrigger>
                      <Tags class="mr-2 h-4 w-4" />
                      <span>Gerenciar Tags</span>
                    </DropdownMenu.SubTrigger>
                    <DropdownMenu.SubContent>
                      <DropdownMenu.Label>Tags</DropdownMenu.Label>
                       {#if item.tags && item.tags.length > 0}
                         {#each item.tags as tag}
                           <DropdownMenu.Item onclick={() => removeTagFromItem(item, tag)}>Remover "{tag}"</DropdownMenu.Item>
                         {/each}
                         <DropdownMenu.Separator />
                       {/if}
                    </DropdownMenu.SubContent>
                  </DropdownMenu.Sub>
                  <DropdownMenu.Item onclick={() => { /* Lógica para Gerenciar Grupos */ toast.info('Gerenciamento de grupos ainda não implementado aqui.'); }}>Gerenciar Grupos</DropdownMenu.Item>
                   <DropdownMenu.Item onclick={() => { /* Lógica para Agendar */ toast.info('Agendamento ainda não implementado aqui.'); }}>Agendar Leitura</DropdownMenu.Item>
                   <DropdownMenu.Separator />
                   <DropdownMenu.Item class="text-red-600 dark:text-red-500 focus:bg-red-100 dark:focus:bg-red-900/50 focus:text-red-700 dark:focus:text-red-400" onclick={() => deleteItem(item.id)}>
                     <Trash2 class="mr-2 h-4 w-4" />
                     Excluir Item
                   </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Root>
            </div>
          </div>
        </div>
      </div>
    {/each}
    {#if data.length === 0}
      <p class="col-span-full text-center text-gray-500 dark:text-gray-400 py-10">Nenhum item encontrado.</p>
    {/if}
  </div> 