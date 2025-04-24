<script lang="ts">
  import type { SavedItem } from '../../../types';
  // Descomentar importação
  import { updateItem } from '../../../storage';
  import Button from '../../../lib/components/ui/button/button.svelte';
  import Badge from '../../../lib/components/ui/badge/badge.svelte';
  import MarkAsCompleteDialog from './MarkAsCompleteDialog.svelte';
  import { toast } from 'svelte-sonner';

  let { item } = $props< { item: SavedItem }>();

  let dialogOpen = $state(false);

  // Lógica para determinar o status (pode ser extraída para um helper)
  const status = $derived(() => {
    if (item.completed) return 'Concluído';
    if (!item.scheduledDate) return 'Pendente';

    const now = Date.now();
    const scheduled = item.scheduledDate;
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
    try {
      // Descomentar chamada
      await updateItem(item.id, { completed: true });
      toast.success(`Item "${item.title || item.url}" marcado como concluído.`);
      // O dialog fecha automaticamente via bind:open
    } catch (error) {
      console.error('Erro ao marcar item como concluído:', error);
      toast.error('Erro ao marcar item como concluído.');
    }
  }
</script>

<Button
  variant="ghost"
  size="sm"
  class="p-1 h-auto justify-start w-full text-left font-normal disabled:opacity-100 disabled:cursor-default"
  onclick={handleClick}
  disabled={status() === 'Concluído'}
  aria-label={status() === 'Concluído' ? 'Item Concluído' : `Marcar ${item.title || item.url} como concluído`}
>
  <Badge variant={badgeVariant()}>{status()}</Badge>
</Button>

<MarkAsCompleteDialog bind:open={dialogOpen} onConfirm={handleConfirmComplete} /> 