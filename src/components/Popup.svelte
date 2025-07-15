<script lang="ts">
	import Layout from './Layout.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import {
		addBookmark,
		appDataStore,
		setAppData,
		getAppData,
		syncStatusStore,
		setSyncStatus,
		addFolder
	} from '$lib/storage';
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
	import Minus from 'lucide-svelte/icons/minus';
	import Plus from 'lucide-svelte/icons/plus';
	import Pencil from 'lucide-svelte/icons/pencil';
	import { toast } from 'svelte-sonner';
  import type { DateValue } from "@internationalized/date";
  import { CalendarDate, getLocalTimeZone } from "@internationalized/date";
	import type { Folder } from '$lib/types';

	let url = $state('');
	let comment = $state('');
	let tags = $state<string[]>([]);
	let newTag = $state('');
	let title = $state('');
	let favicon = $state<string | null>(null);
	let reminderDate = $state<CalendarDate | undefined>(undefined);
	let reminderTime = $state<string | null>(null);
	let authState = $state<'loading' | 'loggedIn' | 'loggedOut'>('loading');
	let user = $state<{ email: string; picture: string } | null>(null);
	let isEditingTitle = $state(false);
	let titleBeforeEdit = $state('');

	// State for dynamic folders
	let folders = $state<Folder[]>([]);
	let selectedFolderId = $state<string>('root'); // Default to root
	let newFolderName = $state('');

	
	// Use the reactive store for sync status
	const syncStatus = $derived($syncStatusStore);

	// When sync status indicates we are unauthenticated, update the auth state
	$effect(() => {
		if ($syncStatusStore.status === 'unauthenticated') {
			if (authState !== 'loggedOut') {
				console.log('Sync status is unauthenticated, forcing logged out state.');
				authState = 'loggedOut';
				user = null;
			}
		}
	});

	// Avatar display logic
	const avatarInfo = $derived({
		showImage: authState === 'loggedIn' && user?.picture && user.picture.length > 0,
		fallbackText: (authState === 'loggedIn' && user?.email) ? user.email[0].toUpperCase() : 'U'
	});

	const groupTriggerContent = $derived(
		folders.find((g) => g.id === selectedFolderId)?.name ?? 'Select a folder'
	);

	const timeSlots = Array.from({ length: 96 }, (_, i) => {
		const totalMinutes = i * 15;
		const hour = Math.floor(totalMinutes / 60);
		const minute = totalMinutes % 60;
		return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
	});

	$effect(() => {
		// Check login status on mount
		checkLoginStatus();

		// Get current tab info including favicon
		chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
			if (tab) {
				url = tab.url || '';
				title = tab.title || '';
				favicon = tab.favIconUrl || null;
				console.log('Tab info loaded:', { 
					url: tab.url, 
					title: tab.title, 
					favicon: tab.favIconUrl 
				});
			}
		});

		// Fetch folders
		loadFolders();
	});

	async function loadFolders() {
		const data = await getAppData();
		// We only care about top-level folders, which are children of 'root'
		const rootFolder = data.folders.find(f => f.id === 'root');
		if (rootFolder) {
			// Filter to only include folders, not bookmark items
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
			await loadFolders(); // Refresh folder list
			selectedFolderId = newFolder.id; // Auto-select the new folder
		} catch (error: any) {
			console.error("Failed to create folder:", error);
			toast.error("Failed to create folder", { description: error.message });
		}
	}

	async function checkLoginStatus() {
		console.log('=== checkLoginStatus called ===');
		try {
			// Ensure we start in a loading state
			authState = 'loading';
			const token = await getAuthToken(false);
			console.log('Token from getAuthToken:', !!token);
			
			if (token) {
				console.log('Token found, fetching user info');
				await fetchUserInfo(token);
				// fetchUserInfo will set the final state
			} else {
				console.log('No token found, setting logged out');
				authState = 'loggedOut';
				user = null;
			}
		} catch (error) {
			console.error('Error in checkLoginStatus:', error);
			authState = 'loggedOut';
			user = null;
		}
		
		console.log('Final state after checkLoginStatus:', {
			authState: authState,
			userEmail: user?.email,
			hasPicture: !!user?.picture
		});
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
		console.log('=== fetchUserInfo called ===');
		console.log('Token present:', !!token);
		console.log('Token length:', token ? token.length : 0);
		console.log('Token preview:', token ? token.substring(0, 20) + '...' : 'No token');
		
		try {
			const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
				headers: { 
					'Authorization': `Bearer ${token}`,
					'Accept': 'application/json'
				}
			});
			
			console.log('Response status:', response.status);
			console.log('Response ok:', response.ok);
			console.log('Response headers:', Object.fromEntries(response.headers.entries()));
			
			if (!response.ok) {
				const errorText = await response.text();
				console.error('API Error Response:', errorText);
				throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
			}
			
			const data = await response.json();
			console.log('Raw API response:', data);
			
			// Ensure we have valid data
			if (!data.email) {
				throw new Error('No email received from Google API');
			}
			
			user = { 
				email: data.email, 
				picture: data.picture || null
			};
			authState = 'loggedIn';
			
			console.log('✅ User state set successfully:', {
				email: user.email,
				picture: user.picture ? 'Picture URL present' : 'No picture',
				pictureLength: user.picture ? user.picture.length : 0
			});
			
		} catch (error) {
			console.error('❌ Failed to fetch user info:', error);
			// Reset user state on error
			user = null;
			authState = 'loggedOut';
			throw error; // Re-throw to handle in calling function
		}
	}

	async function handleLogin() {
		console.log('=== handleLogin called ===');
		try {
			const token = await getAuthToken(true);
			console.log('Token obtained from interactive login:', !!token);
			
			await fetchUserInfo(token);
			
			console.log('Login successful, final state:', {
				authState: authState,
				userEmail: user?.email,
				hasPicture: !!user?.picture
			});
			
			toast.success('Logged in successfully!');
		} catch (error: any) {
			console.error('Login failed:', error);
			authState = 'loggedOut';
			user = null;
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
			authState = 'loggedOut';
			user = null;
			await setSyncStatus('idle');
			toast.info('Logged out.');
		}
	}

	async function handleBackup() {
		if (authState !== 'loggedIn') {
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
		if (authState !== 'loggedIn') {
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
			let reminderTimestamp: number | undefined;
			if (reminderDate && reminderTime) {
				const [hours, minutes] = reminderTime.split(':').map(Number);
				
				// Construct a local date-time string in a format that the native Date object can parse reliably.
				const localDateTimeString = `${reminderDate.year}-${String(reminderDate.month).padStart(2, '0')}-${String(reminderDate.day).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;

				// The browser's native Date object, when given a string in this format,
				// will correctly interpret it in the user's local timezone.
				const localDate = new Date(localDateTimeString);

				// .getTime() returns the value in UTC milliseconds since the epoch, which is what we need.
				reminderTimestamp = localDate.getTime();
			}

			await addBookmark(selectedFolderId, {
				url,
				title,
				faviconUrl: favicon || undefined,
				comment,
				tags, // Already an array
				reminder: reminderTimestamp
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
								{#if avatarInfo.showImage}
									<Avatar.Image src={user?.picture} alt={user?.email} />
								{/if}
								<Avatar.Fallback>{avatarInfo.fallbackText}</Avatar.Fallback>
							</Avatar.Root>
							<!-- Debug indicator -->
							{#if authState === 'loggedIn'}
								<div class="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full w-3 h-3 flex items-center justify-center">
									✓
								</div>
							{:else if authState === 'loading'}
								<div class="absolute -top-1 -right-1 bg-yellow-500 text-white text-xs rounded-full w-3 h-3 flex items-center justify-center animate-pulse">
									?
								</div>
							{/if}
						</Button>
					</DropdownMenu.Trigger>
					<DropdownMenu.Content class="w-56" align="start">
						{#if authState === 'loggedIn'}
							<DropdownMenu.Label>{user?.email}</DropdownMenu.Label>
							<DropdownMenu.Separator />
							<DropdownMenu.Item onclick={handleBackup}>Force Manual Backup</DropdownMenu.Item>
							<DropdownMenu.Item onclick={handleRestore}>Restore from Backup</DropdownMenu.Item>
							<DropdownMenu.Separator />
							<DropdownMenu.Item onclick={handleLogout}>Logout</DropdownMenu.Item>
						{:else if authState === 'loggedOut'}
							<DropdownMenu.Item onclick={handleLogin}>Login with Google</DropdownMenu.Item>
						{:else}
							<DropdownMenu.Item disabled>Verifying...</DropdownMenu.Item>
						{/if}
					</DropdownMenu.Content>
				</DropdownMenu.Root>
				<Badge variant={syncStatus.status === 'error' ? 'destructive' : 'secondary'}>
					{#if syncStatus.status === 'syncing'}
						Syncing...
					{:else if syncStatus.status === 'unauthenticated'}
						Login Required
					{:else}
						{syncStatus.status}
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
			
			<!-- Section for Item Preview (Placeholder) -->
			<Card.Root>
				<Card.Header class="flex flex-row items-center gap-4 space-y-0 pb-2">
					<!-- Favicon display -->
					<div class="h-8 w-8 rounded-md flex items-center justify-center overflow-hidden bg-muted flex-shrink-0">
						{#if favicon}
							<img 
								src={favicon} 
								alt="Favicon" 
								class="h-full w-full object-contain"
								onerror={(e) => {
									console.log('Favicon failed to load:', favicon);
									const target = e.target as HTMLImageElement;
									if (target) {
										target.style.display = 'none';
										const nextSibling = target.nextElementSibling as HTMLElement;
										if (nextSibling) {
											nextSibling.style.display = 'flex';
										}
									}
								}}
							/>
							<!-- Fallback icon (hidden by default) -->
							<div class="h-4 w-4 bg-muted-foreground rounded-sm hidden items-center justify-center">
								<span class="text-xs text-muted">🌐</span>
							</div>
						{:else}
							<!-- Default fallback when no favicon -->
							<div class="h-4 w-4 bg-muted-foreground rounded-sm flex items-center justify-center">
								<span class="text-xs text-muted">🌐</span>
							</div>
						{/if}
					</div>
					<div class="grid gap-1 flex-1 min-w-0">
						{#if isEditingTitle}
							<div class="flex items-center gap-1">
								<Input
									id="title-editor"
									bind:value={title}
									class="h-7 text-sm"
									onkeydown={(e) => {
										if (e.key === 'Enter') {
											isEditingTitle = false;
										} else if (e.key === 'Escape') {
											title = titleBeforeEdit;
											isEditingTitle = false;
										}
									}}
								/>
								<Button variant="ghost" size="icon" class="w-7 h-7 flex-shrink-0" onclick={() => isEditingTitle = false}>
									<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="M20 6 9 17l-5-5"/></svg>
								</Button>
								<Button variant="ghost" size="icon" class="w-7 h-7 flex-shrink-0" onclick={() => { title = titleBeforeEdit; isEditingTitle = false; }}>
									<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
								</Button>
							</div>
						{:else}
							<div class="flex items-center justify-between gap-2">
								<Card.Title class="text-sm font-medium leading-none truncate" title={title || 'Page Title'}>
									{title || 'Page Title'}
								</Card.Title>
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
				<Label for="group">Group</Label>
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
							<Input 
								placeholder="New folder name..." 
								bind:value={newFolderName}
								onkeydown={(e) => e.key === 'Enter' && handleCreateFolder()}
								class="h-9"
							/>
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
							<Button variant="outline" class="justify-start">
								<CalendarIcon class="mr-2 h-4 w-4" />
								{#if reminderDate && reminderTime}
									{reminderDate.toDate(getLocalTimeZone()).toLocaleDateString()}
									<span class="flex items-center ml-2">
										<button onclick={(e) => { e.stopPropagation(); decrementMinute(); }} class="p-1 hover:bg-accent rounded">
											<Minus class="h-3 w-3" />
										</button>
										<span class="mx-1">{reminderTime}</span>
										<button onclick={(e) => { e.stopPropagation(); incrementMinute(); }} class="p-1 hover:bg-accent rounded">
											<Plus class="h-3 w-3" />
										</button>
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
										<Calendar
											type="single"
											bind:value={reminderDate}
											class="bg-transparent p-0 [--cell-size:--spacing(8)] md:[--cell-size:--spacing(10)] [&_[data-outside-month]]:hidden"
											weekdayFormat="short"
										/>
									</div>
									<div
										class="no-scrollbar inset-y-0 right-0 flex max-h-64 w-full scroll-pb-4 flex-col gap-2 overflow-y-auto border-t p-4 md:absolute md:max-h-none md:w-32 md:border-l md:border-t-0 md:gap-2 md:p-4 flex-1"
									>
										<div class="grid gap-2">
											{#each timeSlots as time (time)}
												<Button
													variant={reminderTime === time ? "default" : "outline"}
													onclick={() => (reminderTime = time)}
													class="w-full shadow-none text-xs py-1"
												>
													{time}
												</Button>
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

		<div class="flex justify-end gap-2">
			<Button variant="outline" onclick={() => window.close()}>Cancel</Button>
			<Button onclick={handleSave}>Save</Button>
		</div>
	</div>
</Layout> 