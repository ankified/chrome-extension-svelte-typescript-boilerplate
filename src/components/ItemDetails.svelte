<script lang="ts">
    import type { BookmarkItem } from "$lib/types";
    import { Badge } from "$lib/components/ui/badge";
    import { appDataStore } from "$lib/storage";

    let { item }: { item: BookmarkItem } = $props();

    const tagNames = $derived(
        item.tags?.map(tagId => $appDataStore?.tags.find(t => t.id === tagId)?.name).filter(Boolean) ?? []
    );
</script>

<div class="p-4 flex flex-col gap-4 text-sm">
    <h3 class="text-lg font-semibold truncate" title={item.title}>{item.title}</h3>

    <div>
        <h4 class="font-semibold text-muted-foreground mb-1">URL</h4>
        <a href={item.url} target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:underline break-all">{item.url}</a>
    </div>

    <div>
        <h4 class="font-semibold text-muted-foreground mb-1">Created</h4>
        <p>{new Date(item.createdAt).toLocaleString()}</p>
    </div>

    {#if item.reminder}
    <div>
        <h4 class="font-semibold text-muted-foreground mb-1">Reminder</h4>
        <p>{new Date(item.reminder).toLocaleString()}</p>
    </div>
    {/if}
    
    {#if item.comment}
    <div>
        <h4 class="font-semibold text-muted-foreground mb-1">Comment</h4>
        <p class="whitespace-pre-wrap">{item.comment}</p>
    </div>
    {/if}

    {#if tagNames.length > 0}
    <div>
        <h4 class="font-semibold text-muted-foreground mb-1">Tags</h4>
        <div class="flex flex-wrap gap-2">
            {#each tagNames as tagName (tagName)}
                <Badge variant="secondary">{tagName}</Badge>
            {/each}
        </div>
    </div>
    {/if}

    {#if item.accessHistory && item.accessHistory.length > 0}
    <div>
        <h4 class="font-semibold text-muted-foreground mb-1">Access History</h4>
        <ul class="list-disc pl-5 space-y-1 max-h-48 overflow-y-auto">
            {#each item.accessHistory as record (record.timestamp)}
                <li>{new Date(record.timestamp).toLocaleString()}</li>
            {/each}
        </ul>
    </div>
    {/if}
</div> 