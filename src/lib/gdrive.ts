/**
 * This file contains utility functions for interacting with the Google Drive API.
 */

import type { Folder, BookmarkItem, Tag, AccessRecord } from '$lib/types';

// This is the Client ID for the "Web Application" type credential in Google Cloud Console.
// It is used as a fallback for browsers that do not support chrome.identity.getAuthToken (e.g., Brave).
const WEB_APP_CLIENT_ID = '519729309511-jbfv8f1cs08fm1t74fb2evtt12hnbank.apps.googleusercontent.com';

const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';

const BOUNDARY = '-------314159265358979323846';
const UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';
const DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files';
const FILE_NAME = 'chrome-extension-svelte-typescript-boilerplate-backup.json';
const MANUAL_TOKEN_STORAGE_KEY = 'gdrive_manual_token';


/**
 * Checks if the current browser is Google Chrome.
 * This is a simplified check and might need improvement.
 * @returns A promise that resolves to true if the browser is likely Chrome, false otherwise.
 */
async function isChromeBrowser(): Promise<boolean> {
	// @ts-ignore
	if (navigator.brave && (await navigator.brave.isBrave())) {
		return false;
	}
	// This is not a foolproof way to detect Chrome, but it's a common method.
	// It checks for the presence of 'Chrome' and the absence of 'Edg' (for Edge) in the user agent string.
	// It's a reasonable heuristic for distinguishing Chrome from other Chromium-based browsers.
	return navigator.userAgent.includes('Chrome') && !navigator.userAgent.includes('Edg');
}

function launchWebAuthFlow(interactive: boolean): Promise<string> {
	return new Promise((resolve, reject) => {
		if (WEB_APP_CLIENT_ID.startsWith('COLE_O_SEU_ID_DE_CLIENTE')) {
			return reject(
				new Error('Please provide the Web Application Client ID in src/lib/gdrive.ts')
			);
		}

		const extensionId = chrome.runtime.id;
		const redirectUri = `https://${extensionId}.chromiumapp.org`;
		console.log(
			'Para o fluxo de autenticação da web, certifique-se de que este URI de redirecionamento está adicionado às suas credenciais de OAuth 2.0 do tipo "Aplicação Web" na Google Cloud Console:',
			redirectUri
		);
		const scopes = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile';
		let authUrl = `https://accounts.google.com/o/oauth2/v2/auth`;
		authUrl += `?client_id=${WEB_APP_CLIENT_ID}`;
		authUrl += `&response_type=token`;
		authUrl += `&redirect_uri=${encodeURIComponent(redirectUri)}`;
		authUrl += `&scope=${encodeURIComponent(scopes)}`;

		chrome.identity.launchWebAuthFlow({ url: authUrl, interactive }, (responseUrl) => {
			if (chrome.runtime.lastError) {
				return reject(chrome.runtime.lastError);
			}
			if (responseUrl) {
				const url = new URL(responseUrl);
				const params = new URLSearchParams(url.hash.substring(1)); // Remove the '#'
				const accessToken = params.get('access_token');
				if (accessToken) {
					chrome.storage.local.set({ [MANUAL_TOKEN_STORAGE_KEY]: accessToken }, () => {
						// The listener above will automatically update the store
						resolve(accessToken);
					});
				} else {
					reject(new Error('Authentication failed: Access token not found in response.'));
				}
			} else {
				reject(new Error('Authentication failed: No response URL.'));
			}
		});
	});
}

/**
 * Initiates the OAuth 2.0 flow to get an access token.
 * @param interactive If true, the user will be prompted to log in if necessary.
 * @returns A promise that resolves to the access token.
 */
