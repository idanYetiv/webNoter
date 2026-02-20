import { getNoteCountForUrl, migrateFromWebNoter } from "../lib/storage";
import type { MessageAction } from "../lib/types";

// Update badge count for a tab (page + site notes combined)
async function updateBadge(tabId: number, url: string) {
  const count = await getNoteCountForUrl(url);
  chrome.action.setBadgeText({ text: count > 0 ? String(count) : "", tabId });
  chrome.action.setBadgeBackgroundColor({ color: "#00d4ff", tabId });
}

// Migrate legacy storage keys & set up context menu
chrome.runtime.onInstalled.addListener(async () => {
  await migrateFromWebNoter();
  chrome.contextMenus.create({
    id: "notara-add",
    title: "Add Notara sticky note",
    contexts: ["page"],
  });
});

// Context menu click
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "notara-add" && tab?.id && tab.url) {
    chrome.tabs.sendMessage(tab.id, {
      type: "ADD_NOTE",
      url: tab.url,
    } satisfies MessageAction);
  }
});

// Message handling
chrome.runtime.onMessage.addListener(
  (message: MessageAction, _sender, sendResponse) => {
    if (message.type === "GET_NOTE_COUNT") {
      getNoteCountForUrl(message.url).then((count) => {
        sendResponse({ type: "NOTE_COUNT", count });
      });
      return true; // async response
    }
  }
);

// Extension icon click — toggle panel in content script
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_PANEL" });
  }
});

// Update badge when tab becomes active
chrome.tabs.onActivated?.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  if (tab.url) {
    updateBadge(activeInfo.tabId, tab.url);
  }
});

// Update badge when page loads
chrome.tabs.onUpdated?.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    updateBadge(tabId, tab.url);
  }
});
