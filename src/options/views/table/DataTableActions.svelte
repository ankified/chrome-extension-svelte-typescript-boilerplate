<script lang="ts">
  import { toast } from 'svelte-sonner';
  import * as DropdownMenu from '../../../lib/components/ui/dropdown-menu/index';
  import Button from '../../../lib/components/ui/button/button.svelte';
  import { MoreHorizontal, Eye, Pencil, Trash2, Copy, ExternalLink } from '@lucide/svelte';

  console.log('[DataTableActions] Component Script Initialized');

  // Props recebidas de columns.ts
  let { 
    id = '', 
    url = '',
    onEdit = (itemId: string) => console.warn('[DataTableActions] onEdit called but not provided', itemId), 
    onDelete = (itemId: string) => console.warn('[DataTableActions] onDelete called but not provided', itemId) 
  } = $props();

  async function copyId() {
    if (!id) return;
    try {
      await navigator.clipboard.writeText(id);
      toast.success(`ID do item copiado: ${id}`);
    } catch (err) {
      console.error('Falha ao copiar ID:', err);
      toast.error('Não foi possível copiar o ID.');
    }
  }

  // --- Funções para abrir links ---
  function openLink(mode: 'tab' | 'window' | 'incognito') {
    if (!url) {
      toast.error('URL não encontrada para este item.');
      return;
    }
    try {
      switch (mode) {
        case 'tab':
          chrome.tabs.create({ url: url, active: true });
          break;
        case 'window':
          chrome.windows.create({ url: url });
          break;
        case 'incognito':
          chrome.windows.create({ url: url, incognito: true });
          break;
      }
    } catch (error) {
      console.error(`Erro ao abrir link no modo ${mode}:`, error);
      toast.error('Não foi possível abrir o link.');
    }
  }
  // ----------------------------

  // Funções wrapper para logging
  function triggerOnEdit() {
    console.log(`[DataTableActions] Triggering onEdit for ID: ${id}`);
    console.log('[DataTableActions] typeof onEdit:', typeof onEdit);
    onEdit(id);
  }
  function triggerOnDelete() {
    console.log(`[DataTableActions] Triggering onDelete for ID: ${id}`);
    console.log('[DataTableActions] typeof onDelete:', typeof onDelete);
    onDelete(id);
  }
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger>
    <Button variant="ghost" class="h-8 w-8 p-0">
      <span class="sr-only">Abrir menu</span>
      <MoreHorizontal class="h-4 w-4" />
    </Button>
  </DropdownMenu.Trigger>
  <DropdownMenu.Content align="end">
    <DropdownMenu.Label>Ações</DropdownMenu.Label>
    
    <!-- Transformar "Visualizar" em Submenu -->
    <DropdownMenu.Sub>
      <DropdownMenu.SubTrigger>
        <Eye class="mr-2 h-4 w-4" />
        Abrir
      </DropdownMenu.SubTrigger>
      <DropdownMenu.SubContent>
        <DropdownMenu.Item onclick={() => openLink('tab')}>
          <ExternalLink class="mr-2 h-4 w-4" />
          Nova Guia na Janela Atual
        </DropdownMenu.Item>
        <DropdownMenu.Item onclick={() => openLink('window')}>
          <ExternalLink class="mr-2 h-4 w-4" />
          Nova Janela
        </DropdownMenu.Item>
        <DropdownMenu.Item onclick={() => openLink('incognito')}>
          <ExternalLink class="mr-2 h-4 w-4" />
          Nova Janela Anônima
        </DropdownMenu.Item>
      </DropdownMenu.SubContent>
    </DropdownMenu.Sub>

    <DropdownMenu.Item onclick={triggerOnEdit}>
       <Pencil class="mr-2 h-4 w-4" />
      Editar
    </DropdownMenu.Item>
    <DropdownMenu.Item onclick={copyId}> 
      <Copy class="mr-2 h-4 w-4" />
      Copiar ID
    </DropdownMenu.Item>
    <DropdownMenu.Separator />
    <DropdownMenu.Item onclick={triggerOnDelete} class="text-red-600 focus:text-red-600 focus:bg-red-100 dark:focus:bg-red-900/50">
      <Trash2 class="mr-2 h-4 w-4" />
      Excluir
    </DropdownMenu.Item>
  </DropdownMenu.Content>
</DropdownMenu.Root> 