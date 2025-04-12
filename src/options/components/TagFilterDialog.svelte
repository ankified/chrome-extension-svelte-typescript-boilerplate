<script lang="ts">
    import { onMount } from 'svelte'; // Remover createEventDispatcher
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
      open = $bindable(false), // Usar bindable para two-way binding se necessário
      initialIncludedTags = [],
      initialExcludedTags = [],
      initialTagMatchLogic = 'AND',
      availableTags = [],
      onClose = () => {}, // Callback para fechamento
      onApply = (detail: { included: string[]; excluded: string[]; logic: 'AND' | 'OR' }) => {} // Callback para aplicar
    } = $props<{
      open?: boolean;
      initialIncludedTags?: string[];
      initialExcludedTags?: string[];
      initialTagMatchLogic?: 'AND' | 'OR';
      availableTags?: string[];
      onClose?: () => void;
      onApply?: (detail: { included: string[]; excluded: string[]; logic: 'AND' | 'OR' }) => void;
    }>();
  
    // --- Estados Internos ---
    let currentIncludedTags = $state<string[]>([]);
    let currentExcludedTags = $state<string[]>([]);
    let currentTagMatchLogic = $state<'AND' | 'OR'>('AND');
  
    let includeSearchQuery = $state('');
    let excludeSearchQuery = $state('');
  
    // --- Ciclo de Vida & Efeitos ---
    function syncStateWithProps() {
        currentIncludedTags = [...initialIncludedTags];
        currentExcludedTags = [...initialExcludedTags];
        currentTagMatchLogic = initialTagMatchLogic;
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
    function toggleInternalTag(tag: string, mode: 'include' | 'exclude') {
      const targetArray = mode === 'include' ? currentIncludedTags : currentExcludedTags;
      const lowerTag = tag.toLowerCase();
      const index = targetArray.findIndex(t => t.toLowerCase() === lowerTag);
  
      if (index > -1) {
          const newArray = targetArray.filter((_, i) => i !== index);
          if (mode === 'include') currentIncludedTags = newArray; else currentExcludedTags = newArray;
      } else {
          const originalTag = availableTags.find((t: string) => t.toLowerCase() === lowerTag) || tag;
          const newArray = [...targetArray, originalTag];
          if (mode === 'include') currentIncludedTags = newArray; else currentExcludedTags = newArray;
      }
    }
  
    function handleApply() {
      // Chamar a prop onApply diretamente
      onApply({
        included: currentIncludedTags,
        excluded: currentExcludedTags,
        logic: currentTagMatchLogic,
      });
      // O componente pai fechará o diálogo (via bind:open ou no próprio onApply)
    }
  
    // handleCancel não é mais necessário se onOpenChange chama onClose diretamente
  
    function clearIncludes() {
        currentIncludedTags = [];
    }
  
    function clearExcludes() {
        currentExcludedTags = [];
    }
  
    // --- Filtros para Command ---
    let filteredIncludeTags = $derived(
        availableTags.filter((tag: string) => tag.toLowerCase().includes(includeSearchQuery.toLowerCase()))
    );
     let filteredExcludeTags = $derived(
        availableTags.filter((tag: string) => tag.toLowerCase().includes(excludeSearchQuery.toLowerCase()))
    );
  
    // Helper para blur seguro
    function safeBlur(element: Element | null) {
      if (element instanceof HTMLElement) {
        element.blur();
      }
    }
  
  </script>
  
  {#if open}
  <!-- {# Chamar onClose diretamente #} -->
  <Dialog.Root bind:open onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}> 
    <Dialog.Content class="sm:max-w-[600px] h-[70vh] flex flex-col p-0">
      <Dialog.Header class="px-6 pt-6">
        <Dialog.Title>Filtrar por Tags</Dialog.Title>
        <Dialog.Description>
          Selecione as tags para incluir ou excluir da sua visualização.
        </Dialog.Description>
      </Dialog.Header>
  
      <Tabs.Root value="include" class="flex-grow flex flex-col overflow-hidden mt-4 px-6">
        <Tabs.List class="grid w-full grid-cols-2 flex-shrink-0">
          <Tabs.Trigger value="include">Incluir Tags ({currentIncludedTags.length})</Tabs.Trigger>
          <Tabs.Trigger value="exclude">Excluir Tags ({currentExcludedTags.length})</Tabs.Trigger>
        </Tabs.List>
        
        <Tabs.Content value="include">
           <Command.Root class="flex-grow overflow-hidden flex flex-col border rounded-md">
              <Command.Input placeholder="Buscar tag para incluir..." bind:value={includeSearchQuery} />
               <Command.Separator/>
              <Command.List class="max-h-full overflow-y-auto p-1">
                <Command.Empty>Nenhuma tag encontrada.</Command.Empty>
                {#if filteredIncludeTags.length > 0}
                 <Command.Group>
                   {#each filteredIncludeTags as tag (tag)}
                     <Command.Item
                       value={tag}
                       onSelect={() => { toggleInternalTag(tag, 'include'); safeBlur(document.activeElement); }}
                       class="cursor-pointer flex items-center w-full"
                     >
                       <Checkbox
                         class="mr-2 flex-shrink-0 pointer-events-none"
                         checked={currentIncludedTags.some(st => st.toLowerCase() === tag.toLowerCase())}
                         aria-labelledby={`tag-label-${tag}-include-dialog`}
                         tabindex={-1}
                         id={`tag-check-${tag}-include-dialog`}
                       />
                       <label for={`tag-check-${tag}-include-dialog`} class="flex-grow truncate cursor-pointer" id={`tag-label-${tag}-include-dialog`}>
                         {tag}
                       </label>
                     </Command.Item>
                   {/each}
                 </Command.Group>
                {:else if includeSearchQuery}
                   <Command.Group heading={`Resultados para "${includeSearchQuery}"`}>
                       <Command.Item disabled={true}>Nenhuma tag encontrada.</Command.Item>
                   </Command.Group>
                {:else}
                   <Command.Group heading="Todas as Tags Disponíveis">
                        {#each availableTags as tag (tag)}
                         <Command.Item
                           value={tag}
                           onSelect={() => { toggleInternalTag(tag, 'include'); safeBlur(document.activeElement); }}
                           class="cursor-pointer flex items-center w-full"
                         >
                           <Checkbox
                             class="mr-2 flex-shrink-0 pointer-events-none"
                             checked={currentIncludedTags.some(st => st.toLowerCase() === tag.toLowerCase())}
                             aria-labelledby={`tag-label-${tag}-include-dialog-all`}
                              tabindex={-1}
                             id={`tag-check-${tag}-include-dialog-all`}
                           />
                           <label for={`tag-check-${tag}-include-dialog-all`} class="flex-grow truncate cursor-pointer" id={`tag-label-${tag}-include-dialog-all`}>
                             {tag}
                           </label>
                         </Command.Item>
                       {/each}
                       {#if availableTags.length === 0}
                          <Command.Item disabled={true}>Nenhuma tag disponível.</Command.Item>
                       {/if}
                   </Command.Group>
                {/if}
              </Command.List>
           </Command.Root>
           <!-- Lógica AND/OR para Inclusão -->
           <div class="flex items-center justify-between mt-3 p-1 flex-shrink-0">
               <Label for="tag-logic-toggle-dialog" class="text-sm text-muted-foreground">Lógica de Inclusão</Label>
               <ToggleGroup.Root
                   id="tag-logic-toggle-dialog"
                   type="single"
                   size="sm"
                   variant="outline"
                   bind:value={currentTagMatchLogic}
                   aria-label="Lógica de correspondência de tags incluídas"
               >
                   <Tooltip.Provider> <Tooltip.Root> <Tooltip.Trigger>
                        <ToggleGroup.Item value="AND" aria-label="Corresponder a todas as tags (E)">E</ToggleGroup.Item>
                   </Tooltip.Trigger> <Tooltip.Content><p>Item deve ter TODAS as tags incluídas</p></Tooltip.Content> </Tooltip.Root> </Tooltip.Provider>
                   <Tooltip.Provider> <Tooltip.Root> <Tooltip.Trigger>
                        <ToggleGroup.Item value="OR" aria-label="Corresponder a qualquer tag (OU)">OU</ToggleGroup.Item>
                   </Tooltip.Trigger> <Tooltip.Content><p>Item deve ter QUALQUER UMA das tags incluídas</p></Tooltip.Content> </Tooltip.Root> </Tooltip.Provider>
               </ToggleGroup.Root>
           </div>
        </Tabs.Content>
  
        <Tabs.Content value="exclude">
          <Command.Root class="flex-grow overflow-hidden flex flex-col border rounded-md">
              <Command.Input placeholder="Buscar tag para excluir..." bind:value={excludeSearchQuery}/>
               <Command.Separator/>
              <Command.List class="max-h-full overflow-y-auto p-1">
                <Command.Empty>Nenhuma tag encontrada.</Command.Empty>
                {#if filteredExcludeTags.length > 0}
                 <Command.Group>
                   {#each filteredExcludeTags as tag (tag)}
                     <Command.Item
                       value={tag}
                       onSelect={() => { toggleInternalTag(tag, 'exclude'); safeBlur(document.activeElement); }}
                       class="cursor-pointer flex items-center w-full"
                     >
                       <Checkbox
                         class="mr-2 flex-shrink-0 pointer-events-none"
                         checked={currentExcludedTags.some(st => st.toLowerCase() === tag.toLowerCase())}
                         aria-labelledby={`tag-label-${tag}-exclude-dialog`}
                          tabindex={-1}
                         id={`tag-check-${tag}-exclude-dialog`}
                       />
                       <label for={`tag-check-${tag}-exclude-dialog`} class="flex-grow truncate cursor-pointer" id={`tag-label-${tag}-exclude-dialog`}>
                         {tag}
                       </label>
                     </Command.Item>
                   {/each}
                 </Command.Group>
                  {:else if excludeSearchQuery}
                   <Command.Group heading={`Resultados para "${excludeSearchQuery}"`}>
                       <Command.Item disabled={true}>Nenhuma tag encontrada.</Command.Item>
                   </Command.Group>
                  {:else}
                      <Command.Group heading="Todas as Tags Disponíveis">
                           {#each availableTags as tag (tag)}
                              <Command.Item
                                  value={tag}
                                  onSelect={() => { toggleInternalTag(tag, 'exclude'); safeBlur(document.activeElement); }}
                                  class="cursor-pointer flex items-center w-full"
                              >
                                  <Checkbox
                                  class="mr-2 flex-shrink-0 pointer-events-none"
                                  checked={currentExcludedTags.some(st => st.toLowerCase() === tag.toLowerCase())}
                                  aria-labelledby={`tag-label-${tag}-exclude-dialog-all`}
                                  tabindex={-1}
                                  id={`tag-check-${tag}-exclude-dialog-all`}
                                  />
                                  <label for={`tag-check-${tag}-exclude-dialog-all`} class="flex-grow truncate cursor-pointer" id={`tag-label-${tag}-exclude-dialog-all`}>
                                  {tag}
                                  </label>
                              </Command.Item>
                           {/each}
                           {#if availableTags.length === 0}
                               <Command.Item disabled={true}>Nenhuma tag disponível.</Command.Item>
                           {/if}
                      </Command.Group>
                 {/if}
              </Command.List>
          </Command.Root>
           <!-- Sem lógica AND/OR para Exclusão -->
           <!-- {# Placeholder #} -->
           <div class="flex-shrink-0 h-[44px]"></div> 
        </Tabs.Content>
      </Tabs.Root>
  
      <Dialog.Footer class="mt-auto pt-4 pb-6 px-6 border-t flex-shrink-0 flex flex-col sm:flex-row gap-2">
          <Button variant="outline" size="sm" onclick={clearIncludes} disabled={currentIncludedTags.length === 0}>Limpar Inclusão</Button>
          <Button variant="outline" size="sm" onclick={clearExcludes} disabled={currentExcludedTags.length === 0}>Limpar Exclusão</Button>
          <div class="flex-grow"></div>
          <Button variant="outline" size="sm" onclick={onClose}>Cancelar</Button>
          <Button variant="default" size="sm" onclick={handleApply}>Aplicar Filtros</Button>
      </Dialog.Footer>
    </Dialog.Content>
  </Dialog.Root>
  {/if}