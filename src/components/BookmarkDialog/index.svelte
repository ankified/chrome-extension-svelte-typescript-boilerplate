<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { onDestroy, onMount } from 'svelte';

  type $$Props = {
    url?: string;
    title?: string;
    onClose?: () => void;
  };

  let {
    url = '',
    title = '',
    onClose = () => {},
  }: $$Props = $props();

  onMount(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeydown);

    return () => {
      window.removeEventListener('keydown', handleKeydown);
    };
  });
</script>

<div
  class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
  onclick={onClose}
  onkeydown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      onClose();
    }
  }}
  role="dialog"
  aria-modal="true"
  tabindex="-1"
>
  <Card
    class="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2"
    onclick={(e) => e.stopPropagation()}
  >
    <CardHeader>
      <CardTitle>Add New Bookmark</CardTitle>
    </CardHeader>
    <CardContent class="grid gap-4">
      <div class="grid gap-2">
        <Label for="title">Title</Label>
        <Input id="title" bind:value={title} />
      </div>
      <div class="grid gap-2">
        <Label for="url">URL</Label>
        <Input id="url" bind:value={url} readonly />
      </div>
    </CardContent>
    <CardFooter class="justify-between">
      <Button variant="outline" onclick={() => onClose()}>Cancel</Button>
      <Button>Add</Button>
    </CardFooter>
  </Card>
</div>