import type { Folder, BookmarkItem, Tag, AccessRecord, Workspace, AppData } from '$lib/types';

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

const STORAGE_KEY = 'appData';
const SYNC_STATUS_KEY = 'syncStatus';

/**
 * The default state of the application data.
 */
const defaultData: AppData = {
  workspaces: [
    {
      id: 'default',
      name: 'Default Workspace',
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

    // More robust check: ensure workspaces array exists and has a default workspace.
    if (!Array.isArray(appData.workspaces) || appData.workspaces.length === 0) {
        appData.workspaces = defaultData.workspaces;
    }

    // Sanitize nodes within each workspace
    for (const workspace of appData.workspaces) {
      sanitizeNodes(workspace.children);
    }

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
export async function addFolder(workspaceId: string, parentFolderId: string, newFolder: Omit<Folder, 'id' | 'children' | 'createdAt'>): Promise<Folder> {
    const appData = await getAppData();
    const workspace = appData.workspaces.find(ws => ws.id === workspaceId);
    if (!workspace) {
        throw new Error(`Workspace with id ${workspaceId} not found.`);
    }

    const createdFolder: Folder = {
        ...newFolder,
        id: crypto.randomUUID(),
        children: [],
        createdAt: Date.now()
    };

    if (parentFolderId === workspace.id) { // Adding to the root of the workspace
        workspace.children.push(createdFolder);
    } else {
        const parent = findFolderById(workspace.children, parentFolderId);
        if (parent) {
            parent.children.push(createdFolder);
        } else {
            throw new Error(`Parent folder with id ${parentFolderId} not found in workspace ${workspaceId}.`);
        }
    }

    await setAppData(appData);
    return createdFolder;
}

export async function updateFolder(workspaceId: string, folderId: string, newName: string): Promise<Folder> {
    const appData = await getAppData();
    const workspace = appData.workspaces.find(ws => ws.id === workspaceId);
    if (!workspace) {
        throw new Error(`Workspace with id ${workspaceId} not found.`);
    }
    const folder = findFolderById(workspace.children, folderId);

    if (folder) {
        folder.name = newName;
        await setAppData(appData);
        return folder;
    } else {
        throw new Error(`Folder with id ${folderId} not found.`);
    }
}

function removeFolderById(nodes: (Folder | BookmarkItem)[], id: string): (Folder | BookmarkItem)[] {
    return nodes.filter(node => {
        if ('children' in node) { // It's a folder
            if (node.id === id) {
                return false; // Remove this folder
            }
            // Recurse on children
            node.children = removeFolderById(node.children, id);
        }
        return true; // Keep the node (either a bookmark or a folder that didn't match)
    });
}

export async function deleteFolder(workspaceId: string, folderId: string): Promise<void> {
    const appData = await getAppData();
    const workspace = appData.workspaces.find(ws => ws.id === workspaceId);
    if (!workspace) {
        throw new Error(`Workspace with id ${workspaceId} not found.`);
    }
    workspace.children = removeFolderById(workspace.children, folderId) as Folder[];
    await setAppData(appData);
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
export async function addBookmark(
	workspaceId: string,
	parentFolderId: string,
	newBookmark: Omit<BookmarkItem, 'id' | 'createdAt'>
): Promise<BookmarkItem> {
	const appData = await getAppData();
	const workspace = appData.workspaces.find((ws) => ws.id === workspaceId);
	if (!workspace) {
		throw new Error(`Workspace with id ${workspaceId} not found.`);
	}

	const createdBookmark: BookmarkItem = {
		...newBookmark,
		id: crypto.randomUUID(),
		createdAt: Date.now()
	};

	const parent = findFolderById(workspace.children, parentFolderId);

	if (parent) {
		parent.children.push(createdBookmark);

		// If a reminder is set, create a Chrome alarm
		if (createdBookmark.reminder) {
			chrome.alarms.create(`reminder-${createdBookmark.id}`, {
				when: createdBookmark.reminder
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

export async function updateBookmark(workspaceId: string, updatedBookmark: BookmarkItem): Promise<BookmarkItem> {
    const appData = await getAppData();
    const workspace = appData.workspaces.find(ws => ws.id === workspaceId);
    if (!workspace) {
        throw new Error(`Workspace with id ${workspaceId} not found.`);
    }

    const bookmark = findBookmarkById(workspace.children, updatedBookmark.id);

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

export async function deleteBookmark(workspaceId: string, id: string): Promise<void> {
    const appData = await getAppData();
    const workspace = appData.workspaces.find(ws => ws.id === workspaceId);
    if (!workspace) {
        throw new Error(`Workspace with id ${workspaceId} not found.`);
    }
    workspace.children = removeBookmarkById(workspace.children, id) as Folder[];
    await setAppData(appData);
}

// --- Workspace Management ---

export async function addWorkspace(name: string): Promise<Workspace> {
    const appData = await getAppData();
    const newWorkspace: Workspace = {
        id: crypto.randomUUID(),
        name,
        children: [],
        createdAt: Date.now()
    };
    appData.workspaces.push(newWorkspace);
    await setAppData(appData);
    return newWorkspace;
}

export async function updateWorkspace(workspaceId: string, newName: string): Promise<Workspace> {
    const appData = await getAppData();
    const workspace = appData.workspaces.find(ws => ws.id === workspaceId);
    if (workspace) {
        workspace.name = newName;
        await setAppData(appData);
        return workspace;
    } else {
        throw new Error(`Workspace with id ${workspaceId} not found.`);
    }
}

export async function deleteWorkspace(workspaceId: string): Promise<void> {
    const appData = await getAppData();
    // Prevent deleting the last workspace
    if (appData.workspaces.length <= 1) {
        throw new Error("Cannot delete the last workspace.");
    }
    appData.workspaces = appData.workspaces.filter(ws => ws.id !== workspaceId);
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