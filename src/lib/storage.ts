import type { Folder, BookmarkItem, Tag, AccessRecord } from '$lib/types';

/**
 * Represents the sync status of the application.
 */
export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'unauthenticated';

/**
 * Represents the sync state information.
 */
export interface SyncState {
  status: SyncStatus;
  lastSyncTime?: number;
  lastErrorMessage?: string;
}

/**
 * The main data structure for the application's storage.
 */
export interface AppData {
  folders: Folder[];
  tags: Tag[];
  // Bookmarks will be nested within folders, but we can have a flat list for easy access if needed.
}

const STORAGE_KEY = 'appData';
const SYNC_STATUS_KEY = 'syncStatus';

/**
 * The default state of the application data.
 */
const defaultData: AppData = {
  folders: [
    {
      id: 'root',
      name: 'Root',
      children: [],
      createdAt: Date.now(),
    }
  ],
  tags: [],
};

/**
 * Retrieves all application data from chrome.storage.local.
 * If no data is found, it initializes with the default structure.
 *
 * @returns A promise that resolves to the AppData object.
 */
export async function getAppData(): Promise<AppData> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  if (result[STORAGE_KEY]) {
    const appData = result[STORAGE_KEY] as AppData;
    // Data migration/sanitization logic
    function sanitizeNodes(nodes: (Folder | BookmarkItem)[]) {
      if (!Array.isArray(nodes)) {
        return; // Not an array, nothing to sanitize
      }
      for (const node of nodes) {
        if (!node) continue; // Skip null/undefined entries

        if ('children' in node) {
          // It's a folder, recurse
          sanitizeNodes(node.children);
        } else {
          // It's a bookmark
          if (node.tags && typeof node.tags === 'object' && !Array.isArray(node.tags)) {
            node.tags = Object.values(node.tags);
          }
        }
      }
    }

    // More robust check: ensure folders is an array AND the root folder exists.
    if (!Array.isArray(appData.folders) || !appData.folders.some(f => 'children' in f && f.id === 'root')) {
        // If folders array is missing, not an array, or doesn't have a root folder,
        // we reset it to the default. This is a bit destructive if there are other
        // top-level folders, but the root folder is essential.
        appData.folders = defaultData.folders;
    }
    
    sanitizeNodes(appData.folders);
    
    return appData;
  } else {
    // Initialize storage with default data if it's the first run
    await setAppData(defaultData);
    return defaultData;
  }
}

/**
 * Saves the entire application data object to chrome.storage.local.
 *
 * @param data The AppData object to save.
 * @returns A promise that resolves when the data is saved.
 */
export async function setAppData(data: AppData): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: data });
}

// --- CRUD Operations for Folders ---

/**
 * Adds a new folder to a parent folder.
 * @param parentFolderId The ID of the parent folder.
 * @param newFolder The folder object to add.
 */
export async function addFolder(parentFolderId: string, newFolder: Omit<Folder, 'id' | 'children' | 'createdAt'>): Promise<Folder> {
    const appData = await getAppData();
    
    const createdFolder: Folder = {
        ...newFolder,
        id: crypto.randomUUID(),
        children: [],
        createdAt: Date.now()
    };

    // This is a simplified search. A recursive search would be better.
    const parent = findFolderById(appData.folders, parentFolderId);

    if (parent) {
        parent.children.push(createdFolder);
        await setAppData(appData);
        return createdFolder;
    } else {
        throw new Error(`Parent folder with id ${parentFolderId} not found.`);
    }
}

// Helper function to find a folder recursively
function findFolderById(nodes: (Folder | BookmarkItem)[], id: string): Folder | null {
    for (const node of nodes) {
        if ('children' in node) { // It's a Folder
            if (node.id === id) {
                return node;
            }
            // Recurse into the children of this folder
            const found = findFolderById(node.children, id);
            if (found) {
                return found;
            }
        }
    }
    return null;
}

// --- CRUD Operations for Bookmarks ---

/**
 * Adds a new bookmark to a parent folder.
 * @param parentFolderId The ID of the parent folder.
 * @param newBookmark The bookmark object to add.
 */
export async function addBookmark(parentFolderId: string, newBookmark: Omit<BookmarkItem, 'id' | 'createdAt' | 'accessHistory'>): Promise<BookmarkItem> {
    const appData = await getAppData();

    // Get history for the URL
    const visits = await chrome.history.getVisits({ url: newBookmark.url });
    const accessHistory: AccessRecord[] = visits.map(visit => ({
        timestamp: visit.visitTime!
    }));

    const createdBookmark: BookmarkItem = {
        ...newBookmark,
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        accessHistory: accessHistory,
    };

    const parent = findFolderById(appData.folders, parentFolderId);

    if (parent) {
        parent.children.push(createdBookmark);

        // If a reminder is set, create a Chrome alarm
        if (createdBookmark.reminder) {
            chrome.alarms.create(`reminder-${createdBookmark.id}`, {
                when: createdBookmark.reminder,
            });
        }

        await setAppData(appData);
        return createdBookmark;
    } else {
        throw new Error(`Parent folder with id ${parentFolderId} not found.`);
    }
}

// --- CRUD Operations for Tags ---

/**
 * Adds a new tag to the application data.
 * @param newTag The tag object to add.
 */