export async function getAuthToken(interactive: boolean): Promise<string> {
	const isChrome = await isChromeBrowser();

	if (isChrome) {
		console.log('Detected Chrome browser, using chrome.identity.getAuthToken.');
		return new Promise((resolve, reject) => {
			chrome.identity.getAuthToken({ interactive }, (token) => {
				if (chrome.runtime.lastError) {
					reject(new Error(chrome.runtime.lastError.message));
				} else {
					resolve(token as string);
				}
			});
		});
	} else {
		console.log('Detected a non-Chrome browser, using chrome.identity.launchWebAuthFlow.');
		if (interactive) {
			return launchWebAuthFlow(interactive);
		}
		// Try to get from storage if not interactive
		return new Promise((resolve, reject) => {
			chrome.storage.local.get(MANUAL_TOKEN_STORAGE_KEY, (result) => {
				if (result[MANUAL_TOKEN_STORAGE_KEY]) {
					resolve(result[MANUAL_TOKEN_STORAGE_KEY]);
				} else {
					reject(new Error('Not logged in.'));
				}
			});
		});
	}
}

/**
 * Removes a cached OAuth 2.0 token.
 * @param token The token to remove.
 * @returns A promise that resolves when the token is removed.
 */
export function removeCachedAuthToken(token: string): Promise<void> {
    return new Promise((resolve) => {
        chrome.identity.removeCachedAuthToken({ token }, () => {
			chrome.storage.local.remove(MANUAL_TOKEN_STORAGE_KEY, () => {
				resolve();
			});
        });
    });
}

async function getHeaders(token: string) {
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    };
}

/**
 * Finds the backup file in the user's Google Drive.
 * @param token The OAuth 2.0 access token.
 * @returns The file metadata if found, otherwise null.
 */
async function findBackupFile(token: string): Promise<any | null> {
    const headers = await getHeaders(token);
    const response = await fetch(`${DRIVE_FILES_URL}?q=name='${FILE_NAME}' and 'root' in parents and trashed=false`, {
        headers,
    });
    if (!response.ok) {
        const errorDetails = await response.text();
        console.error('Google API Error on findBackupFile:', errorDetails);
        throw new Error('Failed to search for backup file: ' + response.statusText);
    }
    const data = await response.json();
    return data.files.length > 0 ? data.files[0] : null;
}

/**
 * Uploads the application data to Google Drive.
 * @param token The OAuth 2.0 access token.
 * @param data The application data to upload.
 */
export async function uploadBackup(token: string, data: any): Promise<void> {
    const file = await findBackupFile(token);
    
    const fileMetadata: { name: string, parents?: string[] } = {
        name: FILE_NAME,
    };

    if (!file) {
        // Parents field is not needed if the file is in the root.
        // It defaults to the root if not specified.
    }

    const multipartRequestBody =
        `--${BOUNDARY}\r\n` +
        `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
        `${JSON.stringify(fileMetadata)}\r\n` +
        `--${BOUNDARY}\r\n` +
        `Content-Type: application/json\r\n\r\n` +
        `${JSON.stringify(data)}\r\n` +
        `--${BOUNDARY}--`;

    const method = file ? 'PATCH' : 'POST';
    const url = file ? `${UPLOAD_URL}/${file.id}?uploadType=multipart` : `${UPLOAD_URL}?uploadType=multipart`;

    const response = await fetch(url, {
        method,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': `multipart/related; boundary=${BOUNDARY}`,
        },
        body: multipartRequestBody,
    });

    if (!response.ok) {
        const errorDetails = await response.text();
        console.error('Google API Error on uploadBackup:', errorDetails);
        throw new Error('Failed to upload backup: ' + response.statusText);
    }
}

/**
 * Downloads the backup file from Google Drive.
 * @param token The OAuth 2.0 access token.
 * @returns The application data from the backup file.
 */
export async function downloadBackup(token: string): Promise<any | null> {
    const file = await findBackupFile(token);
    if (!file) {
        return null;
    }

    const headers = await getHeaders(token);
    const response = await fetch(`${DRIVE_FILES_URL}/${file.id}?alt=media`, {
        headers,
    });

    if (!response.ok) {
        const errorDetails = await response.text();
        console.error('Google API Error on downloadBackup:', errorDetails);
        throw new Error('Failed to download backup: ' + response.statusText);
    }

    return await response.json();
}

// Functions for backup and restore will be added below. 