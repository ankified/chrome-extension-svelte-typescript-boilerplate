<script lang="ts">
    import type { Group } from '../../types';
    import * as Dialog from '../../lib/components/ui/dialog/index.js';
    import * as AlertDialog from '../../lib/components/ui/alert-dialog/index.js';
    import { Button } from '../../lib/components/ui/button/index.js';
    import { Input } from '../../lib/components/ui/input/index.js';
    import { Label } from '../../lib/components/ui/label/index.js';
    import { ScrollArea } from '../../lib/components/ui/scroll-area/index.js';
    import { Separator } from '../../lib/components/ui/separator/index.js';
    import { Trash2, Edit, Check, X as IconX, Folder } from '@lucide/svelte'; // Renomeado X para IconX
    import { toast } from 'svelte-sonner';
    import { savedItems, groups } from "../../storage";
    import type { SavedItem } from "../../types";
    import chroma from 'chroma-js';
    import { createGroup } from "../../storage";

    // Cores pré-definidas (igual a SavedItemsCardView e SaveItemForm)
    const groupColors = [
      "#3b82f6", "#ef4444", "#10b981", "#f59e0b",
      "#8b5cf6", "#ec4899", "#6366f1", "#14b8a6",
    ];

    type Props = {
      open?: boolean;
      allGroups?: Group[];
      item: SavedItem;
      onClose: () => void;
    };

    let {
      open = $bindable(false),
      allGroups = [],
      item,
      onClose,
    }: Props = $props();

    console.log('open', open);
    let newGroupNameDialog = $state('');
    let newGroupDialogColor = $state(groupColors[0]); // Cor padrão inicial
    let editingGroupId = $state<string | null>(null);
    let editingGroupName = $state('');
    let editingGroupColor = $state<string | undefined>(undefined);

    function startEditing(group: Group) {
        editingGroupId = group.id;
        editingGroupName = group.name;
        editingGroupColor = group.color;
    }

    function cancelEditing() {
        editingGroupId = null;
        editingGroupName = '';
        editingGroupColor = undefined;
    }

    async function handleSaveEdit() {
        if (!editingGroupId || !editingGroupName.trim()) return;

        const success = await onUpdate(editingGroupId, {
            name: editingGroupName.trim(),
            color: editingGroupColor
        });

        if (success) {
            toast.success(`Grupo "${editingGroupName.trim()}" atualizado.`);
            cancelEditing();
        } else {
            toast.error(`Erro ao atualizar grupo "${editingGroupName.trim()}".`);
        }
    }

    async function handleCreateGroupInDialog() {
        if (!newGroupNameDialog.trim()) return;
        const createdGroup = await createGroup(newGroupNameDialog, newGroupDialogColor);
        if (createdGroup) {
            addItemToGroup(item.id, createdGroup.id);
            newGroupNameDialog = '';
            newGroupDialogColor = groupColors[0];
        }
    }

    function getTextColorForBackground(bgColor: string): string {
        try {
            return chroma(bgColor).luminance() > 0.5 ? '#000000' : '#ffffff';
        } catch (e) {
            return '#000000';
        }
    }

    function addItemToGroup(itemId: string, groupId: string) {
        savedItems.update(items =>
            items.map(item => {
                if (item.id === itemId) {
                    const currentGroupIds = Array.isArray(item.groupIds) ? item.groupIds : [];
                    if (!currentGroupIds.includes(groupId)) {
                        return { ...item, groupIds: [...currentGroupIds, groupId] };
                    }
                }
                return item;
            })
        );
        groups.update(currentGroups =>
            currentGroups.map(group => {
                if (group.id === groupId) {
                    const currentItemIds = Array.isArray(group.itemIds) ? group.itemIds : [];
                    if (!currentItemIds.includes(itemId)) {
                        return { ...group, itemIds: [...currentItemIds, itemId] };
                    }
                }
                return group;
            })
        );
    }

    function removeItemFromGroup(itemId: string, groupId: string) {
        savedItems.update(items =>
            items.map(item => {
                if (item.id === itemId) {
                    const currentGroupIds = Array.isArray(item.groupIds) ? item.groupIds : [];
                    return { ...item, groupIds: currentGroupIds.filter(gid => gid !== groupId) };
                }
                return item;
            })
        );
        groups.update(currentGroups =>
            currentGroups.map(group => {
                if (group.id === groupId) {
                    const currentItemIds = Array.isArray(group.itemIds) ? group.itemIds : [];
                    return { ...group, itemIds: currentItemIds.filter(id => id !== itemId) };
                }
                return group;
            })
        );
    }

     // Reseta o estado de edição e criação ao fechar
     $effect(() => {
        if (!open) {
            cancelEditing();
            newGroupNameDialog = '';
            newGroupDialogColor = groupColors[0];
        }
    });

</script>

