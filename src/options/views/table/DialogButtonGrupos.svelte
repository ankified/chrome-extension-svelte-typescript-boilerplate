<script lang="ts">
  import Button from '../../../lib/components/ui/button/button.svelte';
  import * as Dialog from '../../../lib/components/ui/dialog/index';
  import Badge from '../../../lib/components/ui/badge/badge.svelte';
  import { groups } from '../../../storage';
  import type { Group } from '../../../types';
  import GroupFilterDialog from '../../components/GroupFilterDialog.svelte';
  let { groupIds = [], count = 0, disabled = false, itemId = '' } = $props();
  let dialogOpen = $state(false);
  let allGroups = $derived(() => {
    let arr: Group[] = [];
    groups.subscribe(val => arr = val)();
    return arr;
  });
  let associatedGroups = $derived(() => allGroups().filter(g => groupIds.includes(g.id)));
  let manageDialogOpen = $state(false);

  function handleApplyGrupos(e: { included: string[] }) {
    groupIds = e.included;
    manageDialogOpen = false;
  }
</script>
<Button variant="outline" size="sm" disabled={disabled} onclick={() => dialogOpen = true} aria-label="Ver grupos">
  {count}
</Button>
<Dialog.Root open={dialogOpen} onOpenChange={v => dialogOpen = v}>
  <Dialog.Trigger>
    <!-- O botão já está acima, então deixamos vazio aqui -->
  </Dialog.Trigger>
  <Dialog.Content class="max-w-lg w-full">
    <Dialog.Title>Grupos associados</Dialog.Title>
    {#if associatedGroups().length > 0}
      <div class="flex flex-wrap gap-2">
        {#each associatedGroups() as group (group.id)}
          <Badge variant="secondary" style={group.color ? `background-color: ${group.color}` : ''}>
            {group.name}
          </Badge>
        {/each}
      </div>
    {:else}
      <div class="text-xs text-muted-foreground">Nenhum grupo associado.</div>
    {/if}
    <div class="flex justify-end mt-4">
      <Button variant="secondary" size="sm" onclick={() => manageDialogOpen = true}>Gerenciar</Button>
    </div>
    {#if manageDialogOpen}
      <GroupFilterDialog
        open={manageDialogOpen}
        initialIncludedGroups={groupIds}
        availableGroups={allGroups()}
        onClose={() => manageDialogOpen = false}
        onApply={(e: { included: string[] }) => handleApplyGrupos(e)}
      />
    {/if}
  </Dialog.Content>
</Dialog.Root> 