<script lang="ts">
  import * as Dialog from '../../../lib/components/ui/dialog/index.js';
  import Button from '../../../lib/components/ui/button/button.svelte';
  import Input from '../../../lib/components/ui/input/input.svelte';
  import Badge from '../../../lib/components/ui/badge/badge.svelte';
  import { Checkbox } from 'bits-ui';
  import Label from '../../../lib/components/ui/label/label.svelte';
  import ScrollArea from '../../../lib/components/ui/scroll-area/scroll-area.svelte';
  import { knownTags as tagsStore, addKnownTagIfNotExists } from '../../../storage'; // Importar addKnownTagIfNotExists
  import X from '@lucide/svelte/icons/x';
  import Check from '@lucide/svelte/icons/check';
  import { cn } from '../../../lib/utils.js';
  import { toast } from 'svelte-sonner';

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

  // Estados para as colunas de checkboxes
  let tagsToAdd = $state<string[]>([]);
  let tagsToRemove = $state<string[]>([]);
  let newTagInput = $state('');
  
  // Estado interno para gerenciar as tags conhecidas, incluindo as recém-criadas
  let currentKnownTags = $state<string[]>([]);

  // Obter tags da store global e sincronizar com o estado local
  $effect(() => {
      const globalTags = $tagsStore;
      // Adiciona novas tags criadas localmente que ainda não estão na store global
      // e garante unicidade e ordenação
      currentKnownTags = [...new Set([...globalTags, ...currentKnownTags])]
        .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  });

  // Limpa seleções e input quando o diálogo é fechado
  $effect(() => {
      if (!open) {
          newTagInput = '';
          tagsToAdd = [];
          tagsToRemove = [];
          // Reset currentKnownTags based on global store when reopening might be needed
          // but let's keep locally created ones until save/cancel for now.
      } else {
         // Ao abrir, garante que currentKnownTags comece com o estado global
         currentKnownTags = $tagsStore.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
      }
  });


  // Estado derivado para desativar botão Salvar
  let isSaveDisabled = $derived(tagsToAdd.length === 0 && tagsToRemove.length === 0);

  // Sincronização entre as listas add/remove
  $effect(() => {
      const toAddSet = new Set(tagsToAdd);
      const filteredRemove = tagsToRemove.filter(tag => !toAddSet.has(tag));
      if (filteredRemove.length !== tagsToRemove.length) {
          tagsToRemove = filteredRemove;
      }
  });

  $effect(() => {
      const toRemoveSet = new Set(tagsToRemove);
      const filteredAdd = tagsToAdd.filter(tag => !toRemoveSet.has(tag));
       if (filteredAdd.length !== tagsToAdd.length) {
          tagsToAdd = filteredAdd;
      }
  });

  function handleCreateAndAddTag() {
    const tagName = newTagInput.trim();
    if (!tagName) return;

    const lowerCaseTagName = tagName.toLowerCase();
    const exists = currentKnownTags.some(t => t.toLowerCase() === lowerCaseTagName);

    if (exists) {
        toast.info(`Tag "${tagName}" já existe.`);
        // Seleciona a tag existente na lista de adição, se ainda não estiver
        if (!tagsToAdd.includes(tagName)) {
             // Encontra a capitalização correta existente
            const existingTag = currentKnownTags.find(t => t.toLowerCase() === lowerCaseTagName) || tagName;
             if (!tagsToAdd.includes(existingTag)) {
                tagsToAdd = [...tagsToAdd, existingTag];
             }
        }
    } else {
        // Adiciona à lista local de tags conhecidas para exibição imediata
        currentKnownTags = [...currentKnownTags, tagName].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
        // Seleciona automaticamente para adição
        tagsToAdd = [...tagsToAdd, tagName];
        toast.success(`Nova tag "${tagName}" criada e marcada para adição.`);
    }
    
    newTagInput = ''; // Limpa o input
  }

  function handleSave() {
    // Filtra tags a adicionar que podem ter sido criadas localmente mas não são realmente "novas" globalmente
    // A função storage.updateItemsTags já lida com a adição à knownTags se necessário.
    const updates: TagUpdates = {
      add: tagsToAdd,
      remove: tagsToRemove,
    };
    onUpdate(updates);
    open = false; // Fecha o diálogo (o $effect cuidará da limpeza)
  }

  function handleCancel() {
     open = false; // Fecha o diálogo (o $effect cuidará da limpeza)
     onClose();
  }

