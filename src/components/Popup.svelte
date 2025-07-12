<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { Textarea } from "$lib/components/ui/textarea";
  import { addBookmark } from '$lib/storage';

  let url = $state('');
  let comment = $state('');
  let tags = $state('');
  let title = $state('');
  let reminder = $state('');

  $effect(() => {
    // This effect runs once on mount
    chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      if (tab) {
        url = tab.url || '';
        title = tab.title || '';
      }
    });
  });

  async function handleSave() {
    if (!url || !title) {
      // TODO: Show an error to the user
      console.error("URL and Title are required.");
      return;
    }

    try {
      await addBookmark('root', {
        url,
        title,
        comment,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean), // Basic tag parsing
        reminder: reminder ? new Date(reminder).getTime() : undefined
      });
      // Close the popup window after saving
      window.close();
    } catch (error) {
      console.error("Failed to save bookmark:", error);
      // TODO: Show an error to the user
    }
  }

  // TODO: Fetch folders for the select dropdown
  // TODO: Implement save logic
</script>

<main class="p-4 w-96">
  <Card.Root>
    <Card.Header>
      <Card.Title>Save a new page</Card.Title>
      <Card.Description>
        Add a new website to your collection. The current page URL is filled in automatically.
      </Card.Description>
    </Card.Header>
    <Card.Content class="grid gap-4">
      <div class="grid gap-2">
        <Label for="title">Title</Label>
        <Input id="title" placeholder="Page title" bind:value={title} />
      </div>
      <div class="grid gap-2">
        <Label for="url">Website URL</Label>
        <Input id="url" type="url" placeholder="https://example.com" bind:value={url} />
      </div>
      <div class="grid gap-2">
        <Label for="comment">Comment</Label>
        <Textarea id="comment" placeholder="Add a comment..." bind:value={comment} />
      </div>
       <div class="grid gap-2">
        <Label for="tags">Tags (comma-separated)</Label>
        <Input id="tags" placeholder="design, inspiration, code" bind:value={tags} />
      </div>
      <div class="grid gap-2">
        <Label for="reminder">Set a reminder</Label>
        <Input id="reminder" type="datetime-local" bind:value={reminder} />
      </div>
      <!-- TODO: Add folder select dropdown -->
    </Card.Content>
    <Card.Footer class="flex justify-between">
        <Button variant="outline" onclick={() => window.close()}>Cancel</Button>
        <Button onclick={handleSave}>Save</Button>
    </Card.Footer>
  </Card.Root>
</main> 