<script lang="ts">
	import { appDataStore } from '$lib/storage';
	import { Input } from '$lib/components/ui/input';
	import * as Sheet from '$lib/components/ui/sheet';
	import type { BookmarkItem, Folder } from '$lib/types';
    import { Button } from '$lib/components/ui/button';
    import { Checkbox } from '$lib/components/ui/checkbox';
    import { Label } from '$lib/components/ui/label';
	import * as Resizable from '$lib/components/ui/resizable';
	import FolderTreeView from './FolderTreeView.svelte';
	import ItemDetails from './ItemDetails.svelte';
	import FolderListItem from './FolderListItem.svelte';
	import BookmarkListItem from './BookmarkListItem.svelte';
	import { ScrollArea } from '$lib/components/ui/scroll-area';

	let { onviewdetails }: { onviewdetails: (item: BookmarkItem) => void } = $props();

	let searchTerm = $state('');
	let sheetOpen = $state(false);
	let selectedTags = $state(new Set<string>());
	let selectedFolderId = $state('root'); // Start at the root
	let selectedItemId = $state<string | null>(null);

	// Recursive function to filter nodes based on search and tags
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
						const filteredChildren = filterNodes(node.children, term, tags);
						if (filteredChildren.length > 0 || node.name.toLowerCase().includes(lowerCaseTerm)) {
							return { ...node, children: filteredChildren };
						}
					} else {
						const matchesTerm =
							!term ||
							node.title.toLowerCase().includes(lowerCaseTerm) ||
							(node.url && node.url.toLowerCase().includes(lowerCaseTerm)) ||
							(node.comment && node.comment.toLowerCase().includes(lowerCaseTerm));

						const nodeTags = node.tags ?? [];
						const matchesTags = tags.size === 0 || nodeTags.some((tagId) => tags.has(tagId));

						if (matchesTerm && matchesTags) {
							return node;
						}
					}
					return null;
				})
				.filter(Boolean) as (Folder | BookmarkItem)[]
		);
	}
	
	// Recursive function to find a folder by ID
	function findFolder(nodes: Folder[], id: string): Folder | null {
		for (const node of nodes) {
			if (node.id === id) return node;
			if ('children' in node) {
				const found = findFolder(node.children.filter(c => 'children' in c) as Folder[], id);
				if (found) return found;
			}
		}
		return null;
	}

	// Recursive function to extract only folders
	function getFolderTree(nodes: (Folder | BookmarkItem)[]): Folder[] {
		return nodes
			.filter((node): node is Folder => 'children' in node)
			.map(folder => ({
				...folder,
				children: getFolderTree(folder.children)
			}));
	}

	const folderTree = $derived($appDataStore ? getFolderTree($appDataStore.folders) : []);
	
	const selectedFolder = $derived(
		$appDataStore ? findFolder($appDataStore.folders, selectedFolderId) : null
	);

	const displayedItems = $derived(
		selectedFolder ? filterNodes(selectedFolder.children, searchTerm, selectedTags) : []
	);

	const selectedItem = $derived(() => {
		if (!selectedItemId) return null;
		
		function findItem(nodes: (Folder | BookmarkItem)[]): BookmarkItem | null {
			for (const node of nodes) {
				if (!('children' in node) && node.id === selectedItemId) {
					return node;
				}
				if ('children' in node) {
					const found = findItem(node.children);
					if (found) return found;
				}
			}
			return null;
		}

		return $appDataStore ? findItem($appDataStore.folders) : null;
	});

	const totalItemCount = $derived($appDataStore ? countItems($appDataStore.folders) : 0);
	const selectedFolderItemCount = $derived(selectedFolder ? countItems(selectedFolder.children) : 0);

	function countItems(nodes: (Folder | BookmarkItem)[]): number {
		let count = 0;
		for (const node of nodes) {
			if ('children' in node) {
				count += countItems(node.children);
			} else {
				count++;
			}
		}
		return count;
	}

	function toggleTag(tagId: string) {
        const newSelectedTags = new Set(selectedTags);
		if (newSelectedTags.has(tagId)) {
			newSelectedTags.delete(tagId);
		} else {
			newSelectedTags.add(tagId);
		}
        selectedTags = newSelectedTags;
	}
</script>

