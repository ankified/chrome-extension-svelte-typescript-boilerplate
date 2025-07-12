import { appDataStore } from './storage';
import { getAuthToken, uploadBackup } from './gdrive';
import { debounce } from './utils';

let isFirstChange = true;

const debouncedUpload = debounce(async (token: string, data: any) => {
    console.log('Debounced backup triggered.');
    try {
        await uploadBackup(token, data);
        console.log('Auto-backup successful.');
    } catch (e) {
        console.error('Auto-backup failed:', e);
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
            }
        } catch (error) {
            // No token found, do nothing.
        }
    }
}

// Subscribe to the store to listen for changes.
appDataStore.subscribe(handleDataChange);

console.log('Auto-backup module initialized.'); 