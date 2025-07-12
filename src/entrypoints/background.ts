import { defineBackground } from "#imports";
import { findBookmarkById, getAppData, findBookmarkByUrl, setAppData } from "../lib/storage";

// Import the auto-backup module to initialize it.
import '$lib/auto-backup';

export default defineBackground(() => {
    console.log("Background script loaded.");

    // Listener for when an alarm goes off
    chrome.alarms.onAlarm.addListener(async (alarm) => {
        console.log("Alarm fired:", alarm);

        if (alarm.name.startsWith("reminder-")) {
            const bookmarkId = alarm.name.replace("reminder-", "");
            
            // Find the bookmark associated with this reminder
            const appData = await getAppData();
            const bookmark = findBookmarkById(appData.folders, bookmarkId);

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
                const bookmark = findBookmarkById(appData.folders, bookmarkId);
                if (bookmark?.url) {
                    chrome.tabs.create({ url: bookmark.url });
                }
            });
        }
    });

    // Listener for when a user visits a page
    chrome.history.onVisited.addListener(async (historyItem) => {
        if (historyItem.url) {
            const appData = await getAppData();
            const bookmark = findBookmarkByUrl(appData.folders, historyItem.url);

            if (bookmark) {
                console.log(`Updating history for bookmarked item: ${bookmark.title}`);
                const visits = await chrome.history.getVisits({ url: historyItem.url });
                bookmark.accessHistory = visits.map(visit => ({
                    timestamp: visit.visitTime!
                }));
                await setAppData(appData);
            }
        }
    });
});
