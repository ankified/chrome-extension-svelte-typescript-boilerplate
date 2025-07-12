<script lang="ts">
	import type { BookmarkItem, Folder } from '$lib/types';
	import * as Collapsible from '$lib/components/ui/collapsible';
    import { ChevronRight, Folder as FolderIcon, Link } from 'lucide-svelte';
	import Node from './Node.svelte'; // Self-import for recursion

	let {
		node,
		level = 0,
		onviewdetails
	} = $props<{
		node: Folder | BookmarkItem;
		level?: number;
		onviewdetails: (item: BookmarkItem) => void;
	}>();

	const isFolder = $derived('children' in node);

	function handleClick() {
		if (!isFolder) {
			onviewdetails(node as BookmarkItem);
		}
	}
</script>

{#if isFolder}
	<Collapsible.Root class="w-full">
		<Collapsible.Trigger class="flex items-center gap-2 p-2 rounded-md hover:bg-accent w-full text-left">
            <ChevronRight class="h-4 w-4 transition-transform duration-200 [&[data-state=open]]:rotate-90" />
			<FolderIcon class="h-4 w-4" />
			<span>{node.name}</span>
		</Collapsible.Trigger>
		<Collapsible.Content class="pl-6 border-l ml-4">
			{#each node.children as child}
				<Node node={child} level={level + 1} {onviewdetails} />
			{/each}
		</Collapsible.Content>
	</Collapsible.Root>
{:else}
	<button onclick={handleClick} class="flex items-center gap-2 p-2 rounded-md hover:bg-accent w-full text-left">
        <Link class="h-4 w-4" />
		<span>{(node as BookmarkItem).title}</span>
	</button>
{/if} 