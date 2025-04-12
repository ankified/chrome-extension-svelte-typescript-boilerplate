<script lang="ts">
    import type { NamedFilterSet } from '../../types'; // <-- Corrigir caminho
    import * as Dialog from '../../lib/components/ui/dialog/index.js';
    import { Button } from '../../lib/components/ui/button/index.js';
    import { ScrollArea } from '../../lib/components/ui/scroll-area/index.js';
    import { Trash2, Check } from '@lucide/svelte';

    let {
      open = $bindable(false),
      filterSets = [],
      onApply = (id: string) => {},
      onDelete = (id: string) => {}
    } = $props<{
      open?: boolean;
      filterSets?: NamedFilterSet[];
      onApply?: (id: string) => void;
      onDelete?: (id: string) => void;
    }>();

</script>

{#if open}
<Dialog.Root bind:open onOpenChange={(isOpen) => { if (!isOpen) open = false; }}>
  <Dialog.Content class="sm:max-w-[480px]">
    <Dialog.Header>
      <Dialog.Title>Carregar / Gerenciar Filtros</Dialog.Title>
      <Dialog.Description>
        Selecione um filtro salvo para aplicar ou clique no ícone para excluir.
      </Dialog.Description>
    </Dialog.Header>
    <div class="py-4">
       {#if filterSets.length > 0}
         <ScrollArea class="h-[40vh] rounded-md border p-2">
           <div class="space-y-1">
             {#each filterSets as set (set.id)}
               <div class="flex items-center justify-between gap-2 p-2 hover:bg-accent hover:text-accent-foreground rounded">
                   <button
                      type="button"
                      class="flex-grow text-left text-sm truncate"
                      onclick={() => onApply(set.id)}
                      title={`Aplicar: ${set.name}`}
                   >
                      {set.name}
                   </button>
                   <Button
                      variant="ghost"
                      size="icon"
                      class="h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-destructive"
                      onclick={() => onDelete(set.id)}
                      title={`Excluir: ${set.name}`}
                    >
                      <Trash2 class="h-4 w-4" />
                   </Button>
               </div>
             {/each}
           </div>
         </ScrollArea>
       {:else}
         <p class="text-center text-sm text-muted-foreground py-4">
           Nenhum filtro foi salvo ainda.
         </p>
       {/if}
    </div>
    <Dialog.Footer>
       <Button variant="outline" onclick={() => open = false}>Fechar</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
{/if}