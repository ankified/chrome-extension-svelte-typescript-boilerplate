<script lang="ts">
  import Button from '../../../lib/components/ui/button/button.svelte';
  import * as Dialog from '../../../lib/components/ui/dialog/index';
  import { savedItems, knownTags } from '../../../storage';
  import type { SavedItem } from '../../../types';
  import ManageItemTagsDialog from '../../components/ManageItemTagsDialog.svelte';

  let { disabled: initiallyDisabled = false, itemId = '' } = $props();

  let item = $derived($savedItems.find((i: SavedItem) => i.id === itemId));

  let derivedCount = $derived(item?.tags?.length || 0);

  let isDisabled = $derived(derivedCount === 0);

  let allTags = $derived(() => {
    let arr: string[] = [];
    $knownTags.forEach(t => arr.push(t));
    return arr.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  });
</script>
<Dialog.Root>
  <Dialog.Trigger>
    <!-- <Button variant="outline" size="sm" disabled={isDisabled} aria-label="Ver tags"> -->
    <Button variant="outline" size="sm" aria-label="Ver tags">
      {derivedCount}
    </Button>
  </Dialog.Trigger>
  <Dialog.Content class="max-w-[650px]">
    <ManageItemTagsDialog
      itemId={itemId}
      allTags={allTags()}
      availableSystemTags={allTags()}
      onClose={() => {}}
    />
  </Dialog.Content>
</Dialog.Root> 