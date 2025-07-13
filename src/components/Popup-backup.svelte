<script lang="ts">
	import Layout from './Layout.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { addBookmark, appDataStore, setAppData, getAppData, syncStatusStore, setSyncStatus } from '$lib/storage';
	import { getAuthToken, removeCachedAuthToken, uploadBackup, downloadBackup } from '$lib/gdrive';
	import ModeToggle from './ModeToggle.svelte';
	import * as Avatar from '$lib/components/ui/avatar';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Badge } from '$lib/components/ui/badge';
	import * as Select from '$lib/components/ui/select';
	import * as Carousel from '$lib/components/ui/carousel';
	import * as Popover from '$lib/components/ui/popover';
	import { Calendar } from '$lib/components/ui/calendar';
	import CalendarIcon from 'lucide-svelte/icons/calendar';
	import Settings from 'lucide-svelte/icons/settings';
	import PanelLeftOpen from 'lucide-svelte/icons/panel-left-open';
	import X from 'lucide-svelte/icons/x';
	import { toast } from 'svelte-sonner';
  import type { DateValue } from "@internationalized/date";

	const groups = [
		{ value: 'work', label: 'Work' },
		{ value: 'personal', label: 'Personal' },
		{ value: 'ideas', label: 'Ideas' }
	];

	let url = $state('');
	let comment = $state('');
	let tags = $state<string[]>([]);
	let newTag = $state('');
	let title = $state('');
	let reminder = $state<DateValue | undefined>(undefined);
	let selectedGroup = $state<string | undefined>(undefined);
	let isLoggedIn = $state(false);
	let user = $state<{ email: string; picture: string } | null>(null);
	
	// Use the reactive store for sync status
	const syncStatus = $derived($syncStatusStore);

	const groupTriggerContent = $derived(
		groups.find((g) => g.value === selectedGroup)?.label ?? 'Select a group'
	);

	$effect(() => {
		// Check login status on mount
		checkLoginStatus();

		// Get current tab info
		chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
			if (tab) {
				url = tab.url || '';
				title = tab.title || '';
			}
		});
	});

	async function checkLoginStatus() {
		try {
			const token = await getAuthToken(false);
			if (token) {
				isLoggedIn = true;
				fetchUserInfo(token);
			}
		} catch (error) {
			isLoggedIn = false;
		}
	}

	async function openOptionsPage() {
		chrome.runtime.openOptionsPage();
	}

	async function openSidePanel() {
		// We need to get the current window's ID to open the side panel
		const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
		if (tab.windowId) {
			await chrome.sidePanel.open({ windowId: tab.windowId });
		}
	}

	async function fetchUserInfo(token: string) {
		try {
			const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
				headers: { Authorization: `Bearer ${token}` }
			});
			if (!response.ok) throw new Error('Failed to fetch user info');
			const data = await response.json();
			user = { email: data.email, picture: data.picture };
		} catch (error) {
			console.error('Failed to fetch user info:', error);
			// Don't set sync status to error here - login status and sync status are separate
		}
	}

	async function handleLogin() {
		try {
			const token = await getAuthToken(true);
			isLoggedIn = true;
			await fetchUserInfo(token);
			toast.success('Logged in successfully!');
		} catch (error: any) {
			console.error('Login failed:', error);
			toast.error('Login failed', { description: error.message });
		}
	}

	async function handleLogout() {
		try {
			const token = await getAuthToken(false);
			if (token) {
				// Invalidate the token on Google's side
				await fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token}`);
				// Clear the local cache
				await removeCachedAuthToken(token);
			}
		} catch (error) {
			console.error('An error occurred during logout:', error);
		} finally {
			isLoggedIn = false;
			user = null;
			await setSyncStatus('idle');
			toast.info('Logged out.');
		}
	}

	async function handleBackup() {
		if (!isLoggedIn) {
			toast.error('You must be logged in to perform a backup.');
			return;
		}
		await setSyncStatus('syncing');
		try {
			const token = await getAuthToken(false);
			const data = await getAppData();
			await uploadBackup(token, data);
			await setSyncStatus('synced');
			toast.success('Backup completed successfully!');
		} catch (error: any) {
			await setSyncStatus('error', error.message);
			console.error('Backup failed:', error);
			toast.error('Backup failed', { description: error.message });
		}
	}

	async function handleRestore() {
		if (!isLoggedIn) {
			toast.error('You must be logged in to restore data.');
			return;
		}
		if (!confirm('This will overwrite your local data. Are you sure?')) {
			return;
		}
		await setSyncStatus('syncing');
		try {
			const token = await getAuthToken(false);
			const data = await downloadBackup(token);
			if (data) {
				await setAppData(data);
				await setSyncStatus('synced');
				toast.success('Data restored successfully!');
			} else {
				toast.info('No backup file found in Google Drive.');
				await setSyncStatus('synced');
			}
		} catch (error: any) {
			await setSyncStatus('error', error.message);
			console.error('Restore failed:', error);
			toast.error('Restore failed', { description: error.message });
		}
	}

	async function handleSave() {
		if (!url || !title) {
			// TODO: Show an error to the user
			console.error("URL and Title are required.");
			return;
		}

		try {
			await addBookmark('root', {
				url,
				title,
				comment,
				tags, // Already an array
				reminder: reminder ? reminder.toDate(Intl.DateTimeFormat().resolvedOptions().timeZone).getTime() : undefined
			});
			// Close the popup window after saving
			window.close();
		} catch (error) {
			console.error("Failed to save bookmark:", error);
			// TODO: Show an error to the user
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

	// TODO: Fetch folders for the select dropdown
</script>

<Layout>
	<div class="p-4 w-96 flex flex-col gap-4">
		<header class="flex justify-between items-center">
			<div class="flex items-center gap-2">
				<DropdownMenu.Root>
					<DropdownMenu.Trigger>
						<Button variant="ghost" class="relative h-8 w-8 rounded-full">
							<Avatar.Root>
								{#if isLoggedIn && user?.picture}
									<Avatar.Image src={user.picture} alt={user.email} />
								{/if}
								<Avatar.Fallback>{user?.email?.[0].toUpperCase() ?? 'U'}</Avatar.Fallback>
							</Avatar.Root>
						</Button>
					</DropdownMenu.Trigger>
					<DropdownMenu.Content class="w-56" align="start">
						{#if isLoggedIn}
							<DropdownMenu.Label>{user?.email}</DropdownMenu.Label>
							<DropdownMenu.Separator />
							<DropdownMenu.Item onclick={handleBackup}>Force Manual Backup</DropdownMenu.Item>
							<DropdownMenu.Item onclick={handleRestore}>Restore from Backup</DropdownMenu.Item>
							<DropdownMenu.Separator />
							<DropdownMenu.Item onclick={handleLogout}>Logout</DropdownMenu.Item>
						{:else}
							<DropdownMenu.Item onclick={handleLogin}>Login with Google</DropdownMenu.Item>
						{/if}
					</DropdownMenu.Content>
				</DropdownMenu.Root>
				<Badge variant={syncStatus === 'error' ? 'destructive' : 'secondary'}>
					{#if syncStatus === 'syncing'}
						Syncing...
					{:else}
						{syncStatus}
					{/if}
				</Badge>
			</div>
			<div class="flex items-center gap-2">
				<Button variant="ghost" size="icon" onclick={openSidePanel}>
					<PanelLeftOpen class="h-4 w-4" />
				</Button>
				<Button variant="ghost" size="icon" onclick={openOptionsPage}>
					<Settings class="h-4 w-4" />
				</Button>
				<ModeToggle />
			</div>
		</header>

		<div class="grid gap-4">
			<!-- Section for Group Selector -->
			<div class="grid gap-2">
				<Label for="group">Group</Label>
				<Select.Root type="single" bind:value={selectedGroup}>
					<Select.Trigger class="w-full">
						{groupTriggerContent}
					</Select.Trigger>
					<Select.Content>
						<Select.Group>
							<Select.Label>Groups</Select.Label>
							{#each groups as group (group.value)}
								<Select.Item value={group.value} label={group.label}>
									{group.label}
								</Select.Item>
							{/each}
						</Select.Group>
					</Select.Content>
				</Select.Root>
			</div>
			
			<!-- Section for Item Preview (Placeholder) -->
			<Card.Root>
				<Card.Header class="flex flex-row items-center gap-4 space-y-0 pb-2">
					<!-- Favicon placeholder -->
					<div class="h-8 w-8 bg-muted rounded-md"></div>
					<div class="grid gap-1">
						<Card.Title class="text-sm font-medium leading-none">{title || 'Page Title'}</Card.Title>
						<Card.Description class="text-xs text-muted-foreground">{url || 'Page URL'}</Card.Description>
					</div>
				</Card.Header>
			</Card.Root>

			<!-- Section for Custom Title and Comments -->
			<div class="grid gap-2">
				<Label for="title">Custom Title</Label>
				<Input id="title" placeholder="Enter a custom title (optional)" bind:value={title} />
			</div>
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
									<Input
										placeholder="New tag"
										bind:value={newTag}
										onkeydown={(e) => e.key === 'Enter' && handleAddTag()}
									/>
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
												<button
													onclick={() => handleRemoveTag(tag)}
													class="flex h-4 w-4 items-center justify-center rounded-full hover:bg-background"
												>
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
							<Button variant="outline">
								<CalendarIcon class="mr-2 h-4 w-4" />
								{reminder ? reminder.toDate(Intl.DateTimeFormat().resolvedOptions().timeZone).toLocaleDateString() : 'Set a date'}
							</Button>
						</Popover.Trigger>
						<Popover.Content class="w-auto p-0">
							<Calendar type="single" bind:value={reminder} />
						</Popover.Content>
					</Popover.Root>
				</div>
			</div>
		</div>

		<div class="flex justify-end gap-2">
			<Button variant="outline" onclick={() => window.close()}>Cancel</Button>
			<Button onclick={handleSave}>Save</Button>
		</div>
	</div>
</Layout> 