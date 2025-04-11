<script lang="ts">
    import { onMount } from 'svelte';
    import type { Group } from '../../types'; // Importar o tipo Group
    import * as Dialog from '../../lib/components/ui/dialog/index.js';
    import * as Tabs from '../../lib/components/ui/tabs/index.js';
    import * as Command from '../../lib/components/ui/command/index.js';
    import { Checkbox } from '../../lib/components/ui/checkbox/index.js';
    import { Button } from '../../lib/components/ui/button/index.js';
    import * as ToggleGroup from '../../lib/components/ui/toggle-group/index.js';
    import * as Tooltip from '../../lib/components/ui/tooltip/index.js';
    import { Input } from '../../lib/components/ui/input/index.js';
    import { Label } from '../../lib/components/ui/label/index.js';
    import { Separator } from '../../lib/components/ui/separator/index.js';
  
    // --- Props ---
    let {
      open = $bindable(false),
      initialIncludedGroups = [],
      initialExcludedGroups = [],
      initialGroupMatchLogic = 'AND', // Lógica para inclusão de grupos
      availableGroups = [],
      onClose = () => {},
      onApply = (detail: { included: string[]; excluded: string[]; logic: 'AND' | 'OR' }) => {}
    } = $props<{
      open?: boolean;
      initialIncludedGroups?: string[];
      initialExcludedGroups?: string[];
      initialGroupMatchLogic?: 'AND' | 'OR';
      availableGroups?: Group[]; // Usar tipo Group
      onClose?: () => void;
      onApply?: (detail: { included: string[]; excluded: string[]; logic: 'AND' | 'OR' }) => void;
    }>();
  
    // --- Estados Internos ---
    let currentIncludedGroups = $state<string[]>([]);
    let currentExcludedGroups = $state<string[]>([]);
    let currentGroupMatchLogic = $state<'AND' | 'OR'>('AND');
  
    let includeSearchQuery = $state('');
    let excludeSearchQuery = $state('');
  
    // --- Ciclo de Vida & Efeitos ---
    function syncStateWithProps() {
        currentIncludedGroups = [...initialIncludedGroups];
        currentExcludedGroups = [...initialExcludedGroups];
        currentGroupMatchLogic = initialGroupMatchLogic;
        includeSearchQuery = '';
        excludeSearchQuery = '';
    }
  
    onMount(syncStateWithProps);
  
    $effect(() => {
      if (open) {
          syncStateWithProps();
      }
    });
  
    // --- Funções Auxiliares ---
    function toggleInternalGroup(groupId: string, mode: 'include' | 'exclude') {
      const targetArray = mode === 'include' ? currentIncludedGroups : currentExcludedGroups;
  
      // Ignorar exclusão de "Sem Grupo"
      if (groupId === 'NO_GROUP' && mode === 'exclude') return;
  
      // Tratar "Sem Grupo" (apenas inclusão)
      if (groupId === 'NO_GROUP' && mode === 'include') {
          if (currentIncludedGroups.includes('NO_GROUP')) {
              currentIncludedGroups = []; // Desmarcar "Sem Grupo" limpa toda a inclusão
          } else {
              currentIncludedGroups = ['NO_GROUP']; // Marcar "Sem Grupo" seleciona apenas ele
          }
          return;
      }
  
      // Lógica normal para IDs de grupo
      const index = targetArray.indexOf(groupId);
      if (index > -1) {
          const newArray = targetArray.filter(id => id !== groupId);
          if (mode === 'include') currentIncludedGroups = newArray; else currentExcludedGroups = newArray;
      } else {
          // Ao incluir, remover 'NO_GROUP' se estava selecionado. Exclusão não interfere.
          const baseArray = mode === 'include' ? targetArray.filter(id => id !== 'NO_GROUP') : targetArray;
          const newArray = [...baseArray, groupId];
          if (mode === 'include') currentIncludedGroups = newArray; else currentExcludedGroups = newArray;
      }
    }
  
  
    function handleApply() {
      onApply({
        included: currentIncludedGroups,
        excluded: currentExcludedGroups,
        logic: currentGroupMatchLogic,
      });
    }
  
    function clearIncludes() {
        currentIncludedGroups = [];
    }
  
    function clearExcludes() {
        currentExcludedGroups = [];
    }
  
    // --- Filtros para Command ---
    let filteredIncludeGroups = $derived(
        availableGroups.filter((group: Group) => group.name.toLowerCase().includes(includeSearchQuery.toLowerCase()))
    );
     let filteredExcludeGroups = $derived(
        availableGroups.filter((group: Group) => group.name.toLowerCase().includes(excludeSearchQuery.toLowerCase()))
    );
  
    // Helper para blur seguro
    function safeBlur(element: Element | null) {
      if (element instanceof HTMLElement) {
        element.blur();
      }
    }
  
  </script>
  
  {#if open}
  <Dialog.Root bind:open onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
    <Dialog.Content class="sm:max-w-[600px] h-[70vh] flex flex-col p-0">
      <Dialog.Header class="px-6 pt-6">
        <Dialog.Title>Filtrar por Grupos</Dialog.Title>
        <Dialog.Description>
          Selecione os grupos para incluir ou excluir da sua visualização.
        </Dialog.Description>
      </Dialog.Header>
  
      <Tabs.Root value="include" class="flex-grow flex flex-col overflow-hidden mt-4 px-6">
        <Tabs.List class="grid w-full grid-cols-2 flex-shrink-0">
          <Tabs.Trigger value="include">Incluir Grupos ({currentIncludedGroups.includes('NO_GROUP') ? 'Sem Grupo' : currentIncludedGroups.length})</Tabs.Trigger>
          <Tabs.Trigger value="exclude">Excluir Grupos ({currentExcludedGroups.length})</Tabs.Trigger>
        </Tabs.List>
  
        {#key open}
        <Tabs.Content value="include" class="flex-grow overflow-hidden flex flex-col mt-2">
           <Command.Root class="flex-grow overflow-hidden flex flex-col border rounded-md">
              <Command.Input placeholder="Buscar grupo para incluir..." bind:value={includeSearchQuery} />
               <Command.Separator/>
              <Command.List class="max-h-full overflow-y-auto p-1">
                <Command.Empty>Nenhum grupo encontrado.</Command.Empty>
                 <Command.Group>
                  {#if !includeSearchQuery}
                      <Command.Item
                           value="NO_GROUP"
                           onSelect={() => { toggleInternalGroup('NO_GROUP', 'include'); safeBlur(document.activeElement); }}
                           class="cursor-pointer flex items-center w-full"
                      >
                           <Checkbox
                             class="mr-2 flex-shrink-0 pointer-events-none"
                             checked={currentIncludedGroups.includes('NO_GROUP')}
                             aria-labelledby={`group-label-NO_GROUP-include-dialog`}
                             tabindex={-1}
                             id={`group-check-NO_GROUP-include-dialog`}
                           />
                           <label for={`group-check-NO_GROUP-include-dialog`} class="flex-grow truncate cursor-pointer" id={`group-label-NO_GROUP-include-dialog`}>
                             Sem Grupo
                           </label>
                      </Command.Item>
                      <Command.Separator class="my-1" />
                  {/if}
  
                  {#if filteredIncludeGroups.length > 0}
                       {#each filteredIncludeGroups as group (group.id)}
                         <Command.Item
                           value={group.name}
                           onSelect={() => { toggleInternalGroup(group.id, 'include'); safeBlur(document.activeElement); }}
                           class="cursor-pointer flex items-center w-full"
                         >
                           <Checkbox
                             class="mr-2 flex-shrink-0 pointer-events-none"
                             checked={currentIncludedGroups.includes(group.id)}
                             aria-labelledby={`group-label-${group.id}-include-dialog`}
                             tabindex={-1}
                             id={`group-check-${group.id}-include-dialog`}
                           />
                           <label for={`group-check-${group.id}-include-dialog`} class="flex items-center flex-grow truncate cursor-pointer" id={`group-label-${group.id}-include-dialog`}>
                              {#if group.color}
                                <span class="w-2 h-2 rounded-full mr-2 flex-shrink-0" style="background-color: {group.color}"></span>
                              {:else}
                                <span class="w-2 h-2 mr-2 flex-shrink-0"></span>
                              {/if}
                              <span class="truncate flex-grow">{group.name}</span>
                           </label>
                         </Command.Item>
                       {/each}
                   {:else if includeSearchQuery}
                     <Command.Group heading={`Resultados para "${includeSearchQuery}"`}>
                         <Command.Item disabled={true}>Nenhum grupo encontrado.</Command.Item>
                     </Command.Group>
                   {:else}
                      {#if !includeSearchQuery && availableGroups.length === 0}
                          <Command.Item disabled={true}>Nenhum grupo criado.</Command.Item>
                      {/if}
                   {/if}
                 </Command.Group>
              </Command.List>
           </Command.Root>
           <!-- Lógica AND/OR para Inclusão de Grupos -->
           <div class="flex items-center justify-between mt-3 p-1 flex-shrink-0">
               <Label for="group-logic-toggle-dialog" class="text-sm text-muted-foreground">Lógica de Inclusão</Label>
               <ToggleGroup.Root
                   id="group-logic-toggle-dialog"
                   type="single"
                   size="sm"
                   variant="outline"
                   bind:value={currentGroupMatchLogic}
                   aria-label="Lógica de correspondência de grupos incluídos"
               >
                   <Tooltip.Provider> <Tooltip.Root> <Tooltip.Trigger>
                        <ToggleGroup.Item value="AND" aria-label="Corresponder a todos os grupos (E)">E</ToggleGroup.Item>
                   </Tooltip.Trigger> <Tooltip.Content><p>Item deve estar em TODOS os grupos incluídos</p></Tooltip.Content> </Tooltip.Root> </Tooltip.Provider>
                   <Tooltip.Provider> <Tooltip.Root> <Tooltip.Trigger>
                        <ToggleGroup.Item value="OR" aria-label="Corresponder a qualquer grupo (OU)">OU</ToggleGroup.Item>
                   </Tooltip.Trigger> <Tooltip.Content><p>Item deve estar em QUALQUER UM dos grupos incluídos</p></Tooltip.Content> </Tooltip.Root> </Tooltip.Provider>
               </ToggleGroup.Root>
           </div>
        </Tabs.Content>
  
        <Tabs.Content value="exclude" class="flex-grow overflow-hidden flex flex-col mt-2">
          <Command.Root class="flex-grow overflow-hidden flex flex-col border rounded-md">
              <Command.Input placeholder="Buscar grupo para excluir..." bind:value={excludeSearchQuery}/>
               <Command.Separator/>
              <Command.List class="max-h-full overflow-y-auto p-1">
                <Command.Empty>Nenhum grupo encontrado.</Command.Empty>
                  {#if filteredExcludeGroups.length > 0}
                   <Command.Group>
                     {#each filteredExcludeGroups as group (group.id)}
                       <Command.Item
                         value={group.name}
                         onSelect={() => { toggleInternalGroup(group.id, 'exclude'); safeBlur(document.activeElement); }}
                         class="cursor-pointer flex items-center w-full"
                       >
                         <Checkbox
                           class="mr-2 flex-shrink-0 pointer-events-none"
                           checked={currentExcludedGroups.includes(group.id)}
                           aria-labelledby={`group-label-${group.id}-exclude-dialog`}
                           tabindex={-1}
                           id={`group-check-${group.id}-exclude-dialog`}
                         />
                          <label for={`group-check-${group.id}-exclude-dialog`} class="flex items-center flex-grow truncate cursor-pointer" id={`group-label-${group.id}-exclude-dialog`}>
                              {#if group.color}
                                <span class="w-2 h-2 rounded-full mr-2 flex-shrink-0" style="background-color: {group.color}"></span>
                              {:else}
                                <span class="w-2 h-2 mr-2 flex-shrink-0"></span>
                              {/if}
                              <span class="truncate flex-grow">{group.name}</span>
                           </label>
                       </Command.Item>
                     {/each}
                   </Command.Group>
                  {:else if excludeSearchQuery}
                   <Command.Group heading={`Resultados para \"${excludeSearchQuery}\"`}>
                       <Command.Item disabled={true}>Nenhum grupo encontrado.</Command.Item>
                   </Command.Group>
                  {:else}
                       <Command.Group heading="Todos os Grupos Disponíveis">
                           {#each availableGroups as group (group.id)}
                               <Command.Item
                                   value={group.name}
                                   onSelect={() => { toggleInternalGroup(group.id, 'exclude'); safeBlur(document.activeElement);}}
                                   class="cursor-pointer flex items-center w-full"
                               >
                                   <Checkbox
                                       class="mr-2 flex-shrink-0 pointer-events-none"
                                       checked={currentExcludedGroups.includes(group.id)}
                                       aria-labelledby={`group-label-${group.id}-exclude-dialog-all`}
                                       tabindex={-1}
                                       id={`group-check-${group.id}-exclude-dialog-all`}
                                   />
                                  <label for={`group-check-${group.id}-exclude-dialog-all`} class="flex items-center flex-grow truncate cursor-pointer" id={`group-label-${group.id}-exclude-dialog-all`}>
                                       {#if group.color}
                                       <span class="w-2 h-2 rounded-full mr-2 flex-shrink-0" style="background-color: {group.color}"></span>
                                       {:else}
                                       <span class="w-2 h-2 mr-2 flex-shrink-0"></span>
                                       {/if}
                                       <span class="truncate flex-grow">{group.name}</span>
                                  </label>
                               </Command.Item>
                           {/each}
                            {#if availableGroups.length === 0}
                                <Command.Item disabled={true}>Nenhum grupo criado.</Command.Item>
                            {/if}
                       </Command.Group>
                  {/if}
              </Command.List>
          </Command.Root>
           <!-- Sem lógica AND/OR para Exclusão -->
           <div class="flex-shrink-0 h-[44px]"></div>
        </Tabs.Content>
        {/key}
      </Tabs.Root>
  
      <Dialog.Footer class="mt-auto pt-4 pb-6 px-6 border-t flex-shrink-0 flex flex-col sm:flex-row gap-2">
          <Button variant="outline" size="sm" onclick={clearIncludes} disabled={currentIncludedGroups.length === 0}>Limpar Inclusão</Button>
          <Button variant="outline" size="sm" onclick={clearExcludes} disabled={currentExcludedGroups.length === 0}>Limpar Exclusão</Button>
          <div class="flex-grow"></div>
          <Button variant="outline" size="sm" onclick={onClose}>Cancelar</Button>
          <Button variant="default" size="sm" onclick={handleApply}>Aplicar Filtros</Button>
      </Dialog.Footer>
    </Dialog.Content>
  </Dialog.Root>
  {/if}
  