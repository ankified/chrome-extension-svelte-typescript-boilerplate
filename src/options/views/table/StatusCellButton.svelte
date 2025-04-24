<script lang="ts">
  import type { SavedItem } from '../../../types';
  // Descomentar importação
  import { savedItems, updateItem } from '../../../storage';
  import Button from '../../../lib/components/ui/button/button.svelte';
  import Badge from '../../../lib/components/ui/badge/badge.svelte';
  import MarkAsCompleteDialog from './MarkAsCompleteDialog.svelte';
  import { toast } from 'svelte-sonner';

  // Receber itemId em vez do objeto item completo
  let { itemId } = $props<{ itemId: string }>();

  // Derivar o item da store usando o itemId
  const item = $derived(() => $savedItems.find(i => i.id === itemId));

  let dialogOpen = $state(false);

  // Lógica para determinar o status (agora depende do item derivado)
  const status = $derived(() => {
    // Adicionar verificação para item indefinido
    if (!item()) return 'Carregando...'; // Ou algum estado padrão/inválido
    if (item()?.completed) return 'Concluído';
    if (!item()?.scheduledDate) return 'Pendente';

    const now = Date.now();
    const scheduled = item()?.scheduledDate;
    // Adicionar verificação para scheduled indefinido
    if (!scheduled) return 'Pendente'; 
    const todayStart = new Date(now).setHours(0, 0, 0, 0);
    const scheduledDateOnly = new Date(scheduled).setHours(0, 0, 0, 0);

    if (scheduled < todayStart) return 'Atrasado';
    if (scheduledDateOnly === todayStart) return 'Hoje';
    return 'Pendente';
  });

  // Determina a variante do Badge com base no status
  const badgeVariant = $derived(() => {
    switch (status()) {
      case 'Atrasado': return 'destructive';
      case 'Hoje': return 'default';
      case 'Concluído': return 'outline'; // Ou 'success' se existir/for criada
      case 'Pendente':
      default: return 'secondary';
    }
  });

  function handleClick() {
    if (status() !== 'Concluído') {
      dialogOpen = true;
    }
  }

  async function handleConfirmComplete() {
    if (!item()) return; // Segurança adicional
    try {
      // Usar itemId diretamente
      await updateItem(itemId, { completed: true }); 
      toast.success(`Item "${item()?.title || item()?.url}" marcado como concluído.`);
      dialogOpen = false;
    } catch (error) {
      console.error('Erro ao marcar item como concluído:', error);
      toast.error('Erro ao marcar item como concluído.');
    }
  }
</script>

{#if item()} 
<Button
  variant="ghost"
  size="sm"
  class="p-1 h-auto justify-start w-full text-left font-normal disabled:opacity-100 disabled:cursor-default"
  onclick={handleClick}
  disabled={status() === 'Concluído'}
  aria-label={status() === 'Concluído' ? 'Item Concluído' : `Marcar ${item()?.title || item()?.url} como concluído`}
>
  <Badge variant={badgeVariant()}>{status()}</Badge>
</Button>

<MarkAsCompleteDialog bind:open={dialogOpen} onConfirm={handleConfirmComplete} />
{:else}
  <!-- Opcional: Placeholder ou mensagem enquanto o item não é encontrado -->
  <span class="text-xs text-muted-foreground">...</span>
{/if} 