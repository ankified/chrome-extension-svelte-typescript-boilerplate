<script lang="ts">
  import * as Dialog from '$lib/components/ui/dialog';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Textarea } from '$lib/components/ui/textarea';
  import * as Select from '$lib/components/ui/select';
  import * as Popover from '$lib/components/ui/popover';
  import { Calendar } from '$lib/components/ui/calendar';
  import { Badge } from '$lib/components/ui/badge';
  import CalendarIcon from 'lucide-svelte/icons/calendar';
  import X from 'lucide-svelte/icons/x';
  import Minus from 'lucide-svelte/icons/minus';
  import Plus from 'lucide-svelte/icons/plus';
  import Pencil from 'lucide-svelte/icons/pencil';
  import { toast } from 'svelte-sonner';
  import type { Folder } from '$lib/types';
  import { addBookmark, getAppData, addFolder } from '$lib/storage';
  import type { DateValue } from "@internationalized/date";
  import { CalendarDate, getLocalTimeZone } from "@internationalized/date";

  let { open = false, onClose = () => {} } = $props();

  let url = $state('');
  let comment = $state('');
  let tags = $state<string[]>([]);
  let newTag = $state('');
  let title = $state('');
  let favicon = $state<string | null>(null);
  let reminderDate = $state<CalendarDate | undefined>(undefined);
  let reminderTime = $state<string | null>(null);
  let isEditingTitle = $state(false);
  let titleBeforeEdit = $state('');
  let folders = $state<Folder[]>([]);
  let selectedFolderId = $state<string>('root');
  let newFolderName = $state('');

  const timeSlots = Array.from({ length: 96 }, (_, i) => {
    const totalMinutes = i * 15;
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  });

  $effect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      if (tab) {
        url = tab.url || '';
        title = tab.title || '';
        favicon = tab.favIconUrl || null;
      }
    });
    loadFolders();
  });

  async function loadFolders() {
    const data = await getAppData();
    const rootFolder = data.folders.find(f => f.id === 'root');
    if (rootFolder) {
      folders = rootFolder.children.filter((child): child is Folder => 'children' in child);
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
      toast.error("Failed to create folder", { description: error.message });
    }
  }

  async function handleSave() {
    if (!url || !title) return;
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
    toast.success('Bookmark salvo!');
    onClose();
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

<Dialog.Root bind:open>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Novo Bookmark</Dialog.Title>
    </Dialog.Header>
    <div class="grid gap-4">
      <!-- Title with edit -->
      {#if isEditingTitle}
        <div class="flex items-center gap-1">
          <Input bind:value={title} class="h-7 text-sm" />
          <Button variant="ghost" size="icon" onclick={() => isEditingTitle = false}><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="M20 6 9 17l-5-5"/></svg></Button>
          <Button variant="ghost" size="icon" onclick={() => { title = titleBeforeEdit; isEditingTitle = false; }}><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></Button>
        </div>
      {:else}
        <div class="flex items-center justify-between gap-2">
          <span class="text-sm font-medium truncate">{title || 'Título'}</span>
          <Button variant="ghost" size="icon" onclick={() => { titleBeforeEdit = title; isEditingTitle = true; }}><Pencil class="h-4 w-4" /></Button>
        </div>
      {/if}
      <!-- Comment -->
      <div class="grid gap-2">
        <Label for="comment">Comentário</Label>
        <Textarea id="comment" placeholder="Adicione um comentário..." bind:value={comment} />
      </div>
      <!-- Folders -->
      <div class="grid gap-2">
        <Label for="group">Grupo</Label>
        <Select.Root type="single" bind:value={selectedFolderId}>
          <Select.Trigger>{folders.find(g => g.id === selectedFolderId)?.name ?? 'Selecione uma pasta'}</Select.Trigger>
          <Select.Content>
            <Select.Group>
              <Select.Label>Pastas</Select.Label>
              <Select.Item value="root">Root</Select.Item>
              {#each folders as folder}
                <Select.Item value={folder.id}>{folder.name}</Select.Item>
              {/each}
            </Select.Group>
            <Select.Separator />
            <div class="p-2 flex items-center gap-2">
              <Input placeholder="Nome da nova pasta..." bind:value={newFolderName} onkeydown={(e) => e.key === 'Enter' && handleCreateFolder()} />
              <Button variant="outline" size="sm" onclick={handleCreateFolder}>Criar</Button>
            </div>
          </Select.Content>
        </Select.Root>
      </div>
      <!-- Tags -->
      <div class="space-y-2">
        <Label>Tags</Label>
        <div class="flex items-center gap-2">
          <Popover.Root>
            <Popover.Trigger><Button variant="outline" size="sm">+ Tag</Button></Popover.Trigger>
            <Popover.Content>
              <div class="flex gap-2">
                <Input placeholder="Nova tag" bind:value={newTag} onkeydown={(e) => e.key === 'Enter' && handleAddTag()} />
                <Button onclick={handleAddTag}>Adicionar</Button>
              </div>
            </Popover.Content>
          </Popover.Root>
          <div class="flex gap-1">
            {#each tags as tag}
              <Badge variant="secondary">
                {tag}
                <button onclick={() => handleRemoveTag(tag)}><X class="h-3 w-3" /></button>
              </Badge>
            {/each}
          </div>
        </div>
      </div>
      <!-- Reminder -->
      <div class="space-y-2">
        <Label>Lembrete</Label>
        <Popover.Root>
          <Popover.Trigger>
            <Button variant="outline" class="justify-start">
              <CalendarIcon class="mr-2 h-4 w-4" />
              {#if reminderDate && reminderTime}
                {reminderDate.toDate(getLocalTimeZone()).toLocaleDateString()} {reminderTime}
              {:else}
                Defina data e hora
              {/if}
            </Button>
          </Popover.Trigger>
          <Popover.Content class="w-auto p-0">
            <Calendar type="single" bind:value={reminderDate} />
            <div class="grid gap-2 p-4">
              {#each timeSlots as time}
                <Button variant={reminderTime === time ? "default" : "outline"} onclick={() => reminderTime = time}>{time}</Button>
              {/each}
            </div>
          </Popover.Content>
        </Popover.Root>
      </div>
    </div>
    <Dialog.Footer>
      <Button variant="outline" onclick={() => {}}>Cancelar</Button>
      <Button onclick={() => handleSave()}>Salvar</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root> 