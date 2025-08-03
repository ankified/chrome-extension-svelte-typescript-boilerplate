<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { getAuthToken, removeCachedAuthToken, uploadBackup, downloadBackup } from '$lib/gdrive';
	import { getAppData, setAppData } from '$lib/storage';

	let token = $state<string | null>(null);
	let error = $state<string | null>(null);
	let status = $state('');
	let isLoading = $state(true);

	// Check authentication status on component mount
	$effect(() => {
		isLoading = true;
		getAuthToken(false)
			.then((t) => {
				token = t;
			})
			.catch(() => {
				token = null;
			})
			.finally(() => {
				isLoading = false;
			});
	});

	async function handleLogin() {
		error = null;
		status = 'Logging in...';
		try {
			token = await getAuthToken(true);
			status = 'Logged in successfully!';
		} catch (e: any) {
			error = e.message;
			status = 'Login failed.';
		}
	}

	async function handleLogout() {
		if (!token) return;
		error = null;
		status = 'Logging out...';
		try {
			await removeCachedAuthToken(token);
			token = null;
			status = 'Logged out.';
		} catch (e: any) {
			error = e.message;
			status = 'Logout failed.';
		}
	}

	async function handleBackup() {
		if (!token) return;
		error = null;
		status = 'Backing up data...';
		try {
			const appData = await getAppData();
			await uploadBackup(token, appData);
			status = 'Backup successful!';
		} catch (e: any) {
			error = e.message;
			status = 'Backup failed.';
		}
	}

	async function handleRestore() {
		if (!token) return;
		error = null;
		status = 'Restoring data...';
		try {
			const backupData = await downloadBackup(token);
			if (backupData) {
				await setAppData(backupData);
				status = 'Restore successful! Reload the extension to see changes.';
			} else {
				status = 'No backup file found.';
			}
		} catch (e: any) {
			error = e.message;
			status = 'Restore failed.';
		}
	}
</script>

<div class="p-8 max-w-xl mx-auto">
	<Card.Root>
		<Card.Header>
			<Card.Title>Google Drive Sync</Card.Title>
			<Card.Description>
				Log in with your Google account to back up and restore your saved items. Automatic backup is enabled when you are logged in.
			</Card.Description>
		</Card.Header>
		<Card.Content class="grid gap-4">
			{#if isLoading}
				<p>Loading authentication status...</p>
			{:else if token}
				<p class="text-green-600">You are logged in.</p>
				<div class="flex flex-col gap-2">
					<Button onclick={handleBackup}>Backup Now</Button>
					<Button onclick={handleRestore} variant="secondary">Restore from Backup</Button>
    </div>
			{:else}
				<p class="text-yellow-600">You are not logged in.</p>
				<Button onclick={handleLogin}>Login with Google</Button>
			{/if}
            {#if status}
                <p class="text-sm text-muted-foreground mt-4">{status}</p>
            {/if}
            {#if error}
                <p class="text-sm text-red-500 mt-2">{error}</p>
            {/if}
		</Card.Content>
		{#if !isLoading && token}
			<Card.Footer>
				<Button onclick={handleLogout} variant="destructive">Logout</Button>
			</Card.Footer>
		{/if}
	</Card.Root>
</div>

<!-- <style>
    .container {
        min-width: 250px;
    }

    button {
        border-radius: 2px;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.6);
        background-color: #2ecc71;
        color: #ecf0f1;
        transition: background-color 0.3s;
        padding: 5px 10px;
        border: none;
    }

    button:hover,
    button:focus {
        background-color: #27ae60;
    }
</style> -->
