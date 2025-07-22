<script lang="ts">
	import { 
		addFolder, 
		appDataStore, 
		addWorkspace,
		updateWorkspace,
		deleteWorkspace
	} from '$lib/storage';
	import { Input } from '$lib/components/ui/input';
	import * as Sheet from '$lib/components/ui/sheet';
	import type { BookmarkItem, Folder, Workspace } from '$lib/types';
    import { Button } from '$lib/components/ui/button';
    import { Checkbox } from '$lib/components/ui/checkbox';
    import { Label } from '$lib/components/ui/label';
	import * as Resizable from '$lib/components/ui/resizable';
	import FolderTreeView from './FolderTreeView.svelte';
	import ItemDetails from './ItemDetails.svelte';
	import BookmarkListItem from './BookmarkListItem.svelte';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import FolderPlus from 'lucide-svelte/icons/folder-plus';
	import MoreHorizontal from 'lucide-svelte/icons/more-horizontal';
	import { toast } from 'svelte-sonner';
	import * as Select from "$lib/components/ui/select";
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';

	let searchTerm = $state('');
	let sheetOpen = $state(false);
	let selectedTags = $state(new Set<string>());
	let activeWorkspaceId = $state<string | null>(null);
	let selectedFolderId = $state<string | null>(null); // Can be null if no workspace is selected
	let selectedItemId = $state<string | null>(null);
	
	// When app data loads, ensure we have an active workspace
	$effect(() => {
		if ($appDataStore && !activeWorkspaceId) {
			activeWorkspaceId = $appDataStore.workspaces[0]?.id;
		}
	});
	
	// When active workspace changes, select the first folder by default
	$effect(() => {
		if (activeWorkspace) {
			selectedFolderId = activeWorkspace.children[0]?.id ?? null;
		}
	});

	async function handleAddNewWorkspace() {
		const name = prompt("Enter the name for the new workspace:");
		if (name && name.trim()) {
			try {
				const newWorkspace = await addWorkspace(name.trim());
				activeWorkspaceId = newWorkspace.id;
				toast.success(`Workspace "${name}" created.`);
			} catch (error: any) {
				toast.error("Failed to create workspace", { description: error.message });
			}
		}
	}

	async function handleRenameWorkspace() {
		if (!activeWorkspace) return;
		const newName = prompt("Enter the new name for the workspace:", activeWorkspace.name);
		if (newName && newName.trim()) {
			try {
				await updateWorkspace(activeWorkspace.id, newName.trim());
				toast.success(`Workspace renamed to "${newName}".`);
			} catch (error: any) {
				toast.error("Failed to rename workspace", { description: error.message });
			}
		}
	}

	async function handleDeleteWorkspace() {
		if (!activeWorkspace) return;
		if (confirm(`Are you sure you want to delete the workspace "${activeWorkspace.name}"? This cannot be undone.`)) {
			try {
				await deleteWorkspace(activeWorkspace.id);
				activeWorkspaceId = $appDataStore?.workspaces[0]?.id ?? null;
				toast.success(`Workspace "${activeWorkspace.name}" deleted.`);
			} catch (error: any) {
				toast.error("Failed to delete workspace", { description: error.message });
			}
		}
	}

	async function handleAddNewFolder() {
		if (!activeWorkspaceId) return;
		try {
			// This now adds a folder to the root of the active workspace
			const newFolder = await addFolder(activeWorkspaceId, activeWorkspaceId, { name: 'New Folder' });
			selectedFolderId = newFolder.id; // Auto-select the new folder
			toast.success('New folder created.');
		} catch (error: any) {
			toast.error('Failed to create new folder', { description: error.message });
		}
	}
	
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

	const workspaces = $derived($appDataStore?.workspaces ?? []);
	const activeWorkspace = $derived(workspaces.find(ws => ws.id === activeWorkspaceId));

	const folderTree = $derived(activeWorkspace ? getFolderTree(activeWorkspace.children) : []);
	
	const selectedFolder = $derived(
		activeWorkspace && selectedFolderId
			? findFolder(activeWorkspace.children, selectedFolderId)
			: null
	);

	const displayedItems = $derived(
		selectedFolder ? filterNodes(selectedFolder.children, searchTerm, selectedTags) : []
	);

	const selectedItem = $derived(
		displayedItems.find(
			(item) => !('children' in item) && item.id === selectedItemId
		) ?? null
	);

	const totalItemCount = $derived(activeWorkspace ? countItems(activeWorkspace.children) : 0);
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
				<div class="flex h-full items-start p-2 overflow-y-auto">
					<div class="flex flex-col w-full gap-2">
						<!-- Workspace Selector -->
						<div class="flex items-center gap-1">
							<Select.Root
								type="single"
								value={activeWorkspaceId ?? undefined}
								onValueChange={(value) => { if (value) activeWorkspaceId = value; }}
							>
								<Select.Trigger class="flex-1">
									{activeWorkspace?.name ?? '...'}
								</Select.Trigger>
								<Select.Content>
									{#each workspaces as workspace (workspace.id)}
										<Select.Item value={workspace.id}>{workspace.name}</Select.Item>
									{/each}
								</Select.Content>
							</Select.Root>
							<DropdownMenu.Root>
								<DropdownMenu.Trigger>
									<Button variant="ghost" size="icon" class="h-9 w-9">
										<MoreHorizontal class="h-4 w-4" />
									</Button>
								</DropdownMenu.Trigger>
								<DropdownMenu.Content>
									<DropdownMenu.Item onclick={handleAddNewWorkspace}>New Workspace</DropdownMenu.Item>
									<DropdownMenu.Item onclick={handleRenameWorkspace} disabled={!activeWorkspace}>Rename Workspace</DropdownMenu.Item>
									<DropdownMenu.Item onclick={handleDeleteWorkspace} disabled={!activeWorkspace || workspaces.length <= 1}>Delete Workspace</DropdownMenu.Item>
									<DropdownMenu.Separator />
									<DropdownMenu.Item onclick={handleAddNewFolder} disabled={!activeWorkspace}>
										New Folder
									</DropdownMenu.Item>
								</DropdownMenu.Content>
							</DropdownMenu.Root>
						</div>

						<!-- Folders -->
						{#if activeWorkspace}
							{#if folderTree.length > 0}
								<FolderTreeView 
									folders={folderTree} 
									selectedFolderId={selectedFolderId ?? ''}
									onSelect={(id: string) => selectedFolderId = id}
									workspaceId={activeWorkspaceId!}
								/>
							{:else}
								<div class="text-center text-sm text-muted-foreground p-4 flex flex-col items-center gap-2 border rounded-md">
									<p>No folders in this workspace.</p>
									<Button variant="outline" size="sm" onclick={handleAddNewFolder}>
										<FolderPlus class="mr-2 h-4 w-4" />
										Create Folder
									</Button>
								</div>
							{/if}
						{/if}
					</div>
				</div>
			</Resizable.Pane>
			<Resizable.Handle withHandle />
			<Resizable.Pane defaultSize={75} minSize={30}>
				<ScrollArea class="h-full">
					<div class="flex h-full flex-col p-2">
						{#if displayedItems.length > 0}
							{#each displayedItems as node (node.id)}
								{#if !('children' in node)}
									<BookmarkListItem 
										item={node} 
										isSelected={selectedItemId === node.id}
										onclick={() => selectedItemId = node.id} 
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
			<Resizable.Pane defaultSize={30} minSize={20}>
				<ScrollArea class="h-full">
					<div class="p-2">
						{#if selectedItem && !('children' in selectedItem)}
							<ItemDetails item={selectedItem} />
						{/if}
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