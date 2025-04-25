<script lang="ts">
  import * as Dialog from '../../../lib/components/ui/dialog/index.js';
  import Button from '../../../lib/components/ui/button/button.svelte';
  import { Checkbox } from 'bits-ui';
  import Label from '../../../lib/components/ui/label/label.svelte';
  import ScrollArea from '../../../lib/components/ui/scroll-area/scroll-area.svelte';
  import type { Group } from '../../../types';
  import { groups as groupsStore } from '../../../storage';
  import Check from '@lucide/svelte/icons/check';
  import { cn } from '../../../lib/utils.js';

  type GroupUpdates = { add: string[]; remove: string[] };
  let { 
    open = $bindable(), 
    itemCount = 0, 
    onUpdate = (updates: GroupUpdates) => {}, 
    onClose = () => {}
  } = $props<{
    open: boolean;
    itemCount: number;
    onUpdate?: (updates: GroupUpdates) => void; 
    onClose?: () => void;
  }>();

  // Estados para rastrear seleções usando arrays
  let groupsToAdd = $state<string[]>([]);
  let groupsToRemove = $state<string[]>([]);

  // Obter a lista de grupos da store
  let availableGroups = $derived($groupsStore);

  // Estado derivado para controlar a desativação do botão (mais simples agora)
  let isSaveDisabled = $derived(groupsToAdd.length === 0 && groupsToRemove.length === 0);

  // Efeito para sincronizar as listas: se selecionado em um, deseleciona no outro
  $effect(() => {
      // Quando groupsToAdd muda, remove os mesmos IDs de groupsToRemove
      const toAddSet = new Set(groupsToAdd);
      const filteredRemove = groupsToRemove.filter(id => !toAddSet.has(id));
      if (filteredRemove.length !== groupsToRemove.length) {
          groupsToRemove = filteredRemove;
      }
  });

  $effect(() => {
      // Quando groupsToRemove muda, remove os mesmos IDs de groupsToAdd
      const toRemoveSet = new Set(groupsToRemove);
      const filteredAdd = groupsToAdd.filter(id => !toRemoveSet.has(id));
       if (filteredAdd.length !== groupsToAdd.length) {
          groupsToAdd = filteredAdd;
      }
  });

  function handleSave() {
    // A lógica de adicionar/remover já está refletida nos arrays
    const updates: GroupUpdates = {
      add: groupsToAdd,
      remove: groupsToRemove,
    };
    onUpdate(updates);
    open = false;
    // Limpa seleções
    groupsToAdd = [];
    groupsToRemove = [];
  }

  function handleCancel() {
     open = false;
     onClose();
     // Limpa seleções
     groupsToAdd = [];
     groupsToRemove = [];
  }

  // handleCheckedChange não é mais necessário

</script>

<Dialog.Root bind:open={open} onOpenChange={(v: boolean) => { if (!v) handleCancel(); }}>
  <Dialog.Content class="sm:max-w-[450px]">
    <Dialog.Header>
      <Dialog.Title>Alterar Grupos em Lote</Dialog.Title>
      <Dialog.Description>
        Modifique os grupos para os {itemCount} item(ns) selecionado(s). As alterações serão aplicadas a todos os itens.
      </Dialog.Description>
    </Dialog.Header>

    <div class="grid grid-cols-2 gap-4 max-h-[50vh]">
       <div class="flex flex-col gap-2">
          <h4 class="font-medium text-sm mb-1">Adicionar a Grupos</h4>
          <ScrollArea class="h-full rounded-md border p-3">
             {#if availableGroups.length > 0}
                <!-- Usar Checkbox.Group -->
                <Checkbox.Group bind:value={groupsToAdd} class="flex flex-col space-y-2">
                   {#each availableGroups as group (group.id)}
                      <div class="flex items-center gap-2">
                        <!-- Usar value prop, remover onCheckedChange -->
                        <Checkbox.Root
                           id={`add-${group.id}`}
                           value={group.id}
                           class={cn(
                              "peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
                           )}
                         >
                           {#if groupsToAdd.includes(group.id)}
                              <Check class="h-4 w-4" />
                           {/if}
                         </Checkbox.Root>
                         <Label for={`add-${group.id}`} class="text-sm font-normal cursor-pointer">
                           {group.name}
                         </Label>
                      </div>
                   {/each}
                </Checkbox.Group>
             {:else}
                <p class="text-xs text-muted-foreground">Nenhum grupo disponível.</p>
             {/if}
          </ScrollArea>
       </div>

       <div class="flex flex-col gap-2">
         <h4 class="font-medium text-sm mb-1">Remover de Grupos</h4>
         <ScrollArea class="h-full rounded-md border p-3">
           {#if availableGroups.length > 0}
             <!-- Usar Checkbox.Group -->
             <Checkbox.Group bind:value={groupsToRemove} class="flex flex-col space-y-2">
               {#each availableGroups as group (group.id)}
                 <div class="flex items-center gap-2">
                    <!-- Usar value prop, remover onCheckedChange -->
                   <Checkbox.Root
                     id={`remove-${group.id}`}
                     value={group.id}
                     class={cn(
                        "peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
                     )}
                   >
                     {#if groupsToRemove.includes(group.id)}
                        <Check class="h-4 w-4" />
                     {/if}
                   </Checkbox.Root>
                   <Label for={`remove-${group.id}`} class="text-sm font-normal cursor-pointer">
                     {group.name}
                   </Label>
                 </div>
               {/each}
             </Checkbox.Group>
           {:else}
             <p class="text-xs text-muted-foreground">Nenhum grupo disponível.</p>
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