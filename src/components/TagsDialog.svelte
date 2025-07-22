<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { toast } from 'svelte-sonner';
	import { createTag, appDataStore } from '$lib/storage';
	import type { Tag } from '$lib/types';

	type $$Props = {
		open?: boolean;
		initialSelectedIds: string[];
		onClose: () => void;
		onSave: (selectedIds: string[]) => void;
	};

	let {
		open = $bindable(),
		initialSelectedIds,
		onClose,
		onSave
	} = $props();

	let selectedIds = $state(new Set(initialSelectedIds));
	let newTag = $state('');

	// When the dialog opens, sync state with initial props
	$effect(() => {
		if (open) {
			selectedIds = new Set(initialSelectedIds);
		}
	});

	async function handleCreateAndSelectTag() {
		if (!newTag.trim()) return;
		try {
			const createdTag = await createTag({ name: newTag.trim() });
			if (createdTag) {
				selectedIds.add(createdTag.id);
				selectedIds = selectedIds; // Trigger reactivity
			}
			newTag = '';
		} catch (error: any) {
			console.error('Failed to create tag:', error);
			toast.error('Failed to create tag', { description: error.message });
		}
	}

	function handleToggleTag(tagId: string) {
		if (selectedIds.has(tagId)) {
			selectedIds.delete(tagId);
		} else {
			selectedIds.add(tagId);
		}
		selectedIds = selectedIds; // Trigger reactivity
	}

	function handleSave() {
		onSave(Array.from(selectedIds));
		onClose();
	}
</script>

<Dialog.Root bind:open onOpenChange={(v) => !v && onClose()}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Select Tags</Dialog.Title>
		</Dialog.Header>

		<div class="grid gap-4 py-4">
			<div class="flex flex-col gap-2 max-h-48 overflow-y-auto">
				{#if $appDataStore && $appDataStore.tags.length > 0}
					{#each $appDataStore.tags as tag (tag.id)}
						<div class="flex items-center gap-2">
							<Checkbox
								id={`tag-dialog-${tag.id}`}
								checked={selectedIds.has(tag.id)}
								onCheckedChange={() => handleToggleTag(tag.id)}
							/>
							<Label for={`tag-dialog-${tag.id}`} class="font-normal">{tag.name}</Label>
						</div>
					{/each}
				{:else}
					<p class="text-sm text-muted-foreground">No tags exist.</p>
				{/if}
			</div>
			<div class="flex items-center gap-2 border-t pt-4">
				<Input
					placeholder="New tag..."
					bind:value={newTag}
					onkeydown={(e) => e.key === 'Enter' && handleCreateAndSelectTag()}
				/>
				<Button onclick={handleCreateAndSelectTag}>Create</Button>
			</div>
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={onClose}>Cancel</Button>
			<Button onclick={handleSave}>Save</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root> 