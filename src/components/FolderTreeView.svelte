<script lang="ts">
	import type { Folder } from '$lib/types';
	import FolderListItem from './FolderListItem.svelte';

	type $$Props = {
		folders: Folder[];
		workspaceId: string;
		selectedFolderId: string | null;
		editingFolderId: string | null;
	};

	let { 
		folders, 
		workspaceId, 
		selectedFolderId = $bindable(),
		editingFolderId = $bindable() 
	} = $props();

</script>

<div class="flex flex-col gap-1">
	{#each folders as folder (folder.id)}
		<FolderListItem
			{folder}
			{workspaceId}
			bind:selectedFolderId
			bind:editingFolderId
		/>
{/each} 
</div> 