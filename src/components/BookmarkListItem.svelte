<script lang="ts">
	import type { BookmarkItem } from '$lib/types';
	import { Button } from '$lib/components/ui/button';
	import Tags from 'lucide-svelte/icons/tags';
	import Calendar from 'lucide-svelte/icons/calendar';
	import MessageSquare from 'lucide-svelte/icons/message-square';

	let {
		item,
		isSelected = false,
		onclick
	}: {
		item: BookmarkItem;
		isSelected?: boolean;
		onclick?: (event: MouseEvent) => void;
	} = $props();
</script>

<Button
	variant={isSelected ? 'secondary' : 'ghost'}
	class="w-full h-12 justify-start items-center text-left !bg-pink-500 border border-pink-500"
	{onclick}
>
	<div class="flex items-center gap-3 w-full overflow-hidden">
		{#if item.faviconUrl}
			<img src={item.faviconUrl} alt="Favicon" class="w-5 h-5 object-contain flex-shrink-0" />
		{:else}
			<div
				class="w-5 h-5 flex-shrink-0 rounded-sm bg-muted-foreground flex items-center justify-center"
			>
				<span class="text-xs text-muted">🌐</span>
			</div>
		{/if}
		<div class="flex-1 min-w-0">
			<p class="truncate font-medium">{item.title}</p>
			<a
				href={item.url}
				target="_blank"
				rel="noopener noreferrer"
				class="block truncate text-xs text-muted-foreground hover:underline"
				onclick={(e) => e.stopPropagation()}
				title={item.url}
			>
				{item.url}
			</a>
		</div>
		<div class="flex items-center gap-2 text-muted-foreground ml-auto flex-shrink-0">
			{#if item.tags && item.tags.length > 0}
				<span title="Has tags">
					<Tags class="h-4 w-4" />
				</span>
			{/if}
			{#if item.reminder}
				<span title="Has a reminder">
					<Calendar class="h-4 w-4" />
				</span>
			{/if}
			{#if item.comment}
				<span title="Has a comment">
					<MessageSquare class="h-4 w-4" />
				</span>
			{/if}
		</div>
	</div>
</Button> 