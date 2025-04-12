<script lang="ts">
    import * as Dialog from '../../lib/components/ui/dialog/index.js';
    import { Button } from '../../lib/components/ui/button/index.js';
    import { Input } from '../../lib/components/ui/input/index.js';
    import { Label } from '../../lib/components/ui/label/index.js';

    let {
      open = $bindable(false),
      onSave = (name: string) => {}
    } = $props<{
      open?: boolean;
      onSave?: (name: string) => void;
    }>();

    let filterName = $state('');

    function handleSave() {
      if (filterName.trim()) {
        onSave(filterName.trim());
        // O componente pai (SavedItemsView) fechará o diálogo definindo `open = false`
      }
    }

    // Reseta o nome ao abrir
    $effect(() => {
        if (open) {
            filterName = '';
        }
    });

</script>

<!-- {#if open} -->
<Dialog.Root bind:open onOpenChange={(isOpen) => { if (!isOpen) open = false; }}>
  <Dialog.Content class="sm:max-w-[425px]">
    <Dialog.Header>
      <Dialog.Title>Salvar Filtro Atual</Dialog.Title>
      <Dialog.Description>
        Dê um nome para o conjunto atual de filtros e configurações de ordenação.
      </Dialog.Description>
    </Dialog.Header>
    <div class="grid gap-4 py-4">
      <div class="grid grid-cols-4 items-center gap-4">
        <Label for="filter-name" class="text-right">
          Nome
        </Label>
        <Input
          id="filter-name"
          bind:value={filterName}
          class="col-span-3"
          placeholder="Ex: Artigos Pendentes"
          onkeydown={(e) => { if (e.key === 'Enter') handleSave(); }}
        />
      </div>
    </div>
    <Dialog.Footer>
      <Button variant="outline" onclick={() => open = false}>Cancelar</Button>
      <Button type="submit" onclick={handleSave} disabled={!filterName.trim()}>Salvar Filtro</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
<!-- {/if} -->
