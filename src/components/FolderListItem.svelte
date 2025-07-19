<script lang="ts">
    import type { Folder } from "$lib/types";
    import { Button } from "$lib/components/ui/button";
    import FolderIcon from 'lucide-svelte/icons/folder';

    let {
        folder,
        onSelect
    }: {
        folder: Folder;
        onSelect: (id: string) => void;
    } = $props();
</script>

<Button
    variant="ghost"
    class="w-full h-12 justify-start items-center text-left"
    onclick={() => onSelect(folder.id)}
>
    <div class="flex items-center gap-3 w-full">
        <FolderIcon class="h-5 w-5 flex-shrink-0" />
        <div class="flex-1 min-w-0">
            <p class="truncate font-medium">{folder.name}</p>
        </div>
    </div>
</Button> 