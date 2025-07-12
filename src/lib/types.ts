/**
 * Represents a user-defined tag.
 */
export interface Tag {
  id: string;
  name: string;
  color?: string; // Optional: for color-coding tags
}

/**
 * Represents a single access event for a bookmark.
 */
export interface AccessRecord {
  timestamp: number; // Unix timestamp
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