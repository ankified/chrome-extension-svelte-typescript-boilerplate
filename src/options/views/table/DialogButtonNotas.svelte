<script lang="ts">
  import Button from '../../../lib/components/ui/button/button.svelte';
  import * as Dialog from '../../../lib/components/ui/dialog/index';
  import NoteCard from '../../../lib/components/NoteCard.svelte';
  import { notes } from '../../../storage';
  import type { Note } from '../../../types';
  let { noteIds = [], count = 0, disabled = false, itemId = '' } = $props();
  let dialogOpen = $state(false);
  let allNotes = $derived(() => {
    let arr: Note[] = [];
    notes.subscribe(val => arr = val)();
    return arr;
  });
  let associatedNotes = $derived(() => allNotes().filter(n => noteIds.includes(n.id)));
</script>
<Button variant="outline" size="sm" disabled={disabled} onclick={() => dialogOpen = true} aria-label="Ver notas">
  {count}
</Button>
<Dialog.Root open={dialogOpen} onOpenChange={v => dialogOpen = v}>
  <Dialog.Trigger>
    <!-- O botão já está acima, então deixamos vazio aqui -->
  </Dialog.Trigger>
  <Dialog.Content class="max-w-lg w-full">
    <Dialog.Title>Notas associadas</Dialog.Title>
    {#if associatedNotes().length > 0}
      {#each associatedNotes() as note (note.id)}
        <NoteCard {note} showActions={false} />
      {/each}
    {:else}
      <div class="text-xs text-muted-foreground">Nenhuma nota associada.</div>
    {/if}
  </Dialog.Content>
</Dialog.Root> 