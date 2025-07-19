<script lang="ts">
	import type { Folder } from '$lib/types';
	import { Button } from '$lib/components/ui/button';

	let {
		folders,
		level = 0,
		selectedFolderId,
		onSelect
	}: {
		folders: Folder[];
		level?: number;
		selectedFolderId: string;
		onSelect: (id: string) => void;
	} = $props();
</script>

{#each folders as folder}
	<Button
		variant={selectedFolderId === folder.id ? 'secondary' : 'ghost'}
		class="w-full justify-start h-8"
		style="padding-left: {level * 1.5}rem;"
		onclick={() => onSelect(folder.id)}
	>
		<!-- Basic folder icon placeholder -->
		<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2 h-4 w-4"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"></path></svg>
		{folder.name}
	</Button>
	{#if folder.children && folder.children.length > 0}
		<svelte:self
			folders={folder.children.filter((c): c is Folder => 'children' in c)}
			{level}
			{selectedFolderId}
			{onSelect}
		/>
	{/if}
{/each} 