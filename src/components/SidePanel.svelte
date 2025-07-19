<script lang="ts">
	import { updateBookmark, deleteBookmark } from '$lib/storage';
	import * as Sheet from '$lib/components/ui/sheet';
	import type { BookmarkItem } from '$lib/types';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import BookmarkList from './BookmarkList.svelte';

	let detailsSheetOpen = $state(false);
	let selectedItem = $state<BookmarkItem | null>(null);
	let isEditing = $state(false);
	let editableTags = $state('');

	function handleViewDetails(item: BookmarkItem) {
		// Deep clone the item to prevent modifying the store directly
		const clonedItem = JSON.parse(JSON.stringify(item));
		selectedItem = clonedItem;
		editableTags = clonedItem.tags?.join(', ') ?? '';
		detailsSheetOpen = true;
		isEditing = false; // Reset editing state
	}

	async function handleUpdate() {
		if (!selectedItem) return;

		selectedItem.tags = editableTags.split(',').map((t) => t.trim()).filter(Boolean);

		try {
			await updateBookmark(selectedItem);
			isEditing = false;
			// The view will update automatically via store reactivity
		} catch (e) {
			console.error('Failed to update bookmark:', e);
			// Optionally, show a toast notification for the error
		}
	}

	async function handleDelete() {
		if (!selectedItem) return;

		if (confirm('Are you sure you want to delete this item?')) {
			try {
				await deleteBookmark(selectedItem.id);
				detailsSheetOpen = false;
				selectedItem = null;
				// The view will update automatically
			} catch (e) {
				console.error('Failed to delete bookmark:', e);
				// Optionally, show a toast notification for the error
			}
		}
	}
</script>

<main class="p-4">
	<div class="flex justify-between items-center mb-4">
		<h1 class="text-2xl font-bold">My Saved Pages</h1>
	</div>

	<BookmarkList onviewdetails={handleViewDetails} />

	{#if selectedItem}
		<Sheet.Root
			bind:open={detailsSheetOpen}
			onOpenChange={(isOpen) => {
				if (!isOpen) {
					isEditing = false;
				}
			}}
		>
			<Sheet.Content class="w-[400px] sm:w-[540px]">
				<Sheet.Header>
					{#if isEditing}
						<Input bind:value={selectedItem.title} class="text-lg font-semibold" />
					{:else}
						<Sheet.Title>{selectedItem.title}</Sheet.Title>
					{/if}
					<Sheet.Description>
						<a
							href={selectedItem.url}
							target="_blank"
							rel="noopener noreferrer"
							class="text-blue-500 hover:underline truncate block"
						>
							{selectedItem.url}
						</a>
					</Sheet.Description>
				</Sheet.Header>
				<div class="grid gap-4 py-4">
					<div class="grid gap-2">
						<h4 class="font-semibold">Comment</h4>
						{#if isEditing}
							<Textarea bind:value={selectedItem.comment} placeholder="Add a comment..." />
						{:else}
							<p class="text-sm text-muted-foreground">
								{selectedItem.comment || 'No comment added.'}
							</p>
						{/if}
					</div>
					<div class="grid gap-2">
						<h4 class="font-semibold">Tags</h4>
						{#if isEditing}
							<Input bind:value={editableTags} placeholder="design, code..." />
						{:else}
							<p class="text-sm text-muted-foreground">{selectedItem.tags?.join(', ') || 'No tags.'}</p>
						{/if}
					</div>
					<div class="grid gap-2">
						<h4 class="font-semibold">Access History</h4>
						{#if selectedItem.accessHistory && selectedItem.accessHistory.length > 0}
							<ul class="text-sm text-muted-foreground list-disc pl-5 max-h-32 overflow-y-auto">
								{#each selectedItem.accessHistory as record (record.timestamp)}
									<li>{new Date(record.timestamp).toLocaleString()}</li>
								{/each}
							</ul>
						{:else}
							<p class="text-sm text-muted-foreground">No visit history found.</p>
						{/if}
					</div>
				</div>
				<Sheet.Footer class="flex justify-between">
					<div>
						<Button variant="destructive" onclick={handleDelete}>Delete</Button>
					</div>
					<div class="flex gap-2">
						{#if isEditing}
							<Button variant="secondary" onclick={() => (isEditing = false)}>Cancel</Button>
							<Button onclick={handleUpdate}>Save Changes</Button>
						{:else}
							<Button variant="secondary" onclick={() => (isEditing = true)}>Edit</Button>
							<Sheet.Close>
								<Button>Close</Button>
							</Sheet.Close>
						{/if}
					</div>
				</Sheet.Footer>
			</Sheet.Content>
		</Sheet.Root>
	{/if}
</main> 