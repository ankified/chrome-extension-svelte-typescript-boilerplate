<script lang="ts">
  import type { SavedItem, Group } from "../../types";
  import type { DateRange } from 'bits-ui';
  import { format, startOfWeek, endOfWeek, subWeeks, startOfMonth, endOfMonth, subMonths, parse, isValid, startOfYear, endOfYear } from 'date-fns';
  import { ptBR } from "date-fns/locale";
  import { getLocalTimeZone, type DateValue } from "@internationalized/date";
  import { cn } from "../../lib/utils";

  // Importações de UI (movidas de SavedItemsView)
  import { Input } from "../../lib/components/ui/input/index.js";
  import * as ToggleGroup from "../../lib/components/ui/toggle-group/index.js";
  import * as Tooltip from "../../lib/components/ui/tooltip/index.js";
  import { Button } from "../../lib/components/ui/button/index.js";
  import { Badge } from "../../lib/components/ui/badge/index.js";
  import {
      Search, TextSearch, Tags, Folder, Filter, X,

      CalendarDays

  } from "@lucide/svelte";
  
  // Importação do componente de Card
  import SavedItemsCardView from "../views/card/SavedItemsCardView.svelte"; // Corrigido path

  // Tipagem das Props e Callbacks esperados
  type Props = {
    searchQuery: string;
    searchScope: 'content' | 'tags' | 'groups';
    includedTags: string[];
    excludedTags: string[];
    includedGroups: string[];
    excludedGroups: string[];
    selectedDateRange: DateRange | undefined;
    sortedItems: SavedItem[];
    groups: Group[] | undefined; // Passar o valor resolvido da store
    availableSystemTags: string[];
    sortDescriptors: SortDescriptor[];

    // Callbacks para comunicação com o componente pai
    onSearchQueryChange: (query: string) => void;
    onSearchScopeChange: (scope: 'content' | 'tags' | 'groups') => void;
    onOpenFilterSheet: () => void;
    onClearSearch: () => void;
    onRemoveIncludedGroup: (groupId: string) => void;
    onRemoveExcludedGroup: (groupId: string) => void;
    onRemoveIncludedTag: (tag: string) => void;
    onRemoveExcludedTag: (tag: string) => void;
    onClearDateRange: () => void;
  };

  let { 
    searchQuery,
    searchScope,
    includedTags,
    excludedTags,
    includedGroups,
    excludedGroups,
    selectedDateRange,
    sortedItems,
    groups,
    availableSystemTags,
    sortDescriptors,
    onSearchQueryChange,
    onSearchScopeChange,
    onOpenFilterSheet,
    onClearSearch,
    onRemoveIncludedGroup,
    onRemoveExcludedGroup,
    onRemoveIncludedTag,
    onRemoveExcludedTag,
    onClearDateRange
  } = $props(); // Sem tipo explícito aqui, Svelte 5 infere

  function toDateOrNull(dateValue: DateValue | undefined): Date | null {
    return dateValue ? dateValue.toDate(getLocalTimeZone()) : null;
  }

  // Derivado para saber se algum filtro está ativo (para o botão Filter)
  let hasActiveFilters = $derived(
      includedTags.length > 0 || 
      excludedTags.length > 0 || 
      includedGroups.length > 0 || 
      excludedGroups.length > 0 || 
      selectedDateRange
  );

  // Cálculo do intervalo da semana atual (segunda a domingo, ptBR)
  const semanaAtualStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const semanaAtualEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
  // Semana passada
  const semanaPassadaStart = startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 });
  const semanaPassadaEnd = endOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 });
  // Este mês
  const mesAtualStart = startOfMonth(new Date());
  const mesAtualEnd = endOfMonth(new Date());
  // Mês passado
  const mesPassadoDate = subMonths(new Date(), 1);
  const mesPassadoStart = startOfMonth(mesPassadoDate);
  const mesPassadoEnd = endOfMonth(mesPassadoDate);

  // Agrupamento e sub-ordenação
  let groupedAndSortedData = $derived(() => {
    if (!sortDescriptors || sortDescriptors.length === 0) {
      return [{ groupTitle: null, items: sortedItems as SavedItem[] }];
    }
    const primary = sortDescriptors[0];
    const isDateSort = primary.criterion === 'dateAdded' || primary.criterion === 'scheduledDate';
    if (!isDateSort) {
      return [{ groupTitle: null, items: sortedItems as SavedItem[] }];
    }
    // Agrupar por data
    const grouped = groupItemsByDate(sortedItems, primary.criterion);
    const keys = Array.from(grouped.keys());
    const sortedKeys = getSortedDateGroupKeys(keys, primary.direction);
    const secondarySort = sortDescriptors.slice(1);
    return sortedKeys.map(key => {
      const groupItems = grouped.get(key) ?? [];
      const subSorted = secondarySort.length > 0 ? sortItems(groupItems, secondarySort) : groupItems;
      return { groupTitle: key, items: subSorted as SavedItem[] };
    });
  });

  import type { SortDescriptor } from "../../types";
  import { sortItems } from '../../lib/utils/sorting';
  import { groupItemsByDate, getSortedDateGroupKeys } from '../../lib/utils/dateGrouping';
    import { Separator } from "../../lib/components/ui/separator";

  function getIntervalTooltip(groupTitle: string): string | null {
    // Mês dinâmico: "Abril de 2025"
    const mesAnoMatch = groupTitle.match(/^([A-Za-zçãéíóúâêôûõÇÃÉÍÓÚÂÊÔÛÕ]+) de (\d{4})$/i);
    if (mesAnoMatch) {
      const [_, mesStr, anoStr] = mesAnoMatch;
      // Tenta parsear o mês em ptBR
      const data = parse(`01/${mesStr}/${anoStr}`, 'dd/MMMM/yyyy', new Date(), { locale: ptBR });
      if (isValid(data)) {
        const start = startOfMonth(data);
        const end = endOfMonth(data);
        return `Itens adicionados em ${mesStr} de ${anoStr} (${format(start, 'dd/MM', { locale: ptBR })} - ${format(end, 'dd/MM', { locale: ptBR })})`;
      }
    }
    // Ano dinâmico: "2024"
    const anoMatch = groupTitle.match(/^(\d{4})$/);
    if (anoMatch) {
      const ano = Number(anoMatch[1]);
      const start = startOfYear(new Date(ano, 0, 1));
      const end = endOfYear(new Date(ano, 0, 1));
      return `Itens adicionados em ${ano} (${format(start, 'dd/MM', { locale: ptBR })} - ${format(end, 'dd/MM', { locale: ptBR })})`;
    }
    return null;
  }

