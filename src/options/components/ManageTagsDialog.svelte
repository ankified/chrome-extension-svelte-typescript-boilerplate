<script lang="ts">
    import * as Dialog from '../../lib/components/ui/dialog/index.js';
    import * as AlertDialog from '../../lib/components/ui/alert-dialog/index.js';
    import { Button } from '../../lib/components/ui/button/index.js';
    import { Input } from '../../lib/components/ui/input/index.js';
    import { Label } from '../../lib/components/ui/label/index.js';
    import { ScrollArea } from '../../lib/components/ui/scroll-area/index.js';
    import { Trash2, Edit, Check, X as IconX, Tag } from '@lucide/svelte';
    import { toast } from 'svelte-sonner';

    type Props = {
      open?: boolean;
      allTags?: string[];
      // Callbacks
      onRename?: (oldName: string, newName: string) => Promise<boolean>;
      onDelete?: (tagName: string) => Promise<boolean>;
      onDeleteAll?: () => Promise<boolean>;
    };

    let {
      open = $bindable(false),
      allTags = [],
      onRename = async () => false,
      onDelete = async () => false,
      onDeleteAll = async () => false,
    }: Props = $props();

    let editingTagName = $state<string | null>(null);
    let currentNewTagName = $state('');

    function startEditing(tag: string) {
        editingTagName = tag;
        currentNewTagName = tag;
    }

    function cancelEditing() {
        editingTagName = null;
        currentNewTagName = '';
    }

    async function handleSaveEdit() {
        if (!editingTagName || !currentNewTagName.trim() || editingTagName === currentNewTagName.trim()) {
            cancelEditing();
            return;
        }
        // Validação adicional: verificar se newName já existe (case-insensitive)
        const newNameLower = currentNewTagName.trim().toLowerCase();
        if (allTags.some(t => t.toLowerCase() === newNameLower)) {
            toast.warning(`A tag "${currentNewTagName.trim()}" já existe.`);
            return;
        }

        const success = await onRename(editingTagName, currentNewTagName.trim());
        if (success) {
            toast.success(`Tag "${editingTagName}" renomeada para "${currentNewTagName.trim()}".`);
            cancelEditing();
        } else {
            toast.error(`Erro ao renomear tag.`);
        }
    }

    // Reseta o estado de edição ao fechar
    $effect(() => {
        if (!open) {
            cancelEditing();
        }
    });

</script>

{#if open}
<Dialog.Root bind:open onOpenChange={(isOpen) => { if (!isOpen) open = false; }}>
  <Dialog.Content class="sm:max-w-[650px]">
    <Dialog.Header>
      <Dialog.Title>Gerenciar Tags Globalmente</Dialog.Title>
      <Dialog.Description>
        Renomeie ou exclua tags existentes em toda a extensão.
      </Dialog.Description>
    </Dialog.Header>
    <div class="py-4">
       {#if allTags.length > 0}
         <ScrollArea class="h-[40vh] rounded-md border p-2">
           <div class="space-y-1">
             {#each allTags as tag (tag)}
               <div class="flex items-center justify-between gap-2 p-2 rounded hover:bg-muted/50">
                   {#if editingTagName === tag}
                      <!-- Modo Edição -->
                       <div class="flex-grow flex items-center gap-2">
                           <Tag class="h-4 w-4 text-muted-foreground flex-shrink-0" />
                           <Input type="text" bind:value={currentNewTagName} class="h-8 flex-grow" placeholder="Novo nome"/>
                       </div>
                       <div class="flex-shrink-0 flex items-center gap-1">
                           <Button variant="ghost" size="icon" class="h-7 w-7 text-green-600" onclick={handleSaveEdit} title="Salvar">
                               <Check class="h-4 w-4" />
                           </Button>
                            <Button variant="ghost" size="icon" class="h-7 w-7 text-muted-foreground" onclick={cancelEditing} title="Cancelar">
                               <IconX class="h-4 w-4" />
                           </Button>
                       </div>
                   {:else}
                       <!-- Modo Visualização -->
                        <div class="flex items-center gap-2 flex-grow truncate">
                            <Tag class="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span class="text-sm truncate" title={tag}>{tag}</span>
                        </div>
                        <div class="flex-shrink-0 flex items-center gap-1">
                            <Button variant="ghost" size="icon" class="h-7 w-7 text-muted-foreground hover:text-primary" onclick={() => startEditing(tag)} title="Renomear">
                                <Edit class="h-4 w-4" />
                            </Button>
                            <AlertDialog.Root>
                                <AlertDialog.Trigger>
                                    <Button variant="ghost" size="icon" class="h-7 w-7 text-muted-foreground hover:text-destructive" title="Excluir">
                                        <Trash2 class="h-4 w-4" />
                                    </Button>
                                </AlertDialog.Trigger>
                                <AlertDialog.Content>
                                    <AlertDialog.Header>
                                        <AlertDialog.Title>Confirmar Exclusão</AlertDialog.Title>
                                        <AlertDialog.Description>
                                            Tem certeza que deseja excluir a tag "<strong>{tag}</strong>" de <strong>todos</strong> os itens salvos, notas e flashcards?
                                            Esta ação não pode ser desfeita.
                                        </AlertDialog.Description>
                                    </AlertDialog.Header>
                                    <AlertDialog.Footer>
                                        <AlertDialog.Cancel>Cancelar</AlertDialog.Cancel>
                                        <AlertDialog.Action onclick={() => onDelete(tag)}>Sim, Excluir Tag</AlertDialog.Action>
                                    </AlertDialog.Footer>
                                </AlertDialog.Content>
                            </AlertDialog.Root>
                        </div>
                   {/if}
               </div>
             {/each}
           </div>
         </ScrollArea>
       {:else}
         <p class="text-center text-sm text-muted-foreground py-4">
           Nenhuma tag criada ainda.
         </p>
       {/if}
    </div>
    <Dialog.Footer class="mt-4 flex justify-between">
        <AlertDialog.Root>
            <AlertDialog.Trigger>
                <Button variant="destructive" disabled={allTags.length === 0}>
                   Excluir Todas as Tags
                </Button>
            </AlertDialog.Trigger>
            <AlertDialog.Content>
                <AlertDialog.Header>
                    <AlertDialog.Title>Confirmar Exclusão Total</AlertDialog.Title>
                    <AlertDialog.Description>
                        Tem certeza que deseja remover <strong>TODAS</strong> as tags de <strong>TODOS</strong> os itens salvos, notas e flashcards?
                        <br/><strong>Esta ação não pode ser desfeita.</strong>
                    </AlertDialog.Description>
                </AlertDialog.Header>
                <AlertDialog.Footer>
                    <AlertDialog.Cancel>Cancelar</AlertDialog.Cancel>
                    <AlertDialog.Action onclick={onDeleteAll}>Sim, Excluir Todas</AlertDialog.Action>
                </AlertDialog.Footer>
            </AlertDialog.Content>
        </AlertDialog.Root>
       <Button variant="outline" onclick={() => open = false}>Fechar</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
{/if}
