import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Folder, BookmarkItem } from "./types";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

/**
 * Creates a debounced function that delays invoking `func` until after `wait` milliseconds have elapsed
 * since the last time the debounced function was invoked.
 * @param func The function to debounce.
 * @param wait The number of milliseconds to delay.
 * @returns Returns the new debounced function.
 */
export function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout> | null;

    return function(this: ThisParameterType<T>, ...args: Parameters<T>): void {
        const context = this;
        if (timeout) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(() => {
            timeout = null;
            func.apply(context, args);
        }, wait);
    };
}

/**
 * Recursively extracts only the folders from a node tree, preserving the hierarchy.
 * @param nodes An array of Folders and/or BookmarkItems.
 * @returns An array of Folders with their nested folder structures.
 */
export function getFolderTree(nodes: (Folder | BookmarkItem)[]): Folder[] {
	return nodes
		.filter((node): node is Folder => 'children' in node)
		.map(folder => ({
			...folder,
			children: getFolderTree(folder.children)
		}));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChild<T> = T extends { child?: any } ? Omit<T, "child"> : T;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChildren<T> = T extends { children?: any } ? Omit<T, "children"> : T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & { ref?: U | null };