</script>

<!-- Conteúdo interno da Aba Cartões -->
<!-- Barra Superior: Busca, Escopo e Botão Filtro -->
<div class="flex flex-col md:flex-row gap-2 pb-4 flex-shrink-0 px-1 items-center">
    <!-- Input de Busca -->
    <div class="relative flex-grow w-full md:w-auto">
      <Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input 
        type="search" 
        placeholder="Pesquisar..." 
        class="pl-8 w-full" 
        value={searchQuery} 
        oninput={(e) => onSearchQueryChange(e.currentTarget.value)} 
      />
    </div>

    <!-- ToggleGroup para Escopo da Busca -->
    <ToggleGroup.Root 
      type="single" 
      variant="outline" 
      size="sm" 
      value={searchScope} 
      onValueChange={(scope: 'content' | 'tags' | 'groups' | null) => { if (scope) onSearchScopeChange(scope); }}
      class="w-full md:w-auto justify-center md:justify-start flex-shrink-0"
    >
        <Tooltip.Provider><Tooltip.Root><Tooltip.Trigger>
            <ToggleGroup.Item value="content" aria-label="Buscar em Conteúdo"><TextSearch class="h-4 w-4" /></ToggleGroup.Item>
        </Tooltip.Trigger><Tooltip.Content><p>Buscar em Título, URL e Comentários</p></Tooltip.Content></Tooltip.Root></Tooltip.Provider>
        <Tooltip.Provider><Tooltip.Root><Tooltip.Trigger>
            <ToggleGroup.Item value="tags" aria-label="Buscar em Tags"><Tags class="h-4 w-4" /></ToggleGroup.Item>
        </Tooltip.Trigger><Tooltip.Content><p>Buscar em Tags</p></Tooltip.Content></Tooltip.Root></Tooltip.Provider>
        <Tooltip.Provider><Tooltip.Root><Tooltip.Trigger>
            <ToggleGroup.Item value="groups" aria-label="Buscar em Grupos"><Folder class="h-4 w-4" /></ToggleGroup.Item>
        </Tooltip.Trigger><Tooltip.Content><p>Buscar em Nomes de Grupos</p></Tooltip.Content></Tooltip.Root></Tooltip.Provider>
    </ToggleGroup.Root>

    <!-- Botão para abrir Sheet de Filtros/Data/Ordenação (chama callback) -->
    <Button variant="outline" class="flex-shrink-0 w-full md:w-auto" onclick={onOpenFilterSheet}>
        <Filter class="h-4 w-4" />
        <span class="ml-2 md:hidden">Filtros e Ordenação</span>
        {#if hasActiveFilters}
            <span class="ml-1.5 h-2 w-2 rounded-full bg-primary"></span>
        {/if}
    </Button>

</div>

<!-- Badges de Filtro Ativo -->
{#if searchQuery || includedGroups.length > 0 || excludedGroups.length > 0 || includedTags.length > 0 || excludedTags.length > 0 || selectedDateRange?.start}
  <div class="flex flex-wrap gap-1 mb-2 px-1 items-center flex-shrink-0">
    {#if searchQuery}
      <Badge variant="secondary" class="inline-flex items-center gap-1">
        Busca: "{searchQuery}"
        <Button variant="ghost" size="sm" class="p-0 h-auto w-auto rounded-full ml-1" onclick={onClearSearch} aria-label="Remover busca"><X class="h-3 w-3" /></Button>
      </Badge>
    {/if}
    {#if includedGroups.includes('NO_GROUP')}
       <Badge variant="secondary" class="inline-flex items-center gap-1 bg-green-100 dark:bg-green-900/50 border-green-300 dark:border-green-700/60">
         <span class="text-green-700 dark:text-green-300 mr-1">Inclui:</span> Sem Grupo
         <Button variant="ghost" size="sm" class="p-0 h-auto w-auto rounded-full ml-1" onclick={() => onRemoveIncludedGroup('NO_GROUP')} aria-label="Remover Sem Grupo"><X class="h-3 w-3" /></Button>
       </Badge>
    {/if}
    {#each includedGroups.filter((gId: string) => gId !== 'NO_GROUP') as groupId (groupId)}
      {@const groupName = groups?.find((g: Group) => g.id === groupId)?.name || '?'}
       <Badge variant="secondary" class="inline-flex items-center gap-1 bg-green-100 dark:bg-green-900/50 border-green-300 dark:border-green-700/60">
          <span class="text-green-700 dark:text-green-300 mr-1">Inclui Grupo:</span> {groupName}
         <Button variant="ghost" size="sm" class="p-0 h-auto w-auto rounded-full ml-1" onclick={() => onRemoveIncludedGroup(groupId)} aria-label={`Remover grupo incluído ${groupName}`}><X class="h-3 w-3" /></Button>
       </Badge>
    {/each}
    {#each excludedGroups as groupId (groupId)}
     {@const groupName = groups?.find((g: Group) => g.id === groupId)?.name || '?'}
      <Badge variant="secondary" class="inline-flex items-center gap-1 bg-red-100 dark:bg-red-900/50 border-red-300 dark:border-red-700/60">
         <span class="text-red-700 dark:text-red-300 mr-1">Exclui Grupo:</span> {groupName}
        <Button variant="ghost" size="sm" class="p-0 h-auto w-auto rounded-full ml-1" onclick={() => onRemoveExcludedGroup(groupId)} aria-label={`Remover grupo excluído ${groupName}`}><X class="h-3 w-3" /></Button>
      </Badge>
   {/each}
    {#each includedTags as tag (tag)}
      <Badge variant="secondary" class="inline-flex items-center gap-1 bg-blue-100 dark:bg-blue-900/50 border-blue-300 dark:border-blue-700/60">
         <span class="text-blue-700 dark:text-blue-300 mr-1">Inclui Tag:</span> {tag}
        <Button variant="ghost" size="sm" class="p-0 h-auto w-auto rounded-full ml-1" onclick={() => onRemoveIncludedTag(tag)} aria-label={`Remover tag incluída ${tag}`}><X class="h-3 w-3" /></Button>
      </Badge>
    {/each}
     {#each excludedTags as tag (tag)}
     <Badge variant="secondary" class="inline-flex items-center gap-1 bg-orange-100 dark:bg-orange-900/50 border-orange-300 dark:border-orange-700/60">
        <span class="text-orange-700 dark:text-orange-300 mr-1">Exclui Tag:</span> {tag}
       <Button variant="ghost" size="sm" class="p-0 h-auto w-auto rounded-full ml-1" onclick={() => onRemoveExcludedTag(tag)} aria-label={`Remover tag excluída ${tag}`}><X class="h-3 w-3" /></Button>
     </Badge>
   {/each}
    {#if selectedDateRange?.start}
       {@const startDate = toDateOrNull(selectedDateRange?.start)}
       {@const endDate = toDateOrNull(selectedDateRange?.end)}
       {#if startDate}
         <Badge variant="secondary" class="inline-flex items-center gap-1">
           Data: {format(startDate, "dd/MM/yy", { locale: ptBR }) + (endDate ? ` - ${format(endDate, "dd/MM/yy", { locale: ptBR })}` : ' em diante')}
           <Button variant="ghost" size="sm" class="p-0 h-auto w-auto rounded-full ml-1" onclick={onClearDateRange} aria-label="Remover filtro de data"><X class="h-3 w-3" /></Button>
         </Badge>
       {/if}
     {/if}
  </div>
{/if}

<!-- Área de Exibição dos Cards -->
<div class="flex-grow overflow-y-auto border rounded-lg dark:border-gray-700">
  {#if sortedItems.length > 0}
    {#each groupedAndSortedData() as group (group.groupTitle)}
      {#if group.groupTitle}
        <div class="px-4 pt-6 pb-2">
          <Separator class="mb-2" />
          <Tooltip.Provider>
            <Tooltip.Root delayDuration={150}>
              <Tooltip.Trigger class="flex items-center gap-2 group cursor-help">
                <CalendarDays class="h-5 w-5 text-primary/80 group-hover:text-primary" />
                <span class="text-lg font-semibold text-primary truncate max-w-xs">{group.groupTitle}</span>
                <Badge variant="outline" class="ml-2 text-xs font-medium">{group.items.length} itens</Badge>
              </Tooltip.Trigger>
              <Tooltip.Content side="top" class="text-xs max-w-xs">
                {#if group.groupTitle === 'Hoje'}
                  Itens adicionados hoje ({format(new Date(), 'dd/MM/yyyy', { locale: ptBR })})
                {:else if group.groupTitle === 'Ontem'}
                  Itens adicionados ontem ({format(new Date(Date.now() - 86400000), 'dd/MM/yyyy', { locale: ptBR })})
                {:else if group.groupTitle === 'Esta Semana'}
                  Itens adicionados nesta semana ({format(semanaAtualStart, 'dd/MM', { locale: ptBR })} - {format(semanaAtualEnd, 'dd/MM', { locale: ptBR })})
                {:else if group.groupTitle === 'Semana Passada'}
                  Itens adicionados na semana passada ({format(semanaPassadaStart, 'dd/MM', { locale: ptBR })} - {format(semanaPassadaEnd, 'dd/MM', { locale: ptBR })})
                {:else if group.groupTitle === 'Este Mês'}
                  Itens adicionados neste mês ({format(mesAtualStart, 'dd/MM', { locale: ptBR })} - {format(mesAtualEnd, 'dd/MM', { locale: ptBR })})
                {:else if group.groupTitle === 'Mês Passado'}
                  Itens adicionados no mês passado ({format(mesPassadoStart, 'dd/MM', { locale: ptBR })} - {format(mesPassadoEnd, 'dd/MM', { locale: ptBR })})
                {:else if getIntervalTooltip(group.groupTitle)}
                  {getIntervalTooltip(group.groupTitle)}
                {:else}
                  {group.groupTitle}
                {/if}
              </Tooltip.Content>
            </Tooltip.Root>
          </Tooltip.Provider>
        </div>
      {/if}
      <SavedItemsCardView data={group.items} groups={groups ?? []} {availableSystemTags} />
    {/each}
  {:else}
    <div class="text-center py-10 text-muted-foreground border rounded-lg dark:border-gray-700">
      <p class="font-medium">Nenhum item encontrado</p>
      <p class="text-sm">(Verifique os filtros aplicados)</p>
      <!-- Botão limpar tudo geral pode ser adicionado no pai se desejado -->
    </div>
  {/if}
</div> 