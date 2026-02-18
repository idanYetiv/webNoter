import { getNoteCountForUrl } from "../lib/storage";
import type { MessageAction } from "../lib/types";

// Update badge count for a tab (page + site notes combined)
async function updateBadge(tabId: number, url: string) {
  const count = await getNoteCountForUrl(url);
  chrome.action.setBadgeText({ text: count > 0 ? String(count) : "", tabId });
  chrome.action.setBadgeBackgroundColor({ color: "#f59e0b", tabId });
}

// Context menu setup
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "webnoter-add",
    title: "Add webNoter sticky note",
    contexts: ["page"],
  });
});

// Context menu click
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "webnoter-add" && tab?.id && tab.url) {
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
