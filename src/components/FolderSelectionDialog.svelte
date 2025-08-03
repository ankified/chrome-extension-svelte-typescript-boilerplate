<script lang="ts">
	import * as Select from '$lib/components/ui/select';
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import MoreHorizontal from 'lucide-svelte/icons/more-horizontal';
	import FolderPlus from 'lucide-svelte/icons/folder-plus';
	import { toast } from 'svelte-sonner';

	import {
		appDataStore,
		addWorkspace,
		updateWorkspace,
		deleteWorkspace,
		addFolder
	} from '$lib/storage';
	import type { BookmarkItem, Folder, Workspace } from '$lib/types';
	import FolderTreeView from './FolderTreeView.svelte';
	import { getFolderTree } from '$lib/utils';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import CustomDialog from './CustomDialog.svelte';

	type $$Props = {
		open?: boolean;
		initialWorkspaceId: string | null;
		initialFolderId: string | null;
		onClose: () => void;
		onSelect: (workspaceId: string, folderId: string) => void;
	};

	let {
		open = $bindable(),
		initialWorkspaceId,
		initialFolderId,
		onClose,
		onSelect
	} = $props();

	let activeWorkspaceId = $state(initialWorkspaceId);
	let selectedFolderId = $state(initialFolderId);
	let editingFolderId = $state<string | null>(null);

	// When app data loads, if no workspace is selected, select the first one.
	$effect(() => {
		if ($appDataStore && !activeWorkspaceId) {
			activeWorkspaceId = $appDataStore.workspaces[0]?.id ?? null;
		}
	});

	// When the dialog opens, sync state with initial props
	$effect(() => {
		if (open) {
			activeWorkspaceId = initialWorkspaceId;
			selectedFolderId = initialFolderId;
			// If no workspace is initially selected, default to the first one.
			if (!activeWorkspaceId && $appDataStore?.workspaces && $appDataStore.workspaces.length > 0) {
				activeWorkspaceId = $appDataStore.workspaces[0].id;
			}
		}
	});

	const workspaces = $derived($appDataStore?.workspaces ?? []);
	const activeWorkspace = $derived(workspaces.find((ws) => ws.id === activeWorkspaceId));

	const folderTree = $derived(activeWorkspace ? getFolderTree(activeWorkspace.children) : []);

	// Handlers for workspace/folder management (copied and adapted from BookmarkList.svelte)
	async function handleAddNewWorkspace() {
		const name = prompt('Enter the name for the new workspace:');
		if (name && name.trim()) {
			try {
				const newWorkspace = await addWorkspace(name.trim());
				activeWorkspaceId = newWorkspace.id;
				toast.success(`Workspace "${name}" created.`);
			} catch (error: any) {
				toast.error('Failed to create workspace', { description: error.message });
			}
		}
	}

	async function handleRenameWorkspace() {
		if (!activeWorkspace) return;
		const newName = prompt('Enter the new name for the workspace:', activeWorkspace.name);
		if (newName && newName.trim()) {
			try {
				await updateWorkspace(activeWorkspace.id, newName.trim());
				toast.success(`Workspace renamed to "${newName}".`);
			} catch (error: any) {
				toast.error('Failed to rename workspace', { description: error.message });
			}
		}
	}

	async function handleDeleteWorkspace() {
		if (!activeWorkspace) return;
		if (
			confirm(
				`Are you sure you want to delete the workspace "${activeWorkspace.name}"? This cannot be undone.`
			)
		) {
			try {
				await deleteWorkspace(activeWorkspace.id);
				activeWorkspaceId = $appDataStore?.workspaces[0]?.id ?? null;
				toast.success(`Workspace "${activeWorkspace.name}" deleted.`);
			} catch (error: any) {
				toast.error('Failed to delete workspace', { description: error.message });
			}
		}
	}

	async function handleAddNewFolder() {
		if (!activeWorkspaceId) return;
		const name = prompt('Enter the name for the new folder:');
		if (name && name.trim()) {
			try {
				// Adds to the root of the active workspace
				const newFolder = await addFolder(activeWorkspaceId, activeWorkspaceId, {
					name: name.trim()
				});
				selectedFolderId = newFolder.id; // Auto-select the new folder
				toast.success(`Folder "${name}" created.`);
			} catch (error: any) {
				toast.error('Failed to create new folder', { description: error.message });
			}
		}
	}

	function handleConfirmSelection() {
		if (activeWorkspaceId && selectedFolderId) {
			onSelect(activeWorkspaceId, selectedFolderId);
			onClose();
		} else {
			toast.error('Please select a workspace and a folder.');
		}
	}
</script>

<CustomDialog bind:open {onClose}>
	{#snippet title()}
		<h2 class="text-lg font-semibold leading-none tracking-tight">Select a Folder</h2>
	{/snippet}

	{#snippet footer()}
		<Button variant="outline" onclick={onClose}>Cancel</Button>
		<Button onclick={handleConfirmSelection}>Confirm</Button>
	{/snippet}

	<div class="flex flex-col gap-4 py-4">
		<!-- Workspace Selector -->
		<div class="flex items-center gap-1">
			<Select.Root
				type="single"
				value={activeWorkspaceId}
				onValueChange={(v) => {
					if (v) {
						activeWorkspaceId = v;
					}
					selectedFolderId = null;
				}}
			>
				<Select.Trigger class="flex-1">
					{activeWorkspace?.name ?? 'Select a workspace'}
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
					<DropdownMenu.Item onclick={handleRenameWorkspace} disabled={!activeWorkspace}
						>Rename Workspace</DropdownMenu.Item
					>
					<DropdownMenu.Item
						onclick={handleDeleteWorkspace}
						disabled={!activeWorkspace || workspaces.length <= 1}>Delete Workspace</DropdownMenu.Item
					>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		</div>

		<!-- Folders -->
		<ScrollArea class="border rounded-md min-h-[250px] max-h-[40vh]">
			<div class="p-2">
				{#if activeWorkspace}
					{#if folderTree.length > 0}
						<FolderTreeView
							folders={folderTree}
							bind:selectedFolderId
							bind:editingFolderId
							workspaceId={activeWorkspaceId}
						/>
					{:else}
						<div
							class="text-center text-sm text-muted-foreground p-4 flex flex-col items-center justify-center h-full gap-2"
						>
							<p>No folders in this workspace.</p>
						</div>
					{/if}
					<Button variant="ghost" size="sm" class="w-full justify-start mt-2" onclick={handleAddNewFolder}>
						<FolderPlus class="mr-2 h-4 w-4" />
						Create New Folder
					</Button>
				{:else}
					<div
						class="text-center text-sm text-muted-foreground p-4 flex flex-col items-center justify-center h-full gap-2"
					>
						<p>Select a workspace to see its folders.</p>
					</div>
				{/if}
			</div>
		</ScrollArea>
	</div>
</CustomDialog> 