<!-- {#if open} -->
<Dialog.Root bind:open onOpenChange={(isOpen) => { if (!isOpen) open = false; }}>
  <Dialog.Content class="sm:max-w-[650px]">
    <Dialog.Header>
      <Dialog.Title>Gerenciar Grupos</Dialog.Title>
      <Dialog.Description>
        Crie, edite ou exclua grupos de organização.
      </Dialog.Description>
    </Dialog.Header>

    <!-- Seção Criar Novo Grupo -->
    <div class="pt-4">
       <h4 class="text-sm font-medium mb-2">Criar Novo Grupo</h4>
       <div class="flex items-center space-x-2 mb-2">
           <Input
             type="text"
             class="flex-grow"
             placeholder="Nome do novo grupo"
             bind:value={newGroupNameDialog}
             onkeydown={(e) => { if(e.key === 'Enter') handleCreateGroupInDialog(); }}
           />
           <Button
             type="button"
             size="sm"
             disabled={!newGroupNameDialog.trim()}
             onclick={handleCreateGroupInDialog}
           >
             Criar
           </Button>
       </div>
       <div class="flex flex-wrap gap-2 mb-2 justify-center">
         {#each groupColors as clr}
           <button
             type="button"
             class={`w-5 h-5 rounded-full border-2 transition-all ${newGroupDialogColor === clr ? 'border-foreground scale-110' : 'border-transparent opacity-70 hover:opacity-100'}`}
             style="background-color: {clr};"
             onclick={() => newGroupDialogColor = clr}
             aria-label="Selecionar cor {clr}"
           ></button>
         {/each}
       </div>
     </div>

    <Separator class="my-4" />

    <!-- Seção Grupos Existentes -->
    <div>
       <h4 class="text-sm font-medium mb-2">Grupos Existentes ({allGroups.length})</h4>
        {#if allGroups.length > 0}
         <ScrollArea class="h-[35vh] rounded-md border p-2">
           <div class="space-y-2">
             {#each allGroups as group (group.id)}
               <div class="flex items-center justify-between gap-2 p-2 rounded hover:bg-muted/50">
                   {#if editingGroupId === group.id}
                     <!-- Modo de Edição -->
                     <div class="flex-grow flex items-center gap-2">
                          <Input type="text" bind:value={editingGroupName} class="h-8 flex-grow" placeholder="Nome do grupo"/>
                          <Input type="color" bind:value={editingGroupColor} class="h-8 w-10 p-1"/>
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
                         {#if group.color}
                           <span class="w-3 h-3 rounded-full flex-shrink-0" style="background-color: {group.color}"></span>
                         {:else}
                           <span class="w-3 h-3 rounded-full flex-shrink-0 bg-muted"></span>
                         {/if}
                         <span class="text-sm truncate" title={group.name}>{group.name}</span>
                      </div>
                      <div class="flex-shrink-0 flex items-center gap-1">
                          <Button variant="ghost" size="icon" class="h-7 w-7 text-muted-foreground hover:text-primary" onclick={() => startEditing(group)} title="Editar">
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
                                          Tem certeza que deseja excluir o grupo "<strong>{group.name}</strong>"?
                                          Itens associados <strong>não serão excluídos</strong>, apenas desvinculados deste grupo.
                                          Esta ação não pode ser desfeita.
                                      </AlertDialog.Description>
                                  </AlertDialog.Header>
                                  <AlertDialog.Footer>
                                      <AlertDialog.Cancel>Cancelar</AlertDialog.Cancel>
                                      <AlertDialog.Action onclick={() => onDelete(group.id)}>Sim, Excluir Grupo</AlertDialog.Action>
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
           Nenhum grupo criado ainda.
         </p>
       {/if}
    </div>

    <Dialog.Footer class="mt-4 flex justify-between">
        <AlertDialog.Root>
            <AlertDialog.Trigger>
                <Button variant="destructive" disabled={allGroups.length === 0}>
                   Excluir Todos os Grupos
                </Button>
            </AlertDialog.Trigger>
            <AlertDialog.Content>
                <AlertDialog.Header>
                    <AlertDialog.Title>Confirmar Exclusão Total</AlertDialog.Title>
                    <AlertDialog.Description>
                        Tem certeza que deseja remover <strong>TODOS</strong> os grupos?
                        Itens associados <strong>não serão excluídos</strong>, apenas desvinculados dos grupos.
                        <br/><strong>Esta ação não pode ser desfeita.</strong>
                    </AlertDialog.Description>
                </AlertDialog.Header>
                <AlertDialog.Footer>
                    <AlertDialog.Cancel>Cancelar</AlertDialog.Cancel>
                    <AlertDialog.Action onclick={onDeleteAll}>Sim, Excluir Todos</AlertDialog.Action>
                </AlertDialog.Footer>
            </AlertDialog.Content>
        </AlertDialog.Root>

       <Button variant="outline" onclick={() => open = false}>Fechar</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
<!-- {/if} -->