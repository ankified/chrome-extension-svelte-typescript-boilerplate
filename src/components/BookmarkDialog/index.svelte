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
	import type { BookmarkItem, Folder, Tag } from '$lib/types';
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

  let { 
    open = false, 
    onClose = () => {},
    initialTitle = '',
    initialUrl = '',
    initialFavicon = null,
  } = $props();

  let currentTab = $state('add');

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
	let folders = $state<Folder[]>([]);
	let selectedFolderId = $state<string>('root'); 
	let newFolderName = $state('');

  // --- State for View Bookmarks Tab ---
	let detailsSheetOpen = $state(false);
	let selectedItem = $state<BookmarkItem | null>(null);
	let isEditingDetails = $state(false);
	let editableTags = $state('');

  const groupTriggerContent = $derived(
    ($appDataStore ? $appDataStore.folders.find((f: Folder) => f.id === selectedFolderId)?.name : undefined) ??
    (folders.find((g) => g.id === selectedFolderId)?.name) ?? 
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
    loadFolders();
  });

  $effect(() => {
    if (!reminderDate) {
      availableTimeSlots = timeSlots;
      return;
    }

    const now = today(getLocalTimeZone());
    const comparison = reminderDate.compare(now);
    let newSlots;

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

    if (reminderTime && !availableTimeSlots.includes(reminderTime)) {
      reminderTime = null;
    }
  });

  async function loadFolders() {
		const data = await getAppData();
		const rootFolder = data.folders.find(f => f.id === 'root');
		if (rootFolder) {
			folders = rootFolder.children.filter(
				(child): child is Folder => 'children' in child
			);
		}
	}

  async function handleCreateFolder() {
		if (!newFolderName.trim()) return;
		try {
			const newFolder = await addFolder('root', { name: newFolderName.trim() });
			toast.success(`Folder "${newFolder.name}" created.`);
			newFolderName = '';
			await loadFolders();
			selectedFolderId = newFolder.id;
		} catch (error: any) {
			console.error("Failed to create folder:", error);
			toast.error("Failed to create folder", { description: error.message });
		}
	}

  async function handleSave() {
		if (!url || !title) {
			toast.error("URL and Title are required.");
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
			await addBookmark(selectedFolderId, {
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
  function handleViewDetails(item: BookmarkItem) {
		const clonedItem = JSON.parse(JSON.stringify(item));
		selectedItem = clonedItem;
		editableTags = clonedItem.tags?.join(', ') ?? '';
		detailsSheetOpen = true;
    isEditingDetails = false;
	}

	async function handleUpdateDetails() {
		if (!selectedItem) return;
		selectedItem.tags = editableTags.split(',').map((t) => t.trim()).filter(Boolean);
		try {
			await updateBookmark(selectedItem);
			isEditingDetails = false;
		} catch (e) {
			console.error('Failed to update bookmark:', e);
		}
	}

	async function handleDeleteDetails() {
		if (!selectedItem) return;
		if (confirm('Are you sure you want to delete this item?')) {
			try {
				await deleteBookmark(selectedItem.id);
				detailsSheetOpen = false;
				selectedItem = null;
			} catch (e) {
				console.error('Failed to delete bookmark:', e);
			}
		}
	}
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
            <Card.Root>
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
                <div class="grid gap-1 flex-1 min-w-0">
                  {#if isEditingTitle}
                    <div class="flex items-center gap-1">
                      <Input id="title-editor" bind:value={title} class="h-7 text-sm" onkeydown={(e) => { if (e.key === 'Enter') isEditingTitle = false; else if (e.key === 'Escape') { title = titleBeforeEdit; isEditingTitle = false; } }} />
                      <Button variant="ghost" size="icon" class="w-7 h-7 flex-shrink-0" onclick={() => isEditingTitle = false} aria-label="Confirm Title">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="M20 6 9 17l-5-5"/></svg>
                      </Button>
                    </div>
                  {:else}
                    <div class="flex items-center justify-between gap-2">
                      <Card.Title class="text-sm font-medium leading-none truncate" title={title || 'Page Title'}>{title || 'Page Title'}</Card.Title>
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
              <!-- Tags Popover -->
              <Popover.Root>
                <Popover.Trigger>
                  <Button variant="outline" size="sm" class="w-full">
                    <Tags class="mr-2 h-4 w-4" />
                    Tags ({tags.length})
                  </Button>
                </Popover.Trigger>
                <Popover.Content class="w-[250px]">
                  <div class="grid gap-4">
                      <h4 class="font-medium leading-none">Select Tags</h4>
                      <div class="flex flex-col gap-2 max-h-48 overflow-y-auto">
                          {#if $appDataStore && $appDataStore.tags.length > 0}
                              {#each $appDataStore.tags as tag (tag.id)}
                                  <div class="flex items-center gap-2">
                                      <Checkbox id={`tag-${tag.id}`} checked={tags.includes(tag.id)} onCheckedChange={() => handleToggleTag(tag.id)} />
                                      <Label for={`tag-${tag.id}`} class="font-normal">{tag.name}</Label>
                                  </div>
                              {/each}
                          {:else}
                              <p class="text-sm text-muted-foreground">No tags exist.</p>
                          {/if}
                      </div>
                      <div class="flex items-center gap-2 border-t pt-2">
                          <Input placeholder="New tag..." bind:value={newTag} onkeydown={(e) => e.key === 'Enter' && handleCreateAndSelectTag()} />
                          <Button onclick={handleCreateAndSelectTag}>Create</Button>
                      </div>
                  </div>
                </Popover.Content>
              </Popover.Root>
              
              <!-- Reminder Popover -->
              <Popover.Root>
                <Popover.Trigger>
                  <Button variant="outline" size="sm" class="w-full justify-start">
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
                </Popover.Trigger>
                <Popover.Content class="w-auto p-0">
                    <Card.Root class="gap-0 p-0">
                        <Card.Content class="relative p-0 md:pr-32 flex flex-col md:flex-row">
                            <div class="p-4 flex-1">
                                <Calendar
                                    type="single"
                                    bind:value={reminderDate}
                                    class="bg-transparent p-0 [--cell-size:--spacing(8)] md:[--cell-size:--spacing(10)] [&_[data-outside-month]]:hidden"
                                    weekdayFormat="short"
                                />
                            </div>
                            <div
                              class="no-scrollbar inset-y-0 right-0 flex max-h-64 w-full scroll-pb-4 flex-col gap-2 overflow-y-auto border-t p-4 md:absolute md:max-h-none md:w-32 md:border-l md:border-t-0 md:gap-2 md:p-4"
                            >
                              {#if reminderDate}
                                <div class="grid gap-2">
                                  {#each availableTimeSlots as time (time)}
                                    <Button
                                      variant={reminderTime === time ? 'default' : 'outline'}
                                      class="w-full shadow-none text-xs py-1"
                                      onclick={() => (reminderTime = time)}
                                    >
                                      {time}
                                    </Button>
                                  {/each}
                                </div>
                                {#if availableTimeSlots.length === 0}
                                  <div class="flex h-full items-center justify-center">
                                    <p class="text-xs text-muted-foreground text-center">Nenhum horário disponível.</p>
                                  </div>
                                {/if}
                              {:else}
                                <div class="flex h-full items-center justify-center">
                                  <p class="text-xs text-muted-foreground text-center">Selecione uma data para ver os horários.</p>
                                </div>
                              {/if}
                            </div>
                        </Card.Content>
                    </Card.Root>
                </Popover.Content>
              </Popover.Root>

              <!-- Folder Popover -->
              <Popover.Root>
                <Popover.Trigger>
                  <Button variant="outline" size="sm" class="w-full truncate">
                    <FolderIcon class="mr-2 h-4 w-4 flex-shrink-0" />
                    <span class="truncate">{groupTriggerContent}</span>
                  </Button>
                </Popover.Trigger>
                <Popover.Content class="w-[250px]">
                  <div class="grid gap-4">
                    <h4 class="font-medium leading-none">Select Folder</h4>
                    <div class="flex flex-col gap-1 max-h-48 overflow-y-auto">
                      <Button variant={selectedFolderId === 'root' ? 'secondary' : 'ghost'} onclick={() => (selectedFolderId = 'root')} class="w-full justify-start">Root</Button>
                        {#each folders as folder (folder.id)}
                         <Button variant={selectedFolderId === folder.id ? 'secondary' : 'ghost'} onclick={() => (selectedFolderId = folder.id)} class="w-full justify-start">{folder.name}</Button>
                        {/each}
                      </div>
                    <div class="flex items-center gap-2 border-t pt-2">
                      <Input placeholder="New folder..." bind:value={newFolderName} onkeydown={(e) => e.key === 'Enter' && handleCreateFolder()} />
                      <Button onclick={handleCreateFolder}>Create</Button>
                    </div>
                  </div>
                </Popover.Content>
              </Popover.Root>
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
          <BookmarkList onviewdetails={handleViewDetails} />
        </Tabs.Content>

       {#if currentTab === 'add'}
         <div class="p-6 pt-2 border-t">
           <Button onclick={handleSave} class="w-full">Save Bookmark</Button>
          </div>
       {/if}
      </Tabs.Root>

      <!-- Details Sheet for selected bookmark -->
      {#if selectedItem}
        <Sheet.Root
          bind:open={detailsSheetOpen}
          onOpenChange={(isOpen) => { if (!isOpen) isEditingDetails = false; }}
        >
          <Sheet.Content class="w-[400px] sm:w-[540px]">
            <Sheet.Header>
              {#if isEditingDetails}
                <Input bind:value={selectedItem.title} class="text-lg font-semibold" />
              {:else}
                <Sheet.Title>{selectedItem.title}</Sheet.Title>
              {/if}
              <Sheet.Description>
                <a href={selectedItem.url} target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:underline truncate block">
                  {selectedItem.url}
                </a>
              </Sheet.Description>
            </Sheet.Header>
            <div class="grid gap-4 py-4">
              <!-- Details form fields -->
              <div class="grid gap-2">
                <h4 class="font-semibold">Comment</h4>
                {#if isEditingDetails}
                  <Textarea bind:value={selectedItem.comment} placeholder="Add a comment..." />
                {:else}
                  <p class="text-sm text-muted-foreground">{selectedItem.comment || 'No comment.'}</p>
                {/if}
              </div>
              <div class="grid gap-2">
                <h4 class="font-semibold">Tags</h4>
                {#if isEditingDetails}
                  <Input bind:value={editableTags} placeholder="design, code..." />
                {:else}
                  <p class="text-sm text-muted-foreground">{selectedItem.tags?.join(', ') || 'No tags.'}</p>
                {/if}
              </div>
            </div>
            <Sheet.Footer class="flex justify-between">
              <div>
                 <Button variant="destructive" onclick={handleDeleteDetails}>Delete</Button>
              </div>
              <div class="flex gap-2">
                {#if isEditingDetails}
                 <Button variant="secondary" onclick={() => isEditingDetails = false}>Cancel</Button>
                 <Button onclick={handleUpdateDetails}>Save</Button>
                {:else}
                 <Button variant="secondary" onclick={() => isEditingDetails = true}>Edit</Button>
                 <Button onclick={() => detailsSheetOpen = false}>Close</Button>
                {/if}
              </div>
            </Sheet.Footer>
          </Sheet.Content>
        </Sheet.Root>
      {/if}
  </DialogContent>
</Dialog>