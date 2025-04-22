<script lang="ts">
  import Button from '../../../lib/components/ui/button/button.svelte';
  import * as Dialog from '../../../lib/components/ui/dialog/index';
  import Badge from '../../../lib/components/ui/badge/badge.svelte';
  import TagFilterDialog from '../../components/TagFilterDialog.svelte';
  let { tags = [], count = 0, disabled = false, itemId = '' } = $props();
  let dialogOpen = $state(false);
  let manageDialogOpen = $state(false);

  function handleApplyTags(e: { included: string[] }) {
    tags = e.included;
    manageDialogOpen = false;
  }
</script>
<Button variant="outline" size="sm" disabled={disabled} onclick={() => dialogOpen = true} aria-label="Ver tags">
  {count}
</Button>
<Dialog.Root open={dialogOpen} onOpenChange={v => dialogOpen = v}>
  <Dialog.Trigger>
    <!-- O botão já está acima, então deixamos vazio aqui -->
  </Dialog.Trigger>
  <Dialog.Content class="max-w-lg w-full">
    <Dialog.Title>Tags associadas</Dialog.Title>
    {#if tags.length > 0}
      <div class="flex flex-wrap gap-2">
        {#each tags as tag (tag)}
          <Badge variant="outline">{tag}</Badge>
        {/each}
      </div>
    {:else}
      <div class="text-xs text-muted-foreground">Nenhuma tag associada.</div>
    {/if}
    <div class="flex justify-end mt-4">
      <Button variant="secondary" size="sm" onclick={() => manageDialogOpen = true}>Gerenciar</Button>
    </div>
    {#if manageDialogOpen}
      <TagFilterDialog
        open={manageDialogOpen}
        initialIncludedTags={tags}
        availableTags={[]}
        onClose={() => manageDialogOpen = false}
        onApply={(e: { included: string[] }) => handleApplyTags(e)}
      />
    {/if}
  </Dialog.Content>
</Dialog.Root> 