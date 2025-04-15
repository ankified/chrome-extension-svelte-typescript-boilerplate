import type { SavedItem, SortDescriptor } from '../../types';

export function sortItems(items: SavedItem[], descriptors: SortDescriptor[]): SavedItem[] {
  return [...items].sort((a, b) => {
    for (const descriptor of descriptors) {
      const { criterion, direction } = descriptor;
      let comparison = 0;
      if (criterion === "dateAdded") {
        comparison = (a.dateAdded || 0) - (b.dateAdded || 0);
      } else if (criterion === "title") {
        comparison = (a.title || "").localeCompare(b.title || "");
      } else if (criterion === "url") {
        comparison = (a.url || "").localeCompare(b.url || "");
      } else if (criterion === "scheduledDate") {
        const dateA = a.readLater && a.scheduledDate ? a.scheduledDate : (direction === 'desc' ? -Infinity : Infinity);
        const dateB = b.readLater && b.scheduledDate ? b.scheduledDate : (direction === 'desc' ? -Infinity : Infinity);
        comparison = dateA - dateB;
      } else if (criterion === "noteCount") {
        comparison = (a.noteIds?.length || 0) - (b.noteIds?.length || 0);
      } else if (criterion === "flashcardCount") {
        comparison = (a.flashcardIds?.length || 0) - (b.flashcardIds?.length || 0);
      }
      const directedComparison = direction === "desc" ? -comparison : comparison;
      if (directedComparison !== 0) {
        return directedComparison;
      }
    }
    return 0;
  });
} 