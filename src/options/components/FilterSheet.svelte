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
      Tags, Folder, Edit, Trash2, FilterX, CalendarIcon
  } from "@lucide/svelte";

  type Props = {
    open: boolean;
    includedTags: string[];
    excludedTags: string[];
    includedGroups: string[];
    excludedGroups: string[];
    selectedDateRange: DateRange | undefined;
    currentSortCriterion: string;
    currentSortDirection: string;
    searchQuery: string; // Necessário para habilitar/desabilitar "Limpar Tudo"
    availableTags: string[];
    availableGroups: Group[];

    // Callbacks
    onClose: () => void;
    onTagFilterOpen: () => void;
    onGroupFilterOpen: () => void;
    onDateChange: (range: DateRange | undefined) => void;
    onSortCriterionChange: (criterion: string) => void;
    onSortDirectionChange: (direction: string) => void;
    onClearFilters: () => void;
    onManageGroupClick: () => void;
    onEditTagClick: (tag: string) => void;
    onRemoveTagClick: (tag: string) => void;
    onRemoveAllTagsClick: () => void;
  };

  let { 
    open,
    includedTags,
    excludedTags,
    includedGroups,
    excludedGroups,
    selectedDateRange,
    currentSortCriterion,
    currentSortDirection,
    searchQuery,
    availableTags,
    availableGroups,
    onClose,
    onTagFilterOpen,
    onGroupFilterOpen,
    onDateChange,
    onSortCriterionChange,
    onSortDirectionChange,
    onClearFilters,
    onManageGroupClick,
    onEditTagClick,
    onRemoveTagClick,
    onRemoveAllTagsClick
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

</script>

<Sheet.Root bind:open onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
    <Sheet.Content side="right" class="w-[300px] sm:w-[400px] flex flex-col">
      <Sheet.Header>
        <Sheet.Title>Filtros e Ordenação</Sheet.Title>
        <Sheet.Description>
          Refine sua visualização de itens salvos.
        </Sheet.Description>
      </Sheet.Header>

      <div class="py-4 space-y-4 flex-grow overflow-y-auto px-1">
        <Separator />
         <div>
            <h4 class="text-sm font-medium leading-none mb-2">Filtros</h4>
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
            <h4 class="text-sm font-medium leading-none mb-2">Data de Adição</h4>
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
            <h4 class="text-sm font-medium leading-none mb-2">Ordenação</h4>
            <div class="grid grid-cols-2 gap-2">
              <Select.Root type="multiple"
                  value={[currentSortCriterion]}
                  onValueChange={(v) => { 
                     if (v && v.length > 0) onSortCriterionChange(v[0]);
                  }}
              >
                <Select.Trigger class="w-full">
                   {currentSortCriterion === 'dateAdded' ? 'Data Adição' :
                    currentSortCriterion === 'title' ? 'Título' :
                    currentSortCriterion === 'url' ? 'URL' :
                    currentSortCriterion === 'scheduledDate' ? 'Data Agendada' :
                    currentSortCriterion === 'noteCount' ? 'Nº Notas' :
                    currentSortCriterion === 'flashcardCount' ? 'Nº Flashcards' : 'Ordenar por'}
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value="dateAdded">Data Adição</Select.Item>
                  <Select.Item value="title">Título</Select.Item>
                  <Select.Item value="url">URL</Select.Item>
                  <Select.Item value="scheduledDate">Data Agendada</Select.Item>
                  <Select.Item value="noteCount">Nº Notas</Select.Item>
                  <Select.Item value="flashcardCount">Nº Flashcards</Select.Item>
                </Select.Content>
              </Select.Root>
              <Select.Root type="multiple"
                  value={[currentSortDirection]}
                  onValueChange={(v) => { 
                     if (v && v.length > 0) onSortDirectionChange(v[0]);
                  }}
              >
                <Select.Trigger class="w-full">
                    {currentSortDirection === 'asc' ? 'Ascendente' : 'Descendente'}
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value="asc">Ascendente</Select.Item>
                  <Select.Item value="desc">Descendente</Select.Item>
                </Select.Content>
              </Select.Root>
            </div>
         </div>

        <Separator />
         <div> 
            <h4 class="text-sm font-medium leading-none mb-2">Gerenciamento Global</h4>
             <div class="flex gap-2">
                <!-- {/* Botão Gerenciar Grupos */} -->
                <Button
                  variant="outline"
                  class="w-full justify-start" 
                  onclick={onManageGroupClick} 
                  disabled={!availableGroups || availableGroups.length === 0}
                >
                  <Folder class="mr-2 h-4 w-4" />
                  Grupos ({availableGroups?.length ?? 0})
                </Button>
          
                <!-- {/* Dropdown Gerenciar Tags */} -->
                <DropdownMenu.Root>
                 <DropdownMenu.Trigger>
                   <Button variant="outline" class="w-full justify-start" disabled={availableTags.length === 0}> 
                     <Tags class="mr-2 h-4 w-4" />
                      Tags ({availableTags.length})
                   </Button>
                 </DropdownMenu.Trigger>
                 <DropdownMenu.Content align="end" class="w-64 max-h-80 overflow-y-auto">
                   <DropdownMenu.Label>Gerenciamento Global de Tags</DropdownMenu.Label>
                   <DropdownMenu.Separator />
                   {#if availableTags.length > 0}
                      <DropdownMenu.Label class="text-xs font-normal text-muted-foreground px-2">Clique para Renomear ou Remover</DropdownMenu.Label>
                      {#each availableTags as tag}
                        <DropdownMenu.Sub>
                          <DropdownMenu.SubTrigger>{tag}</DropdownMenu.SubTrigger>
                          <DropdownMenu.SubContent>
                              <DropdownMenu.Item onclick={() => onEditTagClick(tag)}>
                                <Edit class="mr-2 h-3.5 w-3.5"/> Renomear "{tag}"...
                              </DropdownMenu.Item>
                              <DropdownMenu.Separator/>
                              <DropdownMenu.Item class="text-red-600 dark:text-red-500 focus:text-red-700 dark:focus:text-red-500" onclick={() => onRemoveTagClick(tag)}>
                                <Trash2 class="mr-2 h-3.5 w-3.5"/> Remover "{tag}" de tudo...
                              </DropdownMenu.Item>
                          </DropdownMenu.SubContent>
                        </DropdownMenu.Sub>
                      {/each}
                      <DropdownMenu.Separator />
                      <DropdownMenu.Item
                        class="text-red-600 dark:text-red-500 focus:text-red-700 dark:focus:text-red-500"
                        onclick={onRemoveAllTagsClick} 
                      >
                        <Trash2 class="mr-2 h-3.5 w-3.5"/> Remover TODAS as Tags...
                      </DropdownMenu.Item>
                   {:else}
                     <DropdownMenu.Item disabled>Nenhuma tag para gerenciar</DropdownMenu.Item>
                   {/if}
                 </DropdownMenu.Content>
               </DropdownMenu.Root>
             </div>
         </div>

      </div> 

      <Sheet.Footer class="mt-auto flex flex-row justify-between gap-2 pt-4 border-t">
          <!-- {/* Botão Limpar Tudo */} -->  
          <Button variant="outline" class="w-auto" onclick={onClearFilters}
              disabled={!hasActiveFilters}>
              <FilterX class="mr-2 h-4 w-4"/> Limpar Tudo
          </Button>
          <Sheet.Close>
           <Button variant="outline">Fechar</Button>
        </Sheet.Close>
      </Sheet.Footer>
    </Sheet.Content>
</Sheet.Root> 