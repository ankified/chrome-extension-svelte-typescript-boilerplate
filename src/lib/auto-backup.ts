import { appDataStore, setSyncStatus } from './storage';
import { getAuthToken, uploadBackup, AuthError } from './gdrive';
import { debounce } from './utils';

let isFirstChange = true;

const debouncedUpload = debounce(async (token: string, data: any) => {
    console.log('Debounced backup triggered.');
    await setSyncStatus('syncing');
    
    try {
        await uploadBackup(token, data);
        await setSyncStatus('synced');
        console.log('Auto-backup successful.');
    } catch (e) {
        console.error('Auto-backup failed:', e);
        if (e instanceof AuthError) {
            await setSyncStatus('unauthenticated', e.message);
        } else {
            await setSyncStatus('error', e instanceof Error ? e.message : 'Unknown error');
        }
    }
}, 5000); // Debounce for 5 seconds

async function handleDataChange(data: any) {
    if (isFirstChange) {
        console.log('Initial data loaded, skipping first auto-backup.');
        isFirstChange = false;
        return;
    }

    if (data) {
        try {
            // Check for a token non-interactively.
            const token = await getAuthToken(false);
            if (token) {
                console.log('Data changed, scheduling auto-backup...');
                debouncedUpload(token, data);
            } else {
                // No token, which means we are logged out.
                await setSyncStatus('unauthenticated', 'User is not logged in.');
            }
        } catch (error) {
            // This can happen if getAuthToken fails (e.g. not logged in on non-chrome)
            await setSyncStatus('unauthenticated', 'User is not logged in.');
        }
    }
}

// Subscribe to the store to listen for changes.
appDataStore.subscribe(handleDataChange);

console.log('Auto-backup module initialized.'); 