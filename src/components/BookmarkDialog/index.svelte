<script lang="ts">
  import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
  } from "$lib/components/ui/dialog";
  import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
  import { Badge } from '$lib/components/ui/badge';
	import * as Select from '$lib/components/ui/select';
	import * as Carousel from '$lib/components/ui/carousel';
	import * as Popover from '$lib/components/ui/popover';
	import { Calendar } from '$lib/components/ui/calendar';
  import CalendarIcon from 'lucide-svelte/icons/calendar';
	import X from 'lucide-svelte/icons/x';
	import Minus from 'lucide-svelte/icons/minus';
	import Plus from 'lucide-svelte/icons/plus';
	import Pencil from 'lucide-svelte/icons/pencil';
	import { toast } from 'svelte-sonner';
  import type { DateValue } from "@internationalized/date";
  import { CalendarDate, getLocalTimeZone } from "@internationalized/date";
	import type { Folder } from '$lib/types';
  import {
		addBookmark,
		appDataStore,
		getAppData,
		addFolder
	} from '$lib/storage';

  let { 
    open = false, 
    onClose = () => {},
    initialTitle = '',
    initialUrl = '',
    initialFavicon = null,
  } = $props();

  // --- State from Popup.svelte ---
	let url = $state(initialUrl);
	let comment = $state('');
	let tags = $state<string[]>([]);
	let newTag = $state('');
	let title = $state(initialTitle);
	let favicon = $state<string | null>(initialFavicon);
	let reminderDate = $state<CalendarDate | undefined>(undefined);
	let reminderTime = $state<string | null>(null);
	let isEditingTitle = $state(false);
	let titleBeforeEdit = $state('');
	let folders = $state<Folder[]>([]);
	let selectedFolderId = $state<string>('root'); // Default to root
	let newFolderName = $state('');

  const groupTriggerContent = $derived(
		folders.find((g) => g.id === selectedFolderId)?.name ?? 'Select a folder'
	);

  const timeSlots = Array.from({ length: 96 }, (_, i) => {
		const totalMinutes = i * 15;
		const hour = Math.floor(totalMinutes / 60);
		const minute = totalMinutes % 60;
		return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
	});

  // --- Effects from Popup.svelte ---
  $effect(() => {
    // Apenas carrega as pastas, os dados da página agora vêm das props
    loadFolders();
  });

  // --- Logic from Popup.svelte ---
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
			onClose(); // Close the dialog
		} catch (error: any) {
			console.error("Failed to save bookmark:", error);
			toast.error("Failed to save bookmark", { description: error.message });
		}
	}

  function handleAddTag() {
		if (newTag && !tags.includes(newTag)) {
			tags = [...tags, newTag];
		}
		newTag = '';
	}

	function handleRemoveTag(tagToRemove: string) {
		tags = tags.filter((t) => t !== tagToRemove);
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
</script>

<Dialog bind:open onOpenChange={(v) => !v && onClose()}>
  <DialogContent class="sm:max-w-[625px] grid-rows-[auto,1fr,auto]">
    <DialogHeader>
      <DialogTitle>Add Bookmark</DialogTitle>
     
    </DialogHeader>
    
    <div class="grid gap-4 py-4 overflow-y-auto pr-6">
      <!-- Section for Item Preview -->
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
                <Button variant="ghost" size="icon" class="w-7 h-7 flex-shrink-0" onclick={() => isEditingTitle = false}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="M20 6 9 17l-5-5"/></svg>
                </Button>
                <Button variant="ghost" size="icon" class="w-7 h-7 flex-shrink-0" onclick={() => { title = titleBeforeEdit; isEditingTitle = false; }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </Button>
              </div>
            {:else}
              <div class="flex items-center justify-between gap-2">
                <Card.Title class="text-sm font-medium leading-none truncate" title={title || 'Page Title'}>{title || 'Page Title'}</Card.Title>
                <Button variant="ghost" size="icon" class="w-7 h-7 flex-shrink-0" onclick={() => { titleBeforeEdit = title; isEditingTitle = true; }}>
                  <Pencil class="h-4 w-4" />
                </Button>
              </div>
            {/if}
            <Card.Description class="text-xs text-muted-foreground truncate" title={url || 'Page URL'}>{url || 'Page URL'}</Card.Description>
          </div>
        </Card.Header>
      </Card.Root>

      <!-- Section for Group Selector -->
			<div class="grid gap-2">
				<Label for="group">Folder</Label>
				<Select.Root type="single" bind:value={selectedFolderId}>
					<Select.Trigger class="w-full">
						{groupTriggerContent}
					</Select.Trigger>
					<Select.Content>
						<Select.Group>
							<Select.Label>Folders</Select.Label>
							<Select.Item value="root" label="Root">Root</Select.Item>
							{#each folders as folder (folder.id)}
								<Select.Item value={folder.id} label={folder.name}>
									{folder.name}
								</Select.Item>
							{/each}
						</Select.Group>
						<Select.Separator />
						<div class="p-2 flex items-center gap-2">
							<Input placeholder="New folder name..." bind:value={newFolderName} onkeydown={(e) => e.key === 'Enter' && handleCreateFolder()} class="h-9" />
							<Button variant="outline" size="sm" onclick={handleCreateFolder}>Create</Button>
						</div>
					</Select.Content>
				</Select.Root>
			</div>

      <!-- Section for Comments -->
      <div class="grid gap-2">
        <Label for="comment">Comment</Label>
        <Textarea id="comment" placeholder="Add a comment..." bind:value={comment} />
      </div>

      <!-- Section for Metadata -->
			<div class="grid gap-2">
				<div class="space-y-2">
					<Label>Tags</Label>
					<div class="flex items-center gap-2">
						<Popover.Root>
							<Popover.Trigger>
								<Button variant="outline" size="sm">+ Tag</Button>
							</Popover.Trigger>
							<Popover.Content class="w-auto p-2">
								<div class="flex gap-2">
									<Input placeholder="New tag" bind:value={newTag} onkeydown={(e) => e.key === 'Enter' && handleAddTag()} />
									<Button onclick={handleAddTag}>Add</Button>
								</div>
							</Popover.Content>
						</Popover.Root>
						<div class="w-full min-w-0">
							<Carousel.Root class="w-full">
								<Carousel.Content class="-ml-1">
									{#each tags as tag}
										<Carousel.Item class="basis-auto pl-1">
											<Badge variant="secondary" class="flex items-center gap-1 pr-1">
												{tag}
												<button onclick={() => handleRemoveTag(tag)} class="flex h-4 w-4 items-center justify-center rounded-full hover:bg-background">
													<X class="h-3 w-3" />
													<span class="sr-only">Remove tag</span>
												</button>
											</Badge>
										</Carousel.Item>
									{/each}
								</Carousel.Content>
							</Carousel.Root>
						</div>
					</div>
				</div>
				<div class="space-y-2">
					<Label>Reminder</Label>
					<Popover.Root>
						<Popover.Trigger>
							<Button variant="outline" class="justify-start">
								<CalendarIcon class="mr-2 h-4 w-4" />
								{#if reminderDate && reminderTime}
									{reminderDate.toDate(getLocalTimeZone()).toLocaleDateString()}
									<span class="flex items-center ml-2">
										<button onclick={(e) => { e.stopPropagation(); decrementMinute(); }} class="p-1 hover:bg-accent rounded"><Minus class="h-3 w-3" /></button>
										<span class="mx-1">{reminderTime}</span>
										<button onclick={(e) => { e.stopPropagation(); incrementMinute(); }} class="p-1 hover:bg-accent rounded"><Plus class="h-3 w-3" /></button>
									</span>
								{:else}
									Set a date and time
								{/if}
							</Button>
						</Popover.Trigger>
						<Popover.Content class="w-auto p-0">
							<Card.Root class="gap-0 p-0">
								<Card.Content class="relative p-0 md:pr-32 flex flex-row">
									<div class="p-4 flex-1">
										<Calendar type="single" bind:value={reminderDate} class="bg-transparent p-0 [--cell-size:--spacing(8)] md:[--cell-size:--spacing(10)] [&_[data-outside-month]]:hidden" weekdayFormat="short" />
									</div>
									<div class="no-scrollbar inset-y-0 right-0 flex max-h-64 w-full scroll-pb-4 flex-col gap-2 overflow-y-auto border-t p-4 md:absolute md:max-h-none md:w-32 md:border-l md:border-t-0 md:gap-2 md:p-4 flex-1">
										<div class="grid gap-2">
											{#each timeSlots as time (time)}
												<Button variant={reminderTime === time ? "default" : "outline"} onclick={() => (reminderTime = time)} class="w-full shadow-none text-xs py-1">{time}</Button>
											{/each}
										</div>
									</div>
								</Card.Content>
							</Card.Root>
						</Popover.Content>
					</Popover.Root>
				</div>
			</div>
    </div>

    <DialogFooter>
      <Button variant="outline" onclick={onClose}>Cancel</Button>
      <Button onclick={handleSave}>Save Bookmark</Button>
    </DialogFooter>
  </DialogContent>
</Dialog> 