</script>

<Dialog.Root bind:open={open} onOpenChange={(v: boolean) => { if (!v) handleCancel(); }}>
  <Dialog.Content class="sm:max-w-[550px]">
    <Dialog.Header>
      <Dialog.Title>Alterar Tags em Lote</Dialog.Title>
      <Dialog.Description>
        Adicione ou remova tags para os {itemCount} item(ns) selecionado(s).
      </Dialog.Description>
    </Dialog.Header>

    <!-- Input para criar nova tag -->
    <div class="flex gap-2 items-center my-4">
      <Input 
        type="text" 
        placeholder="Criar e adicionar nova tag..." 
        bind:value={newTagInput}
        onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateAndAddTag(); } }}
        class="flex-grow"
      />
      <Button onclick={handleCreateAndAddTag} variant="secondary" size="sm">Criar e Adicionar</Button>
    </div>

    <!-- Colunas para adicionar/remover tags existentes -->
    <div class="grid grid-cols-2 gap-4 max-h-[50vh]">
      <!-- Coluna Adicionar Tags -->
      <div class="flex flex-col gap-2">
        <h4 class="font-medium text-sm mb-1">Adicionar Tags</h4>
        <ScrollArea class="h-full rounded-md border p-3">
          {#if currentKnownTags.length > 0}
            <Checkbox.Group bind:value={tagsToAdd} class="flex flex-col space-y-2">
              {#each currentKnownTags as tag (tag)}
                <div class="flex items-center gap-2">
                  <Checkbox.Root
                    id={`add-tag-${tag}`}
                    value={tag}
                    class={cn(
                       "peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
                    )}
                  >
                    {#if tagsToAdd.includes(tag)}
                       <Check class="h-4 w-4" />
                    {/if}
                  </Checkbox.Root>
                  <Label for={`add-tag-${tag}`} class="text-sm font-normal cursor-pointer">
                    {tag}
                  </Label>
                </div>
              {/each}
            </Checkbox.Group>
          {:else}
            <p class="text-xs text-muted-foreground">Nenhuma tag conhecida. Crie uma acima.</p>
          {/if}
        </ScrollArea>
      </div>

      <!-- Coluna Remover Tags -->
      <div class="flex flex-col gap-2">
        <h4 class="font-medium text-sm mb-1">Remover Tags</h4>
        <ScrollArea class="h-full rounded-md border p-3">
          {#if currentKnownTags.length > 0}
            <Checkbox.Group bind:value={tagsToRemove} class="flex flex-col space-y-2">
              {#each currentKnownTags as tag (tag)}
                <div class="flex items-center gap-2">
                  <Checkbox.Root
                    id={`remove-tag-${tag}`}
                    value={tag}
                    class={cn(
                       "peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
                    )}
                  >
                    {#if tagsToRemove.includes(tag)}
                       <Check class="h-4 w-4" />
                    {/if}
                  </Checkbox.Root>
                  <Label for={`remove-tag-${tag}`} class="text-sm font-normal cursor-pointer">
                    {tag}
                  </Label>
                </div>
              {/each}
            </Checkbox.Group>
          {:else}
            <p class="text-xs text-muted-foreground">Nenhuma tag conhecida.</p>
          {/if}
        </ScrollArea>
      </div>
    </div>

    <Dialog.Footer class="mt-4">
      <Button variant="outline" onclick={handleCancel}>Cancelar</Button>
      <Button onclick={handleSave} disabled={isSaveDisabled}>Salvar Alterações</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>