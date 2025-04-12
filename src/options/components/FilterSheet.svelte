<script lang="ts">
  import type { Group } from '../../types';
  import type { DateRange } from 'bits-ui';
  import { toast } from "svelte-sonner";
  import { format } from 'date-fns';
  import { ptBR } from "date-fns/locale";
  import { getLocalTimeZone, type DateValue } from "@internationalized/date";
  import { cn } from "../../lib/utils";

  // Importações de UI Shadcn/Lucide (copiadas de SavedItemsView)
  import { Button } from "../../lib/components/ui/button/index.js";
  import * as Sheet from "../../lib/components/ui/sheet/index.js";
  import { Separator } from "../../lib/components/ui/separator/index.js";
  import * as Popover from "../../lib/components/ui/popover/index.js";
  import { RangeCalendar } from "../../lib/components/ui/range-calendar/index.js";
  import * as Select from "../../lib/components/ui/select/index.js";
  import * as DropdownMenu from "../../lib/components/ui/dropdown-menu/index.js";
  import {
      Tags, Folder, Edit, Trash2, FilterX, CalendarIcon, ArrowUp, ArrowDown, Plus, Save, Trash, ChevronDown, Check, FolderOpen, Info, X
  } from "@lucide/svelte";
  import { Input } from "../../lib/components/ui/input/index.js";
  import * as Tooltip from "../../lib/components/ui/tooltip/index.js";
  import { ScrollArea } from "../../lib/components/ui/scroll-area/index.js";

  // Definir tipo SortDescriptor (pode ser movido para types.ts eventualmente)
  type SortDescriptor = {
    criterion: string;
    direction: 'asc' | 'desc';
  };

  // --- NOVO: Tipos para Filtros Nomeados (espelhar SavedItemsView) ---
  type FilterSettings = {
    searchQuery: string;
    searchScope: 'content' | 'tags' | 'groups';
    includedTags: string[];
    excludedTags: string[];
    tagMatchLogic: 'AND' | 'OR';
    includedGroups: string[];
    excludedGroups: string[];
    groupMatchLogic: 'AND' | 'OR';
    selectedDateRange?: { start?: string; end?: string; };
    sortDescriptors: SortDescriptor[];
  };
  type NamedFilterSet = {
    id: string;
    name: string;
    settings: FilterSettings;
  };
  // --- Fim Tipos Filtros Nomeados ---

  type Props = {
    open: boolean;
    includedTags: string[];
    excludedTags: string[];
    includedGroups: string[];
    excludedGroups: string[];
    selectedDateRange: DateRange | undefined;
    sortDescriptors: SortDescriptor[];
    searchQuery: string;
    availableTags: string[];
    availableGroups: Group[];
    namedFilterSets: NamedFilterSet[];

    // Callbacks
    onClose: () => void;
    onTagFilterOpen: () => void;
    onGroupFilterOpen: () => void;
    onDateChange: (range: DateRange | undefined) => void;
    onClearFilters: () => void;
    onOpenSaveFilterDialog: () => void;
    onOpenLoadFilterDialog: () => void;
    onOpenManageGroupsDialog: () => void;
    onOpenManageTagsDialog: () => void;
  };

  let { 
    open,
    includedTags,
    excludedTags,
    includedGroups,
    excludedGroups,
    selectedDateRange,
    sortDescriptors = $bindable(),
    searchQuery,
    availableTags,
    availableGroups,
    namedFilterSets,
    onClose,
    onTagFilterOpen,
    onGroupFilterOpen,
    onDateChange,
    onClearFilters,
    onOpenSaveFilterDialog,
    onOpenLoadFilterDialog,
    onOpenManageGroupsDialog,
    onOpenManageTagsDialog
   } = $props();

   function toDateOrNull(dateValue: DateValue | undefined): Date | null {
    return dateValue ? dateValue.toDate(getLocalTimeZone()) : null;
  }

  // Derivado para botão Limpar Tudo
  let hasActiveFilters = $derived(
      searchQuery || 
      includedTags.length > 0 || 
      excludedTags.length > 0 || 
      includedGroups.length > 0 || 
      excludedGroups.length > 0 || 
      selectedDateRange
  );

  // Função para adicionar um novo nível de ordenação
  function addSortLevel() {
    // Adiciona um padrão (ex: Título Ascendente)
    // Poderia ser mais inteligente e sugerir um critério não usado
    sortDescriptors = [...sortDescriptors, { criterion: 'title', direction: 'asc' }];
  }

  // Função para remover um nível de ordenação
  function removeSortLevel(index: number) {
    if (sortDescriptors.length > 1) { // Só permite remover se houver mais de um nível
      sortDescriptors = sortDescriptors.filter((_: SortDescriptor, i: number) => i !== index);
    }
  }

  // Opções de critério (para os Selects)
  const sortCriteriaOptions = [
    { value: "dateAdded", label: "Data Adição" },
    { value: "title", label: "Título" },
    { value: "url", label: "URL" },
    { value: "scheduledDate", label: "Data Agendada" },
    { value: "noteCount", label: "Nº Notas" },
    { value: "flashcardCount", label: "Nº Flashcards" },
  ];

