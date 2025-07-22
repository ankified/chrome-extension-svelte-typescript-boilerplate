<script lang="ts">
	import { deleteFolder, addFolder, updateFolder } from '$lib/storage';
	import type { Folder, BookmarkItem } from '$lib/types';
	import FolderPlus from 'lucide-svelte/icons/folder-plus';
	import Pencil from 'lucide-svelte/icons/pencil';
	import Trash2 from 'lucide-svelte/icons/trash-2';
	import { toast } from 'svelte-sonner';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import FolderTreeView from './FolderTreeView.svelte';

	type $$Props = {
		folder: Folder;
		workspaceId: string;
		selectedFolderId: string | null;
		editingFolderId: string | null;
	};
    let {
        folder,
		workspaceId,
		selectedFolderId = $bindable(),
		editingFolderId = $bindable()
    } = $props();

	let editingName = $state(folder.name);

	async function handleUpdateFolder(id: string) {
		if (!editingName.trim()) {
			toast.error('Folder name cannot be empty.');
			return;
		}
		if (editingName.trim() !== folder.name) {
			try {
				await updateFolder(workspaceId, id, editingName.trim());
				toast.success('Folder updated.');
			} catch (e: any) {
				toast.error('Failed to update folder', { description: e.message });
			}
		}
		editingFolderId = null;
	}

	async function handleDeleteFolder(id: string) {
		if (confirm(`Are you sure you want to delete "${folder.name}"?`)) {
			try {
				await deleteFolder(workspaceId, id);
				toast.success('Folder deleted.');
			} catch (e: any) {
				toast.error('Failed to delete folder', { description: e.message });
			}
		}
	}

	async function handleAddNewFolder(parentId: string) {
		const name = prompt('Enter subfolder name:');
		if (name && name.trim()) {
			try {
				await addFolder(workspaceId, parentId, { name: name.trim() });
				toast.success('Subfolder created.');
			} catch (e: any) {
				toast.error('Failed to create subfolder', { description: e.message });
			}
		}
	}
</script>

<div class="flex flex-col">
	<div class="group flex items-center" role="group">
		{#if editingFolderId === folder.id}
			<Input
				bind:value={editingName}
				onkeydown={(e) => {
					if (e.key === 'Enter') handleUpdateFolder(folder.id);
					if (e.key === 'Escape') editingFolderId = null;
				}}
				onblur={() => handleUpdateFolder(folder.id)}
				class="h-8 flex-1"
				autofocus
			/>
		{:else}
			<Button
				variant={selectedFolderId === folder.id ? 'secondary' : 'ghost'}
				class="w-full justify-start h-8 text-left flex-1"
				onclick={() => (selectedFolderId = folder.id)}
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="mr-2 h-4 w-4 flex-shrink-0"
					><path
						d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"
					/></svg
				>
				<span class="truncate flex-1">{folder.name}</span>
			</Button>
			<div class="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
				<Button
					variant="ghost"
					size="icon"
					class="h-7 w-7"
					onclick={() => handleAddNewFolder(folder.id)}
					title="Add subfolder"
				>
					<FolderPlus class="h-4 w-4" />
				</Button>
				{#if folder.id !== 'root'}
					<Button
						variant="ghost"
						size="icon"
						class="h-7 w-7"
						onclick={() => {
							editingFolderId = folder.id;
							editingName = folder.name;
						}}
						title="Rename folder"
					>
						<Pencil class="h-4 w-4" />
					</Button>
<Button
    variant="ghost"
						size="icon"
						class="h-7 w-7"
						onclick={() => handleDeleteFolder(folder.id)}
						title="Delete folder"
					>
						<Trash2 class="h-4 w-4" />
					</Button>
				{/if}
			</div>
		{/if}
	</div>

	{#if folder.children && folder.children.length > 0}
		<div class="pl-4">
			<FolderTreeView
				folders={folder.children.filter((c: BookmarkItem | Folder): c is Folder => 'children' in c)}
				bind:selectedFolderId
				bind:editingFolderId
				{workspaceId}
			/>
        </div>
	{/if}
    </div>