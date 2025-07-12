<script lang="ts">
    import { appDataStore, updateBookmark, deleteBookmark } from '$lib/storage';
    import Node from './Node.svelte';
    import { Button } from '$lib/components/ui/button';
    import { Input } from '$lib/components/ui/input';
    import * as Sheet from '$lib/components/ui/sheet';
    import type { BookmarkItem, Folder } from '$lib/types';
    import { Checkbox } from '$lib/components/ui/checkbox';
    import { Label } from '$lib/components/ui/label';
    import { Textarea } from '$lib/components/ui/textarea';

    let searchTerm = $state('');
    let sheetOpen = $state(false);
    let selectedTags = $state(new Set<string>());
    let detailsSheetOpen = $state(false);
    let selectedItem = $state<BookmarkItem | null>(null);
    let isEditing = $state(false);
    let editableTags = $state('');

    // Recursive function to filter nodes
    function filterNodes(
        nodes: (Folder | BookmarkItem)[],
        term: string,
        tags: Set<string>
    ): (Folder | BookmarkItem)[] {
        const lowerCaseTerm = term.toLowerCase();

        return (
            nodes
                .map((node) => {
                    if ('children' in node) {
                        // It's a Folder
                        const filteredChildren = filterNodes(node.children, term, tags);
                        if (filteredChildren.length > 0 || node.name.toLowerCase().includes(lowerCaseTerm)) {
                            return { ...node, children: filteredChildren };
                        }
                    } else {
                        // It's a BookmarkItem
                        const matchesTerm =
                            !term ||
                            node.title.toLowerCase().includes(lowerCaseTerm) ||
                            node.url.toLowerCase().includes(lowerCaseTerm) ||
                            node.comment.toLowerCase().includes(lowerCaseTerm);

                        const matchesTags =
                            tags.size === 0 || node.tags.some((tagId) => tags.has(tagId));

                        if (matchesTerm && matchesTags) {
                            return node;
                        }
                    }
                    return null;
                })
                .filter(Boolean) as (Folder | BookmarkItem)[]
        );
    }

    const filteredFolders: Folder[] = $derived(
        $appDataStore ? (filterNodes($appDataStore.folders, searchTerm, selectedTags) as Folder[]) : []
    );

    function handleViewDetails(item: BookmarkItem) {
        const clonedItem = JSON.parse(JSON.stringify(item));
        selectedItem = clonedItem;
        editableTags = clonedItem.tags.join(', ');
        detailsSheetOpen = true;
    }

    async function handleUpdate() {
        if (!selectedItem) return;

        selectedItem.tags = editableTags.split(',').map((t) => t.trim()).filter(Boolean);

        try {
            await updateBookmark(selectedItem);
            isEditing = false;
            // No need to manually reload data, the store will update automatically
        } catch (e) {
            console.error('Failed to update bookmark:', e);
        }
    }

    async function handleDelete() {
        if (!selectedItem) return;

        if (confirm('Are you sure you want to delete this item?')) {
            try {
                await deleteBookmark(selectedItem.id);
                detailsSheetOpen = false;
                selectedItem = null;
                // No need to manually reload data, the store will update automatically
            } catch (e) {
                console.error('Failed to delete bookmark:', e);
            }
        }
    }

    function toggleTag(tagId: string) {
        if (selectedTags.has(tagId)) {
            selectedTags.delete(tagId);
        } else {
            selectedTags.add(tagId);
        }
    }
</script>

<main class="p-4">
    <div class="flex justify-between items-center mb-4">
        <h1 class="text-2xl font-bold">My Saved Pages</h1>
    </div>

    <div class="flex gap-2 mb-4">
        <Input placeholder="Search..." class="flex-grow" bind:value={searchTerm} />
        <Button variant="outline" onclick={() => (sheetOpen = true)}>Filters</Button>
        <Button variant="outline">Group By</Button>
    </div>

    <Sheet.Root bind:open={sheetOpen}>
        <Sheet.Content>
            <Sheet.Header>
                <Sheet.Title>Filter Options</Sheet.Title>
                <Sheet.Description>
                    Select filters to refine your search results.
                </Sheet.Description>
            </Sheet.Header>
            <div class="grid gap-4 py-4">
                <div class="flex flex-col gap-2">
                    <h3 class="font-semibold">Filter by Tag</h3>
                    {#if $appDataStore && $appDataStore.tags.length > 0}
                        {#each $appDataStore.tags as tag}
                            <div class="flex items-center gap-2">
                                <Checkbox id={tag.id} onclick={() => toggleTag(tag.id)} checked={selectedTags.has(tag.id)} />
                                <Label for={tag.id} class="font-normal">{tag.name}</Label>
                            </div>
                        {/each}
                    {:else}
                        <p class="text-sm text-muted-foreground">No tags found.</p>
                    {/if}
                </div>
                <p>Filter by Date</p>
                <p>Filter by "Has Comment"</p>
            </div>
            <Sheet.Footer>
                <Sheet.Close>
                    <Button type="submit">Apply Filters</Button>
                </Sheet.Close>
            </Sheet.Footer>
        </Sheet.Content>
    </Sheet.Root>

    {#if $appDataStore}
        <div class="flex flex-col gap-2">
            {#each filteredFolders as node}
                <Node {node} onviewdetails={handleViewDetails} />
            {/each}
        </div>
    {:else}
        <p>Loading...</p>
    {/if}

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
                        <a href={selectedItem.url} target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:underline truncate block">
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
                            <p class="text-sm text-muted-foreground">{selectedItem.comment || 'No comment added.'}</p>
                        {/if}
                    </div>
                    <div class="grid gap-2">
                        <h4 class="font-semibold">Tags</h4>
                        {#if isEditing}
                            <Input bind:value={editableTags} placeholder="design, code..." />
                        {:else}
                            <p class="text-sm text-muted-foreground">{selectedItem.tags.join(', ') || 'No tags.'}</p>
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