</script>

<Sheet.Root bind:open onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
    <Sheet.Content side="right" class="w-[300px] sm:w-[400px] flex flex-col p-3 space-y-0">
      <Sheet.Header>
        <Sheet.Title>Filtros e Ordenação</Sheet.Title>
        <Sheet.Description>
          Refine sua visualização de itens salvos.
        </Sheet.Description>
      </Sheet.Header>

      <div class="py-1 space-y-3 flex-grow overflow-y-auto px-1">
        <Separator />
         <div>
            <div class="flex items-center gap-1 mb-2">
              <h4 class="text-sm font-medium leading-none">Filtros</h4>
              <Tooltip.Provider><Tooltip.Root delayDuration={100}>
                <Tooltip.Trigger class="cursor-help">
                   <Info class="h-3.5 w-3.5 text-muted-foreground" />
                </Tooltip.Trigger>
                <Tooltip.Content side="top"><p class="max-w-xs">Clique nos botões abaixo para abrir diálogos<br/>e selecionar Tags ou Grupos para incluir ou excluir<br/>da sua visualização.</p></Tooltip.Content>
              </Tooltip.Root></Tooltip.Provider>
            </div>
             <div class="flex gap-2">
                  <!-- {/* Botão para abrir Diálogo de Filtro de Tags */} -->
                  <Button variant="outline" class="w-full justify-between" onclick={onTagFilterOpen}>
                    <span>
                       Tags
                      {#if includedTags.length > 0 || excludedTags.length > 0}
                          <span class="ml-1.5 text-xs text-muted-foreground">({includedTags.length} Inc / {excludedTags.length} Exc)</span>
                      {/if}
                    </span>
                    <Tags class="ml-2 h-4 w-4 opacity-50"/> 
                  </Button>

                  <!-- {/* Botão para abrir Diálogo de Filtro de Grupos */} -->
                  <Button variant="outline" class="w-full justify-between" onclick={onGroupFilterOpen}>
                       <span>
                          Grupos
                          {#if includedGroups.length > 0 || excludedGroups.length > 0}
                              <span class="ml-1.5 text-xs text-muted-foreground">({includedGroups.includes('NO_GROUP') ? '0*' : includedGroups.length} Inc / {excludedGroups.length} Exc)</span>
                          {/if}
                      </span>
                     <Folder class="ml-2 h-4 w-4 opacity-50"/>
                  </Button>
             </div>
         </div>
        <Separator />
         <div> 
            <div class="flex items-center gap-1 mb-2">
               <h4 class="text-sm font-medium leading-none">Data de Adição</h4>
               <Tooltip.Provider><Tooltip.Root delayDuration={100}>
                <Tooltip.Trigger class="cursor-help">
                   <Info class="h-3.5 w-3.5 text-muted-foreground" />
                </Tooltip.Trigger>
                <Tooltip.Content side="top"><p class="max-w-xs">Selecione um intervalo de datas para filtrar<br/>os itens pela data em que foram adicionados.</p></Tooltip.Content>
              </Tooltip.Root></Tooltip.Provider>
            </div>
            <Popover.Root>
              <Popover.Trigger>
                <Button variant="outline" class={cn("w-full justify-start text-left font-normal", !selectedDateRange && "text-muted-foreground")}>
                  <CalendarIcon class="mr-2 h-4 w-4" />
                  {@const startDate = toDateOrNull(selectedDateRange?.start)}
                  {@const endDate = toDateOrNull(selectedDateRange?.end)}
                  {#if startDate}
                    {#if endDate} {format(startDate, "dd/MM/yy", { locale: ptBR })} - {format(endDate, "dd/MM/yy", { locale: ptBR })} {:else} {format(startDate, "dd/MM/yy", { locale: ptBR })} {/if}
                  {:else} <span>Selecione um período</span> {/if}
                </Button>
              </Popover.Trigger>
              <Popover.Content class="w-auto p-0" align="start">
                <RangeCalendar value={selectedDateRange} onValueChange={onDateChange} locale="pt-BR" numberOfMonths={1} /> 
              </Popover.Content>
            </Popover.Root>
         </div>

        <Separator />
         <div> 
            <div class="flex items-center justify-between mb-2">
               <div class="flex items-center gap-1">
                 <h4 class="text-sm font-medium leading-none">Ordenação</h4>
                 <Tooltip.Provider><Tooltip.Root delayDuration={100}>
                   <Tooltip.Trigger class="cursor-help">
                      <Info class="h-3.5 w-3.5 text-muted-foreground" />
                   </Tooltip.Trigger>
                   <Tooltip.Content side="top"><p class="max-w-xs">Defina um ou mais critérios para ordenar a lista de itens.<br/>A ordenação é aplicada sequencialmente.</p></Tooltip.Content>
                 </Tooltip.Root></Tooltip.Provider>
               </div>

               <Tooltip.Provider><Tooltip.Root delayDuration={100}>
                   <Tooltip.Trigger>
                       <Button 
                         variant="ghost" 
                         size="icon" 
                         class="h-8 w-8 flex-shrink-0"
                         onclick={addSortLevel}
                         disabled={sortDescriptors.length >= 3}
                         aria-label="Adicionar Nível de Ordenação"
                       >
                         <Plus class="h-4 w-4" />
                       </Button>
                   </Tooltip.Trigger>
                   <Tooltip.Content side="top"><p>Adicionar Nível de Ordenação</p></Tooltip.Content>
               </Tooltip.Root></Tooltip.Provider>
             </div>
             
             <ScrollArea class="h-[160px] rounded-md border p-2">
               <div class="space-y-1">
                 {#if sortDescriptors.length === 0}
                   <p class="text-sm text-muted-foreground text-center py-4">Clique em '+' para adicionar um critério.</p>
                 {:else}
                   {#each sortDescriptors as descriptor, index (descriptor.criterion + index)} 
                     <div class="flex items-center gap-1">
                       <Select.Root
                         type="single"
                         value={descriptor.criterion}
                         onValueChange={(value: string | null) => {
                           if (value) {
                             sortDescriptors[index].criterion = value;
                             sortDescriptors = sortDescriptors; 
                           }
                         }}
                       >
                         <Select.Trigger class="flex-grow">
                           {sortCriteriaOptions.find(opt => opt.value === descriptor.criterion)?.label || 'Critério...'}
                </Select.Trigger>
                <Select.Content>
                           {#each sortCriteriaOptions as option}
                             <Select.Item value={option.value}>{option.label}</Select.Item>
                           {/each}
                </Select.Content>
              </Select.Root>
                       
                       <Select.Root
                         type="single"
                         value={descriptor.direction}
                         onValueChange={(value: string | null) => {
                            if (value && (value === 'asc' || value === 'desc')) {
                              sortDescriptors[index].direction = value;
                              sortDescriptors = sortDescriptors; 
                            }
                         }}
                       >
                         <Select.Trigger class="w-[110px]">
                            {descriptor.direction === 'asc' ? 'Ascendente' : 'Descendente'}
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value="asc">Ascendente</Select.Item>
                  <Select.Item value="desc">Descendente</Select.Item>
                </Select.Content>
              </Select.Root>

                       <Button 
                         variant="ghost" 
                         size="icon" 
                         class="h-8 w-8 flex-shrink-0"
                         onclick={() => removeSortLevel(index)}
                         disabled={sortDescriptors.length <= 1}
                         aria-label="Remover Nível"
                       >
                         <Trash2 class="h-4 w-4 text-muted-foreground" />
                       </Button>
                     </div>
                   {/each}
                 {/if}
            </div>
             </ScrollArea>
         </div>

        <Separator />
         <div> 
            <div class="flex items-center gap-1 mb-4">
               <h4 class="text-sm font-medium leading-none">Gerenciamento Global</h4>
               <Tooltip.Provider><Tooltip.Root delayDuration={100}>
                 <Tooltip.Trigger class="cursor-help">
                    <Info class="h-3.5 w-3.5 text-muted-foreground" />
                 </Tooltip.Trigger>
                 <Tooltip.Content side="top"><p class="max-w-xs">Gerencie todos os Grupos e Tags existentes no sistema,<br/>renomeando ou removendo-os globalmente.</p></Tooltip.Content>
               </Tooltip.Root></Tooltip.Provider>
            </div>
             <div class="grid grid-cols-2 gap-2">
                <!-- {/* Botão Gerenciar Grupos */} -->
                <Button
                  variant="outline"
                  class="w-full justify-start" 
                  onclick={onOpenManageGroupsDialog}
                  disabled={!availableGroups || availableGroups.length === 0}
                >
                  <Folder class="mr-2 h-4 w-4" />
                  Grupos ({availableGroups?.length ?? 0})
                </Button>
          
                <!-- {/* Botão Gerenciar Tags */} -->
                <Button 
                  variant="outline" 
                  class="w-full justify-start" 
                  onclick={onOpenManageTagsDialog}
                  disabled={availableTags.length === 0}
                > 
                     <Tags class="mr-2 h-4 w-4" />
                      Tags ({availableTags.length})
                   </Button>
             </div>
         </div>

      </div> 

      <Sheet.Footer class="mt-auto grid grid-cols-4 gap-1 pt-4 border-t">
          <!-- {/* Novos Botões na primeira linha */}  -->
          <Tooltip.Provider><Tooltip.Root delayDuration={100}>
            <Tooltip.Trigger>
              <Button variant="outline" size="icon" class="h-9 w-full" onclick={onOpenSaveFilterDialog} aria-label="Salvar Filtro Atual">
                <Save class="h-4 w-4" />
              </Button>
            </Tooltip.Trigger>
            <Tooltip.Content side="top"><p><b>Salvar Filtro Atual</b><br/>Abre um diálogo para nomear e salvar<br/>o conjunto atual de filtros e ordenação.</p></Tooltip.Content>
          </Tooltip.Root></Tooltip.Provider>
           <Tooltip.Provider><Tooltip.Root delayDuration={100}>
             <Tooltip.Trigger>
                <Button variant="outline" size="icon" class="h-9 w-full" onclick={onOpenLoadFilterDialog} disabled={namedFilterSets.length === 0} aria-label="Carregar/Gerenciar Filtros Salvos">
                  <FolderOpen class="h-4 w-4" />
                </Button>
             </Tooltip.Trigger>
             <Tooltip.Content side="top"><p><b>Carregar/Gerenciar Filtros</b><br/>Abre um diálogo para aplicar ou excluir<br/>filtros que você salvou anteriormente.</p></Tooltip.Content>
           </Tooltip.Root></Tooltip.Provider>
           <!-- {/* Botões existentes na segunda linha */}  -->
          <Tooltip.Provider><Tooltip.Root delayDuration={100}>
            <Tooltip.Trigger>
               <Button variant="outline" size="icon" class="h-9 w-full" onclick={onClearFilters}
                   disabled={!hasActiveFilters && sortDescriptors.length === 1 && sortDescriptors[0].criterion === 'dateAdded' && sortDescriptors[0].direction === 'desc'} aria-label="Limpar Tudo">
                   <FilterX class="h-4 w-4"/>
          </Button>
            </Tooltip.Trigger>
            <Tooltip.Content side="top"><p><b>Limpar Tudo</b><br/>Redefine todos os filtros e a ordenação<br/>para os valores padrão.</p></Tooltip.Content>
          </Tooltip.Root></Tooltip.Provider>
          <Tooltip.Provider><Tooltip.Root delayDuration={100}>
            <Tooltip.Trigger>
          <Sheet.Close>
                 <Button variant="outline" size="icon" class="h-9 w-full px-2" aria-label="Fechar Painel">
                    Fechar
                 </Button>
        </Sheet.Close>
            </Tooltip.Trigger>
            <Tooltip.Content side="top"><p><b>Fechar</b><br/>Fecha este painel lateral.</p></Tooltip.Content>
          </Tooltip.Root></Tooltip.Provider>
      </Sheet.Footer>
    </Sheet.Content>
</Sheet.Root> 