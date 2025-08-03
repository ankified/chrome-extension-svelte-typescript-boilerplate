/**
 * Represents a user-defined tag.
 */
export interface Tag {
  id: string;
  name: string;
  createdAt: number;
  color?: string; // Optional: for color-coding tags
}

/**
 * Represents a single access event for a bookmark.
 */
export interface AccessRecord {
  timestamp: number; // Unix timestamp
}

/**
 * The main data structure for the application's storage.
 */
export interface AppData {
  workspaces: Workspace[];
  tags: Tag[];
}

/**
 * Represents a workspace, which is a top-level container for folders.
 */
export interface Workspace {
  id: string;
  name: string;
  children: Folder[];
  createdAt: number;
}

/**
 * Represents a saved bookmark item.
 */
export interface BookmarkItem {
  id: string;
  url: string;
  title: string;
  faviconUrl?: string; // URL to the site's favicon
  comment: string;
  tags: string[]; // Array of Tag IDs
  reminder?: number; // Optional: Unix timestamp for the reminder
  createdAt: number; // Unix timestamp
  accessHistory: AccessRecord[];
}

/**
 * Represents a folder that can contain bookmarks and other folders.
 */
export interface Folder {
  id: string;
  name:string;
  children: (BookmarkItem | Folder)[];
  createdAt: number; // Unix timestamp
}

/**
 * Defines the structure for messages used in chrome.runtime.sendMessage.
 */
export type ExtensionMessage = {
  action: 'openBookmarkDialog';
  data: {
    title: string;
    url: string;
    favicon: string | null;
  };
} | {
  action: 'getHistory';
  data: {
    url: string;
  };
};
