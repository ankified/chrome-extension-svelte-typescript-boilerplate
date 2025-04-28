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
    // Remover importações não usadas diretamente aqui (a lógica virá das props)
    // import { savedItems, groups } from "../../storage";
    // import type { SavedItem } from "../../types";
    import chroma from 'chroma-js';
    // import { createGroup } from "../../storage";

    // Cores pré-definidas (igual a SavedItemsCardView e SaveItemForm)
    const groupColors = [
      "#3b82f6", "#ef4444", "#10b981", "#f59e0b",
      "#8b5cf6", "#ec4899", "#6366f1", "#14b8a6",
    ];

    type Props = {
      open?: boolean;
      allGroups?: Group[];
      // Remover prop 'item'
      // item: SavedItem;
      onClose?: () => void; // Manter onClose opcional

      // Adicionar props para callbacks CRUD
      onCreate?: (name: string, color?: string) => Promise<Group | null>;
      onUpdate?: (id: string, updates: { name?: string; color?: string }) => Promise<boolean>;
      onDelete?: (id: string) => Promise<boolean>;
      onDeleteAll?: () => Promise<boolean>;
    };

    let {
      open = $bindable(false),
      allGroups = [],
      // Remover 'item' da desestruturação
      onClose = () => {}, // Definir um padrão vazio se não fornecido
      // Definir padrões para os callbacks para evitar erros se não forem passados
      onCreate = async () => null,
      onUpdate = async () => false,
      onDelete = async () => false,
      onDeleteAll = async () => false,
    }: Props = $props();

    console.log('ManageGroupsDialog - open:', open); // Manter log útil
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

        // Chamar a prop onUpdate
        const success = await onUpdate(editingGroupId, {
            name: editingGroupName.trim(),
            color: editingGroupColor
        });

        if (success) {
            toast.success(`Grupo "${editingGroupName.trim()}" atualizado.`);
            cancelEditing();
        } else {
            // A função onUpdate (em storage.ts) já deve lidar com o toast de erro
            // toast.error(`Erro ao atualizar grupo "${editingGroupName.trim()}".`);
        }
    }

    async function handleCreateGroupInDialog() {
        if (!newGroupNameDialog.trim()) return;
        // Chamar a prop onCreate
        const createdGroup = await onCreate(newGroupNameDialog, newGroupDialogColor);
        if (createdGroup) {
            toast.success(`Grupo "${createdGroup.name}" criado.`);
            // Remover a lógica de adicionar item
            // addItemToGroup(item.id, createdGroup.id);
            newGroupNameDialog = '';
            newGroupDialogColor = groupColors[0];
        } else {
             // A função onCreate (em storage.ts) já deve lidar com o toast de erro/aviso
             // toast.warning(`Grupo "${newGroupNameDialog.trim()}" já existe ou ocorreu um erro.`);
        }
    }

    function getTextColorForBackground(bgColor: string): string {
        try {
            return chroma(bgColor).luminance() > 0.5 ? '#000000' : '#ffffff';
        } catch (e) {
            // Retornar preto como fallback seguro em caso de erro no chroma
            console.error("Erro ao calcular luminância da cor:", bgColor, e);
            return '#000000';
        }
    }

    // Remover addItemToGroup
    /*
    function addItemToGroup(itemId: string, groupId: string) {
        // ... lógica removida ...
    }
    */

    // Remover removeItemFromGroup
    /*
    function removeItemFromGroup(itemId: string, groupId: string) {
        // ... lógica removida ...
    }
    */

     // Reseta o estado de edição e criação ao fechar
     $effect(() => {
        if (!open) {
            cancelEditing();
            newGroupNameDialog = '';
            newGroupDialogColor = groupColors[0];
            console.log('ManageGroupsDialog - Effect Fechando'); // Log de fechamento
        }
    });

     // Funções auxiliares para chamar os callbacks de exclusão (para clareza no template)
     async function handleDeleteGroup(id: string) {
        const success = await onDelete(id);
        if (success) {
            toast.success(`Grupo excluído.`);
        } // Erro tratado na função onDelete passada
     }

     async function handleDeleteAllGroups() {
         const success = await onDeleteAll();
         if (success) {
             toast.success("Todos os grupos foram excluídos.");
             // Opcional: fechar o diálogo após excluir tudo?
             // open = false;
         } // Erro tratado na função onDeleteAll passada
     }


</script>

<!-- {#if open} -->
<Dialog.Root bind:open onOpenChange={(isOpen) => { if (!isOpen) { open = false; onClose(); } }}>
  <Dialog.Content class="sm:max-w-[650px]">
    <Dialog.Header>
      <Dialog.Title>Gerenciar Grupos Globalmente</Dialog.Title>
      <Dialog.Description>
        Crie, edite ou exclua grupos de organização para toda a extensão.
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
                          {#if editingGroupColor}
                            <Input type="color" bind:value={editingGroupColor} class="h-8 w-10 p-1"/>
                          {:else}
                            <!-- Fallback se a cor for undefined, talvez um botão para definir? -->
                            <Input type="color" value="#cccccc" class="h-8 w-10 p-1" onchange={(e) => editingGroupColor = e.currentTarget.value} />
                          {/if}
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
                                      <AlertDialog.Action onclick={() => handleDeleteGroup(group.id)}>Sim, Excluir Grupo</AlertDialog.Action>
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
                    <AlertDialog.Action onclick={handleDeleteAllGroups}>Sim, Excluir Todos</AlertDialog.Action>
                </AlertDialog.Footer>
            </AlertDialog.Content>
        </AlertDialog.Root>

       <Button variant="outline" onclick={() => { open = false; onClose(); }}>Fechar</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
<!-- {/if} -->