export async function addTag(newTag: Omit<Tag, 'id'>): Promise<Tag> {
    const appData = await getAppData();

    const createdTag: Tag = {
        ...newTag,
        id: crypto.randomUUID(),
    };

    // Avoid duplicate tag names
    if (appData.tags.some(tag => tag.name.toLowerCase() === createdTag.name.toLowerCase())) {
        throw new Error(`Tag with name "${createdTag.name}" already exists.`);
    }

    appData.tags.push(createdTag);
    await setAppData(appData);
    return createdTag;
}

/**
 * Creates a new global tag.
 * @param newTag The tag object to create.
 * @returns The newly created tag.
 */
export async function createTag(newTag: Partial<Tag>): Promise<Tag> {
    const data = await getAppData();
    
    // Check if a tag with the same name already exists
    if (data.tags.some(t => t.name.toLowerCase() === newTag.name?.toLowerCase())) {
        throw new Error(`Tag "${newTag.name}" already exists.`);
    }

    const tag: Tag = {
        id: `tag-${Date.now()}`,
        name: newTag.name!,
        createdAt: Date.now()
    };
    data.tags.push(tag);
    await setAppData(data);
    return tag;
}

// --- Helper functions to find items ---

export function findBookmarkById(nodes: (Folder | BookmarkItem)[], id: string): BookmarkItem | null {
    for (const node of nodes) {
        if ('children' in node) { // Folder
            const found = findBookmarkById(node.children, id);
            if (found) return found;
        } else { // BookmarkItem
            if (node.id === id) {
                return node;
            }
        }
    }
    return null;
}

export function findBookmarkByUrl(nodes: (Folder | BookmarkItem)[], url: string): BookmarkItem | null {
    for (const node of nodes) {
        if ('children' in node) { // Folder
            const found = findBookmarkByUrl(node.children, url);
            if (found) return found;
        } else { // BookmarkItem
            // Normalize URLs to compare them more reliably
            try {
                if (new URL(node.url).href === new URL(url).href) {
                    return node;
                }
            } catch (e) {
                // Ignore invalid URLs
            }
        }
    }
    return null;
}

// --- Update functions ---

export async function updateBookmark(updatedBookmark: BookmarkItem): Promise<BookmarkItem> {
    const appData = await getAppData();
    
    // We need to find the original bookmark to update it.
    // This is not efficient, a flat map would be better for performance on large datasets.
    const bookmark = findBookmarkById(appData.folders, updatedBookmark.id);

    if (bookmark) {
        Object.assign(bookmark, updatedBookmark);
        await setAppData(appData);
        return bookmark;
    } else {
        throw new Error(`Bookmark with id ${updatedBookmark.id} not found.`);
    }
}

function removeBookmarkById(nodes: (Folder | BookmarkItem)[], id: string): (Folder | BookmarkItem)[] {
    return nodes.filter(node => {
        if ('children' in node) { // Folder
            node.children = removeBookmarkById(node.children, id);
            return true; // Keep the folder
        }
        // It's a bookmark, filter it out if IDs match
        return node.id !== id; 
    });
}

export async function deleteBookmark(id: string): Promise<void> {
    const appData = await getAppData();
    appData.folders = removeBookmarkById(appData.folders, id) as Folder[];
    await setAppData(appData);
}

// --- Sync Status Management ---

/**
 * Gets the current sync status from storage.
 */
export async function getSyncStatus(): Promise<SyncState> {
  const result = await chrome.storage.local.get(SYNC_STATUS_KEY);
  return result[SYNC_STATUS_KEY] || { status: 'idle' };
}

/**
 * Sets the sync status in storage.
 */
export async function setSyncStatus(status: SyncStatus, errorMessage?: string): Promise<void> {
  const syncState: SyncState = {
    status,
    lastSyncTime: status === 'synced' ? Date.now() : undefined,
    lastErrorMessage: status === 'error' ? errorMessage : undefined
  };
  await chrome.storage.local.set({ [SYNC_STATUS_KEY]: syncState });
}

/**
 * A readable Svelte store for sync status that stays in sync with chrome.storage.local.
 */
export const syncStatusStore = readable<SyncState>({ status: 'idle' }, (set) => {
  // Get the initial value from storage
  getSyncStatus().then(set).catch(err => {
    console.error("Failed to initialize syncStatusStore:", err);
    set({ status: 'error', lastErrorMessage: 'Failed to initialize sync status' });
  });

  // Set up a listener for changes
  const listener = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
    if (areaName === 'local' && changes[SYNC_STATUS_KEY]) {
      set(changes[SYNC_STATUS_KEY].newValue as SyncState);
    }
  };

  chrome.storage.onChanged.addListener(listener);

  return () => {
    chrome.storage.onChanged.removeListener(listener);
  };
});

// --- Reactive Svelte Store ---
import { readable } from 'svelte/store';

/**
 * A readable Svelte store that stays in sync with chrome.storage.local.
 */
export const appDataStore = readable<AppData | null>(null, (set) => {
    // This function is called when the first subscriber subscribes.

    // 1. Get the initial value from storage and set the store's value.
    getAppData().then(data => {
        set(data);
    }).catch(err => {
        console.error("Failed to initialize appDataStore:", err);
        // Optionally set a default value or an error state
        set(defaultData); 
    });

    // 2. Set up a listener for any subsequent changes in storage.
    const listener = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
        if (areaName === 'local' && changes[STORAGE_KEY]) {
            set(changes[STORAGE_KEY].newValue as AppData);
        }
    };

    chrome.storage.onChanged.addListener(listener);

    // 3. Return a cleanup function that is called when the last subscriber unsubscribes.
    return () => {
        chrome.storage.onChanged.removeListener(listener);
    };
}); 