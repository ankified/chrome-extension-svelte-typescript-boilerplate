<script lang="ts">
  import Button from '../../../lib/components/ui/button/button.svelte';
  import * as Dialog from '../../../lib/components/ui/dialog/index';
  import FlashcardCard from '../../../lib/components/FlashcardCard.svelte';
  import { flashcards } from '../../../storage';
  import type { Flashcard } from '../../../types';
  let { flashcardIds = [], count = 0, disabled = false, itemId = '' } = $props();
  let dialogOpen = $state(false);
  let allFlashcards = $derived(() => {
    let arr: Flashcard[] = [];
    flashcards.subscribe(val => arr = val)();
    return arr;
  });
  let associatedFlashcards = $derived(() => allFlashcards().filter(f => flashcardIds.includes(f.id)));
</script>
<Button variant="outline" size="sm" disabled={disabled} onclick={() => dialogOpen = true} aria-label="Ver flashcards">
  {count}
</Button>
<Dialog.Root open={dialogOpen} onOpenChange={v => dialogOpen = v}>
  <Dialog.Trigger>
    <!-- O botão já está acima, então deixamos vazio aqui -->
  </Dialog.Trigger>
  <Dialog.Content class="max-w-lg w-full">
    <Dialog.Title>Flashcards associados</Dialog.Title>
    {#if associatedFlashcards().length > 0}
      {#each associatedFlashcards() as card (card.id)}
        <FlashcardCard card={card} showActions={false} />
      {/each}
    {:else}
      <div class="text-xs text-muted-foreground">Nenhum flashcard associado.</div>
    {/if}
  </Dialog.Content>
</Dialog.Root> 