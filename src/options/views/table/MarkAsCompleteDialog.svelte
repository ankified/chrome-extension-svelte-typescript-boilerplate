<script lang="ts">
  import * as AlertDialog from "../../../lib/components/ui/alert-dialog/index";
  import Button from "../../../lib/components/ui/button/button.svelte";
  import type { MouseEventHandler } from 'svelte/elements';

  let { open = $bindable(false), onConfirm = () => {} }: {
    open?: boolean;
    onConfirm?: MouseEventHandler<HTMLButtonElement>;
  } = $props();
</script>

<AlertDialog.Root bind:open>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Confirmar Conclusão</AlertDialog.Title>
      <AlertDialog.Description>
        Tem certeza que deseja marcar este item como concluído?
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancelar</AlertDialog.Cancel>
      <AlertDialog.Action onclick={onConfirm}>Confirmar</AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root> 