<div class="flex flex-col h-full">
	<!-- Top Section -->
	<div class="flex gap-2 p-1">
		<Input placeholder="Search..." class="flex-grow" bind:value={searchTerm} />
		<Button variant="outline" onclick={() => (sheetOpen = true)}>Filters</Button>
		<Button variant="outline">Group By</Button>
	</div>

	<!-- Middle Section -->
	<div class="flex-1 overflow-hidden p-1">
		<Resizable.PaneGroup direction="horizontal" class="h-full w-full rounded-lg border">
			<Resizable.Pane defaultSize={25} minSize={20}>
				<div class="flex h-full items-start justify-center p-2 overflow-y-auto">
					<div class="flex flex-col w-full">
						<Button
							variant={selectedFolderId === 'root' ? 'secondary' : 'ghost'}
							class="w-full justify-start h-8"
							onclick={() => selectedFolderId = 'root'}
						>
							<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2 h-4 w-4"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"></path></svg>
							Root
						</Button>
						<FolderTreeView 
							folders={folderTree} 
							{selectedFolderId} 
							onSelect={(id) => selectedFolderId = id}
						/>
					</div>
				</div>
			</Resizable.Pane>
			<Resizable.Handle withHandle />
			<Resizable.Pane defaultSize={45} minSize={30}>
				<ScrollArea class="h-full">
					<div class="flex h-full flex-col p-2">
						{#if displayedItems.length > 0}
							{#each displayedItems as node (node.id)}
								{#if 'children' in node}
									<FolderListItem folder={node} onSelect={(id) => selectedFolderId = id} />
								{:else}
									<BookmarkListItem 
										item={node} 
										isSelected={selectedItemId === node.id}
										onSelect={() => selectedItemId = node.id} 
									/>
								{/if}
							{/each}
						{:else}
							<div class="flex-1 flex items-center justify-center">
								<p class="text-muted-foreground">No items in this folder.</p>
							</div>
						{/if}
					</div>
				</ScrollArea>
			</Resizable.Pane>
			<Resizable.Handle withHandle />
			<Resizable.Pane defaultSize={25} minSize={20}>
				<ScrollArea class="h-full">
					<div class="p-2">
						<div class="p-2 border bg-muted rounded mb-4 text-xs font-mono">
							<h3 class="font-bold mb-1">Debug Info</h3>
							<p class="truncate">ID: {selectedItemId ?? 'null'}</p>
							<p class="truncate">Title: {selectedItem?.title ?? 'null'}</p>
							<p>Type: {selectedItem ? ('children' in selectedItem ? 'Folder' : 'Bookmark') : 'null'}</p>
						</div>
						<ItemDetails item={selectedItem} />
					</div>
				</ScrollArea>
			</Resizable.Pane>
		</Resizable.PaneGroup>
	</div>

	<!-- Bottom Section -->
	<div class="p-2 border-t text-sm text-muted-foreground text-right">
		{selectedFolderItemCount} items in this folder / {totalItemCount} total items
	</div>
</div>


<Sheet.Root bind:open={sheetOpen}>
	<Sheet.Content>
		<Sheet.Header>
			<Sheet.Title>Filter Options</Sheet.Title>
			<Sheet.Description>Select filters to refine your search results.</Sheet.Description>
		</Sheet.Header>
		<div class="grid gap-4 py-4">
			<div class="flex flex-col gap-2">
				<h3 class="font-semibold">Filter by Tag</h3>
				{#if $appDataStore && $appDataStore.tags.length > 0}
					{#each $appDataStore.tags as tag}
						<div class="flex items-center gap-2">
							<Checkbox
								id={`filter-tag-${tag.id}`}
								onclick={() => toggleTag(tag.id)}
								checked={selectedTags.has(tag.id)}
							/>
							<Label for={`filter-tag-${tag.id}`} class="font-normal">{tag.name}</Label>
						</div>
					{/each}
				{:else}
					<p class="text-sm text-muted-foreground">No tags found.</p>
				{/if}
			</div>
		</div>
		<Sheet.Footer>
			<Sheet.Close>
				<Button type="submit">Apply Filters</Button>
			</Sheet.Close>
		</Sheet.Footer>
	</Sheet.Content>
</Sheet.Root> 