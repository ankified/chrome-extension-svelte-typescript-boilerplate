<script lang="ts">
  import * as Dialog from '../../../lib/components/ui/dialog/index.js';
  import Button from '../../../lib/components/ui/button/button.svelte';
  import Input from '../../../lib/components/ui/input/input.svelte';
  import Badge from '../../../lib/components/ui/badge/badge.svelte';
  import { Checkbox } from 'bits-ui';
  import Label from '../../../lib/components/ui/label/label.svelte';
  import ScrollArea from '../../../lib/components/ui/scroll-area/scroll-area.svelte';
  import { knownTags as tagsStore } from '../../../storage';
  import X from '@lucide/svelte/icons/x';
  import Check from '@lucide/svelte/icons/check';
  import { cn } from '../../../lib/utils.js';

  type TagUpdates = { add: string[]; remove: string[] };
  let { 
    open = $bindable(), 
    itemCount = 0,
    onUpdate = (updates: TagUpdates) => {},
    onClose = () => {}
  } = $props<{
    open: boolean;
    itemCount: number;
    onUpdate?: (updates: TagUpdates) => void;
    onClose?: () => void;
  }>();

  // Estados:
  let newTagInput = $state('');
  let tagsToAdd = $state(new Set<string>()); // Novas tags mantêm Set
  let tagsToRemove = $state<string[]>([]);   // Tags existentes a remover usam array

  let knownTags = $derived($tagsStore);

  // Estado derivado para desativar botão
  let isSaveDisabled = $derived(tagsToAdd.size === 0 && tagsToRemove.length === 0);

  // Efeito para sincronizar: Se uma tag está em tagsToAdd, não pode estar em tagsToRemove
  $effect(() => {
      const toAddSet = tagsToAdd; // Já é um Set
      const filteredRemove = tagsToRemove.filter(tag => !toAddSet.has(tag));
      if (filteredRemove.length !== tagsToRemove.length) {
          tagsToRemove = filteredRemove;
      }
  });

  // Efeito para sincronizar: Se uma tag é selecionada para remover, remove de tagsToAdd
   $effect(() => {
      const toRemoveSet = new Set(tagsToRemove);
      let changed = false;
      const currentToAdd = Array.from(tagsToAdd);
      currentToAdd.forEach(tag => {
          if (toRemoveSet.has(tag)) {
              tagsToAdd.delete(tag);
              changed = true;
          }
      });
      if (changed) {
          tagsToAdd = tagsToAdd; // Força reatividade do Set
      }
  });


  function handleAddTag() {
    const tag = newTagInput.trim();
    if (tag && !tagsToAdd.has(tag)) {
      tagsToAdd.add(tag);
      // Se estava marcado para remover, desmarca (atualiza o array)
      const indexToRemove = tagsToRemove.indexOf(tag);
      if (indexToRemove > -1) {
          tagsToRemove.splice(indexToRemove, 1);
          tagsToRemove = tagsToRemove; // Força reatividade
      }
      tagsToAdd = tagsToAdd; // Força reatividade do Set
    }
    newTagInput = '';
  }

  function removeTagFromAddList(tagToRemove: string) {
     tagsToAdd.delete(tagToRemove);
     tagsToAdd = tagsToAdd;
  }

  function handleSave() {
    // A sincronização já foi feita pelos $effects
    const updates: TagUpdates = {
      add: Array.from(tagsToAdd),
      remove: tagsToRemove,
    };
    onUpdate(updates);
    open = false;
    // Limpa estados
    newTagInput = '';
    tagsToAdd = new Set<string>();
    tagsToRemove = [];
  }

  function handleCancel() {
     open = false;
     onClose();
     // Limpa estados
     newTagInput = '';
     tagsToAdd = new Set<string>();
     tagsToRemove = [];
  }

  // handleRemoveCheckboxChange não é mais necessário

</script>

<Dialog.Root bind:open={open} onOpenChange={(v: boolean) => { if (!v) handleCancel(); }}>
  <Dialog.Content class="sm:max-w-[500px]">
    <Dialog.Header>
      <Dialog.Title>Alterar Tags em Lote</Dialog.Title>
      <Dialog.Description>
        Adicione ou remova tags para os {itemCount} item(ns) selecionado(s).
      </Dialog.Description>
    </Dialog.Header>

    <div class="grid gap-4 py-4">
       <!-- Input para adicionar novas tags -->
       <div class="flex gap-2 items-center">
         <Input 
            type="text" 
            placeholder="Adicionar nova tag..." 
            bind:value={newTagInput}
            onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
            class="flex-grow"
         />
         <Button onclick={handleAddTag} variant="secondary" size="sm">Adicionar</Button>
       </div>

       <!-- Lista de tags a adicionar -->
       {#if tagsToAdd.size > 0}
         <div class="flex flex-wrap gap-1 border p-2 rounded-md bg-muted/30">
            <span class="text-xs font-medium text-muted-foreground mr-2 self-center">Adicionar:</span>
            {#each Array.from(tagsToAdd) as tag (tag)}
              <Badge variant="secondary" class="cursor-pointer group pr-1.5" onclick={() => removeTagFromAddList(tag)} title="Clique para remover da lista de adição">
                 {tag}
                 <X class="w-3 h-3 ml-1 opacity-50 group-hover:opacity-100"/>
              </Badge>
            {/each}
         </div>
       {/if}

       <!-- Lista de tags existentes para remover (Usando Checkbox.Group) -->
       <div class="flex flex-col gap-2">
          <h4 class="font-medium text-sm mb-1">Remover Tags Existentes</h4>
          <ScrollArea class="h-[30vh] rounded-md border p-3">
             {#if knownTags.length > 0}
                <Checkbox.Group bind:value={tagsToRemove} class="flex flex-col space-y-2">
                   {#each knownTags as tag (tag)}
                      <div class="flex items-center gap-2">
                        <Checkbox.Root
                           id={`remove-tag-${tag}`}
                           value={tag}
                           disabled={tagsToAdd.has(tag)}
                           class={cn(
                              "peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
                           )}
                         >
                           {#if tagsToRemove.includes(tag)}
                              <Check class="h-4 w-4" />
                           {/if}
                         </Checkbox.Root>
                         <Label 
                           for={`remove-tag-${tag}`}
                           class="text-sm font-normal cursor-pointer {tagsToAdd.has(tag) ? 'text-muted-foreground line-through' : ''}"
                           title={tagsToAdd.has(tag) ? 'Esta tag está sendo adicionada. Desmarque a adição para poder removê-la.' : 'Marcar para remover'}
                         >
                           {tag}
                         </Label>
                      </div>
                   {/each}
                 </Checkbox.Group>
             {:else}
                <p class="text-xs text-muted-foreground">Nenhuma tag conhecida para remover.</p>
             {/if}
          </ScrollArea>
       </div>
    </div>

    <Dialog.Footer>
      <Button variant="outline" onclick={handleCancel}>Cancelar</Button>
      <Button onclick={handleSave} disabled={isSaveDisabled}>Salvar Alterações</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>