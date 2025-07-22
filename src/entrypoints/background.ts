import { defineBackground } from '#imports';
import { 
    findBookmarkById, 
    getAppData, 
    findBookmarkByUrl, 
    setAppData, 
    syncStatusStore, 
    type SyncStatus
} from "../lib/storage";
import type { AppData } from '$lib/types';

// Import the auto-backup module to initialize it.
import '$lib/auto-backup';

function setActionIcon(status: SyncStatus) {
    let iconPrefix: 'icon' | 'off-icon' | 'err-icon';

    switch (status) {
        case 'synced':
        case 'syncing':
            iconPrefix = 'icon';
            break;
        case 'error':
            iconPrefix = 'err-icon';
            break;
        case 'unauthenticated':
        case 'idle':
        default:
            iconPrefix = 'off-icon';
            break;
    }

    chrome.action.setIcon({
        path: {
            '16': `${iconPrefix}-16.png`,
            '32': `${iconPrefix}-32.png`,
            '48': `${iconPrefix}-48.png`,
            '128': `${iconPrefix}-128.png`
        }
    });
}

export default defineBackground(() => {
    // Listen for changes in sync status and update the icon accordingly.
    syncStatusStore.subscribe((syncState) => {
        if (syncState) {
            setActionIcon(syncState.status);
        }
    });

    // Helper function to search for a bookmark across all workspaces
    function findBookmarkInAllWorkspaces(appData: AppData, bookmarkId: string) {
        for (const workspace of appData.workspaces) {
            const bookmark = findBookmarkById(workspace.children, bookmarkId);
            if (bookmark) return bookmark;
        }
        return null;
    }

    // Helper function to search for a bookmark by URL across all workspaces
    function findBookmarkByUrlInAllWorkspaces(appData: AppData, url: string) {
        for (const workspace of appData.workspaces) {
            const bookmark = findBookmarkByUrl(workspace.children, url);
            if (bookmark) return { bookmark, workspaceId: workspace.id };
        }
        return null;
    }

    // Listener for when an alarm goes off
    chrome.alarms.onAlarm.addListener(async (alarm) => {
        if (alarm.name.startsWith("reminder-")) {
            const bookmarkId = alarm.name.replace("reminder-", "");
            
            const appData = await getAppData();
            const bookmark = findBookmarkInAllWorkspaces(appData, bookmarkId);

            if (bookmark) {
                // Create a notification
                chrome.notifications.create(`notification-${bookmark.id}`, {
                    type: "basic",
                    iconUrl: "icon-128.png", // WXT handles pathing
                    title: "Reminder: " + bookmark.title,
                    message: "Click to open this saved page.",
                    priority: 2,
                });
            }
        }
    });

    // Listener for when a notification is clicked
    chrome.notifications.onClicked.addListener((notificationId) => {
        if (notificationId.startsWith("notification-")) {
            const bookmarkId = notificationId.replace("notification-", "");
            
            // This part is tricky because we can't directly get the URL here
            // without another storage lookup. A better approach for a real app
            // might be to store the URL in the alarm/notification details if possible,
            // or perform the lookup as we do here.
            getAppData().then(appData => {
                const bookmark = findBookmarkInAllWorkspaces(appData, bookmarkId);
                if (bookmark?.url) {
                    chrome.tabs.create({ url: bookmark.url });
                }
            });
        }
    });

    // Listener for keyboard shortcut
  chrome.commands.onCommand.addListener(async (command) => {
    if (command === 'open-bookmark-dialog') {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id && tab.url) {
        chrome.tabs.sendMessage(tab.id, {
          action: 'openBookmarkDialog',
          data: {
            title: tab.title || 'No title',
            url: tab.url,
            favicon: tab.favIconUrl || null,
          },
        });
      }
    }
  });

    // Listener for when a user visits a page
    chrome.history.onVisited.addListener(async (historyItem) => {
        if (historyItem.url) {
            const appData = await getAppData();
            const result = findBookmarkByUrlInAllWorkspaces(appData, historyItem.url);

            if (result) {
                const { bookmark } = result;
                const visits = await chrome.history.getVisits({ url: historyItem.url });
                bookmark.accessHistory = visits.map((visit: chrome.history.VisitItem) => ({
                    timestamp: visit.visitTime!
                }));
                await setAppData(appData);
            }
        }
    });
});
