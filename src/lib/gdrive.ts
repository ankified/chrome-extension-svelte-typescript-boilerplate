/**
 * This file contains utility functions for interacting with the Google Drive API.
 */

import type { Folder, BookmarkItem, Tag, AccessRecord } from '$lib/types';

// This is the Client ID for the "Web Application" type credential in Google Cloud Console.
// It is used as a fallback for browsers that do not support chrome.identity.getAuthToken (e.g., Brave).
const WEB_APP_CLIENT_ID = '519729309511-jbfv8f1cs08fm1t74fb2evtt12hnbank.apps.googleusercontent.com';
// This client secret is for the "Web Application" credential.
// IMPORTANT: In a real-world scenario, this should NOT be stored in the client-side code.
// This is included for demonstration purposes in this boilerplate.
// A backend server should be used to handle the token exchange securely.
const WEB_APP_CLIENT_SECRET = import.meta.env.VITE_GDRIVE_CLIENT_SECRET;

const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files';
const UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';
const FILE_NAME = 'chrome-extension-svelte-typescript-boilerplate-backup.json';
const BOUNDARY = '-------314159265358979323846';

// --- Storage Keys ---
const REFRESH_TOKEN_KEY = 'gdrive_refresh_token';
const ACCESS_TOKEN_KEY = 'gdrive_access_token';
const TOKEN_EXPIRY_KEY = 'gdrive_token_expiry';


/**
 * Custom error class for authentication failures.
 */
export class AuthError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'AuthError';
	}
}

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
	return navigator.userAgent.includes('Chrome') && !navigator.userAgent.includes('Edg');
}

async function refreshAccessToken(): Promise<string> {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(REFRESH_TOKEN_KEY, async (result) => {
            const refreshToken = result[REFRESH_TOKEN_KEY];
            if (!refreshToken) {
                return reject(new Error("No refresh token available."));
            }

            try {
                const response = await fetch(TOKEN_ENDPOINT, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: new URLSearchParams({
                        client_id: WEB_APP_CLIENT_ID,
                        client_secret: WEB_APP_CLIENT_SECRET,
                        refresh_token: refreshToken,
                        grant_type: 'refresh_token',
                    }),
                });

                const tokenData = await response.json();
                if (!response.ok) {
                    throw new Error(tokenData.error_description || 'Failed to refresh token');
                }

                const newAccessToken = tokenData.access_token;
                const newExpiry = Date.now() + (tokenData.expires_in * 1000);

                chrome.storage.local.set({
                    [ACCESS_TOKEN_KEY]: newAccessToken,
                    [TOKEN_EXPIRY_KEY]: newExpiry,
                }, () => resolve(newAccessToken));

            } catch (error) {
                console.error("Error refreshing access token:", error);
                reject(error);
            }
        });
    });
}

function launchWebAuthFlow(interactive: boolean): Promise<string> {
	return new Promise((resolve, reject) => {
		if (WEB_APP_CLIENT_ID.startsWith('COLE_O_SEU_ID_DE_CLIENTE')) {
			return reject(
				new Error('Please provide the Web Application Client ID in src/lib/gdrive.ts')
			);
		}
		if (!WEB_APP_CLIENT_SECRET || WEB_APP_CLIENT_SECRET.startsWith('COLE_O_SEU_CLIENT_SECRET')) {
			return reject(
				new Error('Please provide the Web Application Client Secret in the .env file (VITE_GDRIVE_CLIENT_SECRET)')
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
		authUrl += `&response_type=code`; // Request an authorization code
		authUrl += `&access_type=offline`; // Request a refresh token
		authUrl += `&redirect_uri=${encodeURIComponent(redirectUri)}`;
		authUrl += `&scope=${encodeURIComponent(scopes)}`;

		chrome.identity.launchWebAuthFlow({ url: authUrl, interactive }, (responseUrl) => {
			if (chrome.runtime.lastError) {
				return reject(new Error(chrome.runtime.lastError.message));
			}
			if (!responseUrl) {
				return reject(new Error('Authentication failed: No response URL.'));
			}

			const url = new URL(responseUrl);
			const authCode = url.searchParams.get('code');

			if (!authCode) {
				return reject(new Error('Authentication failed: Authorization code not found.'));
			}

			// Exchange authorization code for tokens
			fetch(TOKEN_ENDPOINT, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				body: new URLSearchParams({
					code: authCode,
					client_id: WEB_APP_CLIENT_ID,
					client_secret: WEB_APP_CLIENT_SECRET,
					redirect_uri: redirectUri,
					grant_type: 'authorization_code',
				}),
			})
			.then(response => response.json())
			.then(tokenData => {
				if (tokenData.error) {
					throw new Error(tokenData.error_description || 'Token exchange failed');
				}

				const accessToken = tokenData.access_token;
				const refreshToken = tokenData.refresh_token; // May only be sent on the first authorization
				const expiresIn = tokenData.expires_in;

				const storageData: { [key: string]: any } = {
					[ACCESS_TOKEN_KEY]: accessToken,
					[TOKEN_EXPIRY_KEY]: Date.now() + expiresIn * 1000,
				};

				// The refresh token is only sent the first time the user authorizes.
				// We should only store it if we receive a new one.
				if (refreshToken) {
					storageData[REFRESH_TOKEN_KEY] = refreshToken;
				}

				chrome.storage.local.set(storageData, () => {
					resolve(accessToken);
				});
			})
			.catch(err => {
				console.error("Token exchange error:", err);
				reject(err);
			});
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
		console.log('Detected a non-Chrome browser, using custom OAuth flow.');
		if (interactive) {
			return launchWebAuthFlow(interactive);
		}
		
		// Non-interactive flow for non-Chrome browsers
		return new Promise((resolve, reject) => {
			chrome.storage.local.get([ACCESS_TOKEN_KEY, TOKEN_EXPIRY_KEY, REFRESH_TOKEN_KEY], async (result) => {
				const accessToken = result[ACCESS_TOKEN_KEY];
				const expiry = result[TOKEN_EXPIRY_KEY];
				const refreshToken = result[REFRESH_TOKEN_KEY];

				if (accessToken && expiry && Date.now() < expiry) {
					// We have a valid access token
					resolve(accessToken);
				} else if (refreshToken) {
					// Access token is expired or missing, but we have a refresh token
					try {
						const newAccessToken = await refreshAccessToken();
						resolve(newAccessToken);
					} catch (error) {
						reject(error);
					}
				} else {
					// No valid tokens at all
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
    return new Promise(async (resolve) => {
		const isChrome = await isChromeBrowser();
		if (isChrome) {
			chrome.identity.removeCachedAuthToken({ token }, resolve);
		} else {
			chrome.storage.local.remove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, TOKEN_EXPIRY_KEY], resolve);
		}
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
		if (response.status === 401) {
			throw new AuthError('Authentication failed. Please log in again.');
		}
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
		if (response.status === 401) {
			throw new AuthError('Authentication failed. Please log in again.');
		}
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
		if (response.status === 401) {
			throw new AuthError('Authentication failed. Please log in again.');
		}
        const errorDetails = await response.text();
        console.error('Google API Error on downloadBackup:', errorDetails);
        throw new Error('Failed to download backup: ' + response.statusText);
    }

    return await response.json();
}

// Functions for backup and restore will be added below. 