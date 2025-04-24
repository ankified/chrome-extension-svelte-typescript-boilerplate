<script lang="ts">
  import { Button } from '../../../lib/components/ui/button/index';
  import * as DropdownMenu from '../../../lib/components/ui/dropdown-menu/index';
  import Ellipsis from '@lucide/svelte/icons/ellipsis';
  export let id: string;
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger>
    {#snippet child({ props })}
      <Button {...props} variant="ghost" size="icon" class="relative size-8 p-0">
        <span class="sr-only">Abrir menu</span>
        <Ellipsis />
      </Button>
    {/snippet}
  </DropdownMenu.Trigger>
  <DropdownMenu.Content>
    <DropdownMenu.Group>
      <DropdownMenu.GroupHeading>Ações</DropdownMenu.GroupHeading>
      <DropdownMenu.Item onclick={() => navigator.clipboard.writeText(id)}>
        Copiar ID
      </DropdownMenu.Item>
      <DropdownMenu.Item onclick={() => window.open(`/item/${id}`, '_blank')}>
        Visualizar
      </DropdownMenu.Item>
      <DropdownMenu.Item onclick={() => alert('Editar: ' + id)}>
        Editar
      </DropdownMenu.Item>
      <DropdownMenu.Item onclick={() => alert('Excluir: ' + id)}>
        Excluir
      </DropdownMenu.Item>
    </DropdownMenu.Group>
  </DropdownMenu.Content>
</DropdownMenu.Root> 