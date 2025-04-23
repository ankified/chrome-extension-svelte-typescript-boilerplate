<script lang="ts">
  import Button from '../../../lib/components/ui/button/button.svelte';
  import * as Dialog from '../../../lib/components/ui/dialog/index';
  import { groups, savedItems } from '../../../storage';
  import type { Group, SavedItem } from '../../../types';
  import ManageItemGroupsDialog from '../../components/ManageItemGroupsDialog.svelte';

  let { disabled: initiallyDisabled = false, itemId = '' } = $props();

  let item = $derived($savedItems.find((i: SavedItem) => i.id === itemId));

  let derivedCount = $derived(item?.groupIds?.length || 0);

  let isDisabled = $derived(derivedCount === 0);

  let allGroups = $derived(() => {
    let arr: Group[] = [];
    $groups.forEach(g => arr.push(g));
    return arr;
  });
</script>
<Dialog.Root>
  <Dialog.Trigger>
    <Button variant="outline" size="sm" disabled={isDisabled} aria-label="Ver grupos">
      {derivedCount}
    </Button>
  </Dialog.Trigger>
  <Dialog.Content class="max-w-[650px]">
    <ManageItemGroupsDialog
      itemId={itemId}
      allGroups={allGroups()}
      onClose={() => {}}
    />
  </Dialog.Content>
</Dialog.Root> 