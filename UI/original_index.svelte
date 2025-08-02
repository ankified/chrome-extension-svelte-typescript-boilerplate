<script lang="ts">
  import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
  } from "$lib/components/ui/dialog";
  import * as Tabs from '$lib/components/ui/tabs';
  import { Button, buttonVariants } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
  import { Badge } from '$lib/components/ui/badge';
	import * as Popover from '$lib/components/ui/popover';
	import { Calendar } from '$lib/components/ui/calendar';
  import CalendarIcon from 'lucide-svelte/icons/calendar';
	import X from 'lucide-svelte/icons/x';
	import Pencil from 'lucide-svelte/icons/pencil';
	import BookmarkPlus from 'lucide-svelte/icons/bookmark-plus';
  import Tags from 'lucide-svelte/icons/tags'; 
  import FolderIcon from 'lucide-svelte/icons/folder';
  import { Checkbox } from '$lib/components/ui/checkbox';
	import { toast } from 'svelte-sonner';
  import type { DateValue } from "@internationalized/date";
  import { CalendarDate, getLocalTimeZone, today } from "@internationalized/date";
	import type { BookmarkItem, Folder, Tag, Workspace } from '$lib/types';
  import {
		addBookmark,
		appDataStore,
		getAppData,
		addFolder,
    updateBookmark, 
    deleteBookmark,
    createTag
	} from '$lib/storage';
  import BookmarkList from '../BookmarkList.svelte';
  import * as Sheet from '$lib/components/ui/sheet';
  import * as Carousel from '$lib/components/ui/carousel';
	import FolderSelectionDialog from '../FolderSelectionDialog.svelte';
	import ReminderDialog from '../ReminderDialog.svelte';
	import TagsDialog from '../TagsDialog.svelte';

  let { 
    open = false, 
    onClose = () => {},
    initialTitle = '',
    initialUrl = '',
    initialFavicon = null,
  } = $props();

  let currentTab = $state('add');
	let activeWorkspaceId = $state<string | null>(null);

  // --- State for Add Bookmark Tab ---
	let url = $state(initialUrl);
	let comment = $state('');
	let tags = $state<string[]>([]); // Stores selected tag IDs
	let newTag = $state('');
	let title = $state(initialTitle);
	let favicon = $state<string | null>(initialFavicon);
	let reminderDate = $state<CalendarDate | undefined>(undefined);
	let reminderTime = $state<string | null>(null);
	let isEditingTitle = $state(false);
	let titleBeforeEdit = $state('');
	let selectedFolderId = $state<string | null>(null);
	let newFolderName = $state('');

  // --- State for View Bookmarks Tab ---
	let detailsSheetOpen = $state(false);

	// --- State for Dialogs ---
	let isFolderSelectionOpen = $state(false);
	let isReminderOpen = $state(false);
	let isTagsOpen = $state(false);
	
	const selectedWorkspace = $derived(
		$appDataStore?.workspaces.find((ws) => ws.id === activeWorkspaceId)
	);

	function findFolder(nodes: (Folder | BookmarkItem)[], id: string): Folder | null {
		for (const node of nodes) {
			if ('children' in node) {
				// It's a Folder
				if (node.id === id) {
					return node;
				}
				// Recurse into the children of this folder
				const found = findFolder(node.children, id);
				if (found) {
					return found;
				}
			}
		}
		return null;
	}

  const selectedFolder = $derived(
		selectedWorkspace && selectedFolderId
			? findFolder(selectedWorkspace.children, selectedFolderId)
			: null
	);

  const groupTriggerContent = $derived(
    selectedFolder?.name ?? 
    'Select a folder'
	);

  const timeSlots = Array.from({ length: 96 }, (_, i) => {
		const totalMinutes = i * 15;
		const hour = Math.floor(totalMinutes / 60);
		const minute = totalMinutes % 60;
		return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
	});

  let availableTimeSlots = $state(timeSlots);

  $effect(() => {
    loadInitialWorkspace();
  });

  $effect(() => {
    if (!reminderDate) {
      availableTimeSlots = timeSlots;
      return;
    }

    const now = today(getLocalTimeZone());
    const comparison = reminderDate.compare(now);
    let newSlots: string[] = [];

    if (comparison < 0) { // Past
      newSlots = [];
    } else if (comparison > 0) { // Future
      newSlots = timeSlots;
    } else { // Today
      const d = new Date();
      const currentHour = d.getHours();
      const currentMinute = d.getMinutes();
      
      newSlots = timeSlots.filter((time: string) => {
        const [hour, minute] = time.split(':').map(Number);
        return hour > currentHour || (hour === currentHour && minute >= currentMinute);
      });
    }
    
    availableTimeSlots = newSlots;
  });

  async function loadInitialWorkspace() {
		const data = await getAppData();
		if (data.workspaces.length > 0) {
			const firstWorkspace = data.workspaces[0];
			activeWorkspaceId = firstWorkspace.id;
			if (!selectedFolderId) {
				selectedFolderId = firstWorkspace.id; // Default to root of the workspace
			}
		}
	}

  async function handleCreateFolder() {
		if (!newFolderName.trim() || !activeWorkspaceId) return;
		try {
			const newFolder = await addFolder(activeWorkspaceId, activeWorkspaceId, { name: newFolderName.trim() });
			toast.success(`Folder "${newFolder.name}" created.`);
			newFolderName = '';
			await loadInitialWorkspace(); // Reload folders to include the new one
			selectedFolderId = newFolder.id;
		} catch (error: any) {
			console.error("Failed to create folder:", error);
			toast.error("Failed to create folder", { description: error.message });
		}
	}

  async function handleSave() {
    if (!url || !title || !activeWorkspaceId || !selectedFolderId) {
			toast.error("URL, Title, Workspace, and Folder are required.");
			return;
		}
		try {
			let reminderTimestamp: number | undefined;
			if (reminderDate && reminderTime) {
				const [hours, minutes] = reminderTime.split(':').map(Number);
				const localDateTimeString = `${reminderDate.year}-${String(reminderDate.month).padStart(2, '0')}-${String(reminderDate.day).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
				const localDate = new Date(localDateTimeString);
				reminderTimestamp = localDate.getTime();
			}
			await addBookmark(activeWorkspaceId, selectedFolderId, {
				url,
				title,
				faviconUrl: favicon || undefined,
				comment,
				tags,
				reminder: reminderTimestamp
			});
      toast.success("Bookmark saved!");
			onClose();
		} catch (error: any) {
			console.error("Failed to save bookmark:", error);
			toast.error("Failed to save bookmark", { description: error.message });
		}
	}

  async function handleCreateAndSelectTag() {
		if (!newTag.trim()) return;
		try {
			const createdTag = await createTag({ name: newTag.trim() });
			if (createdTag && !tags.includes(createdTag.id)) {
				tags = [...tags, createdTag.id];
			}
			newTag = '';
		} catch (error: any) {
			console.error("Failed to create tag:", error);
			toast.error("Failed to create tag", { description: error.message });
		}
	}

  function handleToggleTag(tagId: string) {
    const newTags = new Set(tags);
    if (newTags.has(tagId)) {
        newTags.delete(tagId);
    } else {
        newTags.add(tagId);
    }
    tags = Array.from(newTags);
  }

	function incrementMinute() {
		if (!reminderTime) return;
		let [h, m] = reminderTime.split(':').map(Number);
		m += 1;
		if (m >= 60) {
			m = 0;
			h = (h + 1) % 24;
		}
		reminderTime = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
	}

	function decrementMinute() {
		if (!reminderTime) return;
		let [h, m] = reminderTime.split(':').map(Number);
		m -= 1;
		if (m < 0) {
			m = 59;
			h = (h - 1 + 24) % 24;
		}
		reminderTime = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
	}

  // --- Logic for View Bookmarks Tab ---

</script>

<Dialog bind:open onOpenChange={(v) => !v && onClose()}>
   <DialogContent class="sm:max-w-5xl flex flex-col h-[95vh] p-0">
     <Tabs.Root value={currentTab} onValueChange={(v) => currentTab = v} class="flex flex-col h-full">
        <DialogHeader class="p-6 pb-0">
          <DialogTitle>
            <Tabs.List class="grid w-full grid-cols-2">
              <Tabs.Trigger value="add">Add Bookmark</Tabs.Trigger>
              <Tabs.Trigger value="view">View Bookmarks</Tabs.Trigger>
            </Tabs.List>
          </DialogTitle>
        </DialogHeader>

        <Tabs.Content value="add" class="flex-1 overflow-y-auto p-6">
          <!-- Add Bookmark Form -->
          <div class="grid gap-4">
            <!-- Item Preview -->
            <Card.Root class="overflow-hidden">
              <Card.Header class="flex flex-row items-center gap-4 space-y-0 pb-2">
                <div class="h-8 w-8 rounded-md flex items-center justify-center overflow-hidden bg-muted flex-shrink-0">
                  {#if favicon}
                    <img src={favicon} alt="Favicon" class="h-full w-full object-contain" />
                  {:else}
                    <div class="h-4 w-4 bg-muted-foreground rounded-sm flex items-center justify-center">
                      <span class="text-xs text-muted">🌐</span>
                    </div>
                  {/if}
                </div>
                <div class="flex flex-col gap-1 flex-1 min-w-0">
                  {#if isEditingTitle}
                    <div class="flex items-center gap-1">
                      <Input id="title-editor" bind:value={title} class="h-7 text-sm" onkeydown={(e) => { if (e.key === 'Enter') isEditingTitle = false; else if (e.key === 'Escape') { title = titleBeforeEdit; isEditingTitle = false; } }} />
                      <Button variant="ghost" size="icon" class="w-7 h-7 flex-shrink-0" onclick={() => isEditingTitle = false} aria-label="Confirm Title">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="M20 6 9 17l-5-5"/></svg>
                      </Button>
                    </div>
                  {:else}
                    <div class="flex items-center justify-between gap-2">
                      <Card.Title class="text-sm font-medium leading-none truncate min-w-0" title={title || 'Page Title'}>{title || 'Page Title'}</Card.Title>
                      <Button variant="ghost" size="icon" class="w-7 h-7 flex-shrink-0" onclick={() => { titleBeforeEdit = title; isEditingTitle = true; }} aria-label="Edit Title">
                        <Pencil class="h-4 w-4" />
                      </Button>
                    </div>
                  {/if}
                  <Card.Description class="text-xs text-muted-foreground truncate" title={url || 'Page URL'}>{url || 'Page URL'}</Card.Description>
                </div>
              </Card.Header>
            </Card.Root>

            <!-- Comments -->
            <div class="grid gap-2">
              <Label for="comment">Comment</Label>
              <Textarea id="comment" placeholder="Add a comment..." bind:value={comment} />
            </div>

            <!-- ACTION BAR -->
            <div class="grid grid-cols-3 gap-2 pt-2">
              <!-- Tags Button -->
							<Button variant="outline" size="sm" class="w-full" onclick={() => (isTagsOpen = true)}>
								<Tags class="mr-2 h-4 w-4" />
								Tags ({tags.length})
							</Button>
              
              <!-- Reminder Button -->
							<Button variant="outline" size="sm" class="w-full justify-start" onclick={() => (isReminderOpen = true)}>
								<CalendarIcon class="mr-2 h-4 w-4" />
								{#if reminderDate && reminderTime}
									{reminderDate.toDate(getLocalTimeZone()).toLocaleDateString()}
									<span class="flex items-center ml-2">
										<button aria-label="Decrement minute" onclick={(e) => { e.stopPropagation(); decrementMinute(); }} class="p-1 hover:bg-accent rounded">
											<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-3 w-3"><path d="M5 12h14"/></svg>
										</button>
										<span class="mx-1 text-xs">{reminderTime}</span>
										<button aria-label="Increment minute" onclick={(e) => { e.stopPropagation(); incrementMinute(); }} class="p-1 hover:bg-accent rounded">
											<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-3 w-3"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
										</button>
									</span>
								{:else}
									Set a date and time
								{/if}
							</Button>

              <!-- Folder Selection Button -->
							<Button variant="outline" size="sm" class="w-full truncate" onclick={() => (isFolderSelectionOpen = true)}>
								<FolderIcon class="mr-2 h-4 w-4 flex-shrink-0" />
								<span class="truncate">
									{selectedWorkspace
										? `${selectedWorkspace.name} / ${selectedFolder?.name ?? 'Select Folder'}`
										: 'Select Folder'}
								</span>
							</Button>
            </div>

            <!-- TAGS CAROUSEL -->
            {#if tags.length > 0 && $appDataStore}
              <div class="pt-2">
                <Carousel.Root class="w-10/12 mx-auto">
                  <Carousel.Content class="-ml-4">
                      {#each tags as tagId (tagId)}
                          {@const tagName = $appDataStore.tags.find((t) => t.id === tagId)?.name}
                          {#if tagName}
                          <Carousel.Item class="basis-auto pl-4">
                              <Badge variant="secondary" class="flex items-center gap-1 pr-1">
                                  {tagName}
                                  <button onclick={() => handleToggleTag(tagId)} class="flex h-4 w-4 items-center justify-center rounded-full hover:bg-background">
                                      <X class="h-3 w-3" />
                                  </button>
                              </Badge>
                          </Carousel.Item>
                          {/if}
                      {/each}
                  </Carousel.Content>
                  <Carousel.Previous />
                  <Carousel.Next />
                </Carousel.Root>
              </div>
            {/if}
          </div>
        </Tabs.Content>

        <Tabs.Content value="view" class="flex-1 overflow-y-auto p-6">
          <!-- View Bookmarks List -->
          <BookmarkList />
        </Tabs.Content>
      </Tabs.Root>

      {#if currentTab === 'add'}
        <div class="p-6 pt-2 border-t">
          <Button onclick={handleSave} class="w-full">Save Bookmark</Button>
        </div>
      {/if}
  </DialogContent>
</Dialog>

<FolderSelectionDialog
	bind:open={isFolderSelectionOpen}
	initialWorkspaceId={activeWorkspaceId}
	initialFolderId={selectedFolderId}
	onSelect={(workspaceId: string, folderId: string) => {
		activeWorkspaceId = workspaceId;
		selectedFolderId = folderId;
	}}
	onClose={() => (isFolderSelectionOpen = false)}
/>

<ReminderDialog
	bind:open={isReminderOpen}
	initialDate={reminderDate}
	initialTime={reminderTime}
	onSave={(d: CalendarDate | undefined, t: string | null) => {
		reminderDate = d;
		reminderTime = t;
	}}
	onClose={() => (isReminderOpen = false)}
/>

<TagsDialog
	bind:open={isTagsOpen}
	initialSelectedIds={tags}
	onSave={(newSelectedIds: string[]) => {
		tags = newSelectedIds;
	}}
	onClose={() => (isTagsOpen = false)}
/>