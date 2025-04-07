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
  import * as Popover from "../../../lib/components/ui/popover/index.js";
  import { onMount, onDestroy } from 'svelte'; // Precisaremos para ResizeObserver

  // Props recebidos de SavedItemsView
  let { data, groups: allGroups }: { data: SavedItem[], groups: Group[] } = $props();

  // Estados locais para edição/adição de tags (podem ser movidos para um store se necessário)
  let editingTagItem = $state<SavedItem | null>(null);
  let editTagInput = $state("");
  let addingTagItem = $state<SavedItem | null>(null);
  let newTagInput = $state("");

  // --- NOVO ESTADO PARA VISIBILIDADE DAS PILLS ---
  let groupContainerRefs: { [id: string]: HTMLDivElement | undefined } = $state({});
  let tagContainerRefs: { [id: string]: HTMLDivElement | undefined } = $state({});

  let visibleGroupsMap = $state<{ [id: string]: string[] }>({});
  let hiddenGroupCountMap = $state<{ [id: string]: number }>({});
  let visibleTagsMap = $state<{ [id: string]: string[] }>({});
  let hiddenTagCountMap = $state<{ [id: string]: number }>({});

  // Para gerenciar ResizeObservers
  let resizeObservers: { [id: string]: ResizeObserver } = {};

  // Função para calcular pills visíveis (será definida depois)
  function calculateVisiblePills(itemId: string) {
    const groupContainer = groupContainerRefs[itemId];
    const tagContainer = tagContainerRefs[itemId];
    const item = data.find(i => i.id === itemId);
    if (!item) return;

    // Lógica de cálculo para grupos
    if (groupContainer && item.groupIds?.length) {
      const containerWidth = groupContainer.clientWidth;
      const pillElements = groupContainer.querySelectorAll<HTMLElement>(':scope > div > .group-chip'); // Seleciona as pills dentro do container flex
      let currentWidth = 0;
      let visibleCount = 0;
      const gap = 4; // Tailwind gap-1 = 0.25rem = 4px (aproximado)

      for (let i = 0; i < pillElements.length; i++) {
        const pillWidth = pillElements[i].offsetWidth;
        // Considera o espaço para o indicador "+X" se houver mais pills
        const spaceForIndicator = (i + 1 < pillElements.length) ? 40 : 0; // Estimar largura do "+X"
        if (currentWidth + pillWidth + (i > 0 ? gap : 0) + spaceForIndicator <= containerWidth) {
          currentWidth += pillWidth + (i > 0 ? gap : 0);
          visibleCount++;
        } else {
          break; // Não cabe mais
        }
      }
      visibleGroupsMap[itemId] = item.groupIds.slice(0, visibleCount);
      hiddenGroupCountMap[itemId] = item.groupIds.length - visibleCount;
    } else {
      visibleGroupsMap[itemId] = item?.groupIds ?? [];
      hiddenGroupCountMap[itemId] = 0;
    }

    // Lógica de cálculo para tags (similar)
    if (tagContainer && item.tags?.length) {
      const containerWidth = tagContainer.clientWidth;
      // Seleciona as pills de tag (considerando o wrapper extra se houver)
      const pillElements = tagContainer.querySelectorAll<HTMLElement>(':scope > div > .tag');
      let currentWidth = 0;
      let visibleCount = 0;
      const gap = 4; // Tailwind gap-1

      for (let i = 0; i < pillElements.length; i++) {
        const pillWidth = pillElements[i].offsetWidth;
        const spaceForIndicator = (i + 1 < pillElements.length) ? 40 : 0;
        if (currentWidth + pillWidth + (i > 0 ? gap : 0) + spaceForIndicator <= containerWidth) {
          currentWidth += pillWidth + (i > 0 ? gap : 0);
          visibleCount++;
        } else {
          break;
        }
      }

      // Verifica se item.tags existe e é um array antes de usar slice
      if (Array.isArray(item.tags)) {
        visibleTagsMap[itemId] = item.tags.slice(0, visibleCount);
        hiddenTagCountMap[itemId] = item.tags.length - visibleCount;
      } else {
        visibleTagsMap[itemId] = [];
        hiddenTagCountMap[itemId] = 0;
      }

    } else {
      visibleTagsMap[itemId] = Array.isArray(item?.tags) ? item.tags : [];
      hiddenTagCountMap[itemId] = 0;
    }
  }

  // Efeito para recalcular quando os containers ou dados mudarem
  $effect(() => {
    // Limpa observadores antigos ao recarregar dados/componentes
    Object.values(resizeObservers).forEach(observer => observer.disconnect());
    resizeObservers = {};

    for (const item of data) {
      const itemId = item.id;
      const groupContainer = groupContainerRefs[itemId];
      const tagContainer = tagContainerRefs[itemId];

      const setupObserver = (element: HTMLElement, id: string) => {
        if (resizeObservers[id]) {
          resizeObservers[id].disconnect();
        }
        const observer = new ResizeObserver(() => {
          // Atraso pequeno para garantir que o DOM esteja estável após redimensionamento
          requestAnimationFrame(() => calculateVisiblePills(id.split('-')[0])); // Extrai itemId
        });
        observer.observe(element);
        resizeObservers[id] = observer;
        // Cálculo inicial
        requestAnimationFrame(() => calculateVisiblePills(id.split('-')[0])); // Extrai itemId
      };

      if (groupContainer) {
        setupObserver(groupContainer, `${itemId}-groups`);
      }
      if (tagContainer) {
        setupObserver(tagContainer, `${itemId}-tags`);
      }
    }
    // Limpeza quando o componente é destruído
    return () => {
      Object.values(resizeObservers).forEach(observer => observer.disconnect());
    };
  });

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
  
  function editTag(item: SavedItem, tag: string) {
    editingTagItem = item;
    editTagInput = tag;
  }
  
  function saveEditedTag(item: SavedItem, oldTag: string) {
    if (!editTagInput.trim()) {
      cancelEditTag();
      return;
    }
    
    const newTag = editTagInput.trim();
    
    savedItems.update(items => {
      return items.map(i => {
        if (i.id === item.id) {
          return {
            ...i,
            tags: i.tags.map(tag => 
              tag === oldTag ? newTag : tag
            )
          };
        }
        return i;
      });
    });
    
    toast.success(`Tag "${oldTag}" alterada para "${newTag}".`);
    cancelEditTag();
  }
  
  function cancelEditTag() {
    editingTagItem = null;
    editTagInput = "";
  }
  
  function startAddingTag(item: SavedItem) {
    addingTagItem = item;
    newTagInput = "";
  }
  
  function saveNewTag(item: SavedItem) {
    if (!newTagInput.trim()) {
      cancelAddTag();
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
    cancelAddTag();
  }
  
  function cancelAddTag() {
    addingTagItem = null;
    newTagInput = "";
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
      <!-- Derivados reativos para este item -->
      {@const visibleGroupIds = visibleGroupsMap[item.id] ?? item.groupIds ?? []}
      {@const hiddenGroupCount = hiddenGroupCountMap[item.id] ?? 0}
      {@const visibleItemTags = visibleTagsMap[item.id] ?? (Array.isArray(item.tags) ? item.tags : [])}
      {@const hiddenTagCount = hiddenTagCountMap[item.id] ?? 0}

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
            <!-- Grupos -->
            {#if item.groupIds && item.groupIds.length > 0}
              <!-- Container com bind:this -->
              <div bind:this={groupContainerRefs[item.id]} class="overflow-hidden pb-1 mb-2 hide-scrollbar">
                <div class="flex gap-1 whitespace-nowrap items-center">
                  <!-- Loop pelas pills visíveis -->
                  {#each visibleGroupIds as groupId}
                    {@const group = getGroupInfo(groupId)}
                    {@const bgColor = group.color || '#cccccc'}
                    {@const textColor = getTextColorForBackground(bgColor)}
                    <span
                      class="group-chip relative text-xs py-0.5 pl-2 pr-1.5 rounded-full flex items-center group whitespace-nowrap overflow-hidden flex-shrink-0"
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
                  {/each}

                  <!-- Indicador "+X" e Popover para Grupos -->
                  {#if hiddenGroupCount > 0}
                    <Popover.Root>
                      <Popover.Trigger>
                         <button
                          class="text-xs px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500 flex-shrink-0"
                          title={`Mais ${hiddenGroupCount} grupo(s)`}
                        >
                          +{hiddenGroupCount}
                        </button>
                      </Popover.Trigger>
                      <Popover.Content class="w-auto p-2 max-h-48 overflow-y-auto">
                        <div class="text-sm font-semibold mb-2">Todos os Grupos</div>
                        <div class="flex flex-col gap-1">
                           {#each item.groupIds as groupId}
                              {@const group = getGroupInfo(groupId)}
                              {@const bgColor = group.color || '#cccccc'}
                              {@const textColor = getTextColorForBackground(bgColor)}
                              <span
                                class="group-chip relative text-xs py-0.5 pl-2 pr-1.5 rounded-full flex items-center group whitespace-nowrap overflow-hidden"
                                style={`background-color: ${bgColor}; color: ${textColor};`}
                                title={group.name}
                              >
                                <Folder class="h-3 w-3 mr-1 opacity-75 flex-shrink-0" style={`fill: ${textColor};`} />
                                <span class="mr-1 flex-shrink-0">{group.name}</span>
                                <button
                                  class="delete-group-btn inline-flex items-center justify-center p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 ml-auto"
                                  onclick={(e) => { e.stopPropagation(); removeItemFromGroup(item.id, groupId); }}
                                  title="Remover do grupo"
                                >
                                  <X class="h-3 w-3" style={`stroke: ${textColor}; stroke-width: 2.5;`} />
                                </button>
                              </span>
                           {/each}
                        </div>
                      </Popover.Content>
                    </Popover.Root>
                  {/if}
                </div>
              </div>
            {/if}
            
            <!-- Tags -->
             <!-- Container com bind:this -->
            <div bind:this={tagContainerRefs[item.id]} class="overflow-hidden pb-1 mb-2 hide-scrollbar">
              <div class="flex flex-wrap gap-1 whitespace-nowrap items-center">
                <!-- Loop pelas pills visíveis -->
                {#if Array.isArray(visibleItemTags)}
                   {#each visibleItemTags as tag}
                      {#if editingTagItem?.id === item.id && editTagInput === tag}
                         <input 
                           type="text" 
                           bind:value={editTagInput} 
                           onblur={() => saveEditedTag(item, tag)}
                           onkeydown={(e) => e.key === 'Enter' && saveEditedTag(item, tag)}
                           class="text-xs p-1 border rounded flex-shrink-0"
                           autofocus
                         />
                      {:else}
                         <div class="tag relative text-xs py-0.5 pl-2 pr-1.5 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center group whitespace-nowrap overflow-hidden flex-shrink-0" title={`Tag: ${tag}`}>
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
                      {/if}
                   {/each}
                {/if}

                 <!-- Indicador "+X" e Popover para Tags -->
                 {#if hiddenTagCount > 0}
                   <Popover.Root>
                     <Popover.Trigger>
                        <button
                         class="text-xs px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500 flex-shrink-0"
                         title={`Mais ${hiddenTagCount} tag(s)`}
                       >
                         +{hiddenTagCount}
                       </button>
                     </Popover.Trigger>
                     <Popover.Content class="w-auto p-2 max-h-48 overflow-y-auto">
                       <div class="text-sm font-semibold mb-2">Todas as Tags</div>
                       <div class="flex flex-col gap-1">
                          {#if Array.isArray(item.tags)}
                             {#each item.tags as tag}
                               <div class="tag relative text-xs py-0.5 pl-2 pr-1.5 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center group whitespace-nowrap overflow-hidden" title={`Tag: ${tag}`}>
                                 <Tag class="h-3 w-3 mr-1 opacity-75 flex-shrink-0" />
                                 <span class="mr-1 flex-shrink-0">{tag}</span>
                                 <button
                                   class="text-red-500 hover:text-red-600 dark:text-red-400 p-0.5 ml-auto"
                                   onclick={() => removeTagFromItem(item, tag)}
                                   title="Remover tag"
                                 >
                                   <X class="h-3 w-3" style="stroke-width: 2.5;" />
                                 </button>
                               </div>
                             {/each}
                          {/if}
                       </div>
                     </Popover.Content>
                   </Popover.Root>
                 {/if}
              </div>
            </div>
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
                       <DropdownMenu.Item onclick={() => startAddingTag(item)}>Adicionar Nova Tag...</DropdownMenu.Item>
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
          
          <!-- Input para adicionar nova tag (aparece condicionalmente) -->
          {#if addingTagItem?.id === item.id}
            <div class="mt-2">
              <input 
                type="text" 
                placeholder="Nova tag..." 
                bind:value={newTagInput}
                onkeydown={(e) => e.key === 'Enter' && saveNewTag(item)}
                onblur={cancelAddTag} 
                class="text-xs p-1 border rounded w-full"
                autofocus
              />
            </div>
          {/if}
        </div>
      </div>
    {/each}
    {#if data.length === 0}
      <p class="col-span-full text-center text-gray-500 dark:text-gray-400 py-10">Nenhum item encontrado.</p>
    {/if}
  </div> 