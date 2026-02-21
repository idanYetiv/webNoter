import { getNoteCountForUrl, migrateFromWebNoter, getAllAlerts } from "../lib/storage";
import type { Alert, AlertSchedule, MessageAction } from "../lib/types";
import { getSupabase, isSupabaseConfigured } from "../lib/supabase";
import { AUTH_STORAGE_KEY } from "../lib/auth";
import type { UserProfile } from "../lib/auth";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";

// Update badge count for a tab (page + site notes combined)
async function updateBadge(tabId: number, url: string) {
  const count = await getNoteCountForUrl(url);
  chrome.action.setBadgeText({ text: count > 0 ? String(count) : "", tabId });
  chrome.action.setBadgeBackgroundColor({ color: "#00d4ff", tabId });
}

// --- Alarm helpers ---

function getNextDailyFire(timeOfDay: string): number {
  const [hours, minutes] = timeOfDay.split(":").map(Number);
  const now = new Date();
  const target = new Date();
  target.setHours(hours, minutes, 0, 0);
  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1);
  }
  return target.getTime();
}

function getNextWeeklyFire(dayOfWeek: number, timeOfDay: string): number {
  const [hours, minutes] = timeOfDay.split(":").map(Number);
  const now = new Date();
  const target = new Date();
  target.setHours(hours, minutes, 0, 0);

  const currentDay = now.getDay();
  let daysUntil = dayOfWeek - currentDay;
  if (daysUntil < 0 || (daysUntil === 0 && target.getTime() <= now.getTime())) {
    daysUntil += 7;
  }
  target.setDate(target.getDate() + daysUntil);
  return target.getTime();
}

function registerAlarm(schedule: AlertSchedule): void {
  switch (schedule.type) {
    case "daily": {
      const when = getNextDailyFire(schedule.timeOfDay);
      chrome.alarms.create(schedule.alarmName, {
        when,
        periodInMinutes: 24 * 60,
      });
      break;
    }
    case "weekly": {
      const when = getNextWeeklyFire(schedule.dayOfWeek ?? 0, schedule.timeOfDay);
      chrome.alarms.create(schedule.alarmName, {
        when,
        periodInMinutes: 7 * 24 * 60,
      });
      break;
    }
    case "custom": {
      chrome.alarms.create(schedule.alarmName, {
        delayInMinutes: schedule.intervalMinutes ?? 60,
        periodInMinutes: schedule.intervalMinutes ?? 60,
      });
      break;
    }
  }
}

async function reregisterAllAlarms(): Promise<void> {
  await chrome.alarms.clearAll();
  const allAlerts = await getAllAlerts();
  for (const alerts of Object.values(allAlerts)) {
    for (const alert of alerts) {
      if (alert.enabled && alert.schedule) {
        registerAlarm(alert.schedule);
      }
    }
  }
}

// Find alert by alarm name across all stored alerts
async function findAlertByAlarmName(alarmName: string): Promise<Alert | null> {
  const allAlerts = await getAllAlerts();
  for (const alerts of Object.values(allAlerts)) {
    const found = alerts.find((a) => a.schedule?.alarmName === alarmName);
    if (found) return found;
  }
  return null;
}

// --- Auth helpers ---

async function handleGoogleSignIn(): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: "Auth not configured. Set up .env with Supabase credentials." };
  }

  try {
    const redirectUrl = chrome.identity.getRedirectURL();
    const nonce = crypto.randomUUID();
    // Google embeds the hashed nonce in the id_token; Supabase hashes the raw nonce to compare.
    // So we send the hash to Google and the raw nonce to Supabase.
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(nonce));
    const hashedNonce = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID);
    authUrl.searchParams.set("redirect_uri", redirectUrl);
    authUrl.searchParams.set("response_type", "id_token");
    authUrl.searchParams.set("scope", "openid email profile");
    authUrl.searchParams.set("nonce", hashedNonce);

    const responseUrl = await chrome.identity.launchWebAuthFlow({
      url: authUrl.toString(),
      interactive: true,
    });

    if (!responseUrl) {
      return { success: false, error: "No response from Google" };
    }

    const hash = new URL(responseUrl).hash.substring(1);
    const params = new URLSearchParams(hash);
    const idToken = params.get("id_token");

    if (!idToken) {
      return { success: false, error: "No ID token in response" };
    }

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token: idToken,
      nonce,
    });

    if (error || !data.user) {
      return { success: false, error: error?.message ?? "Sign-in failed" };
    }

    const user: UserProfile = {
      id: data.user.id,
      email: data.user.email ?? "",
      name: data.user.user_metadata?.full_name ?? data.user.email ?? "",
      avatarUrl: data.user.user_metadata?.avatar_url ?? "",
    };

    await chrome.storage.session.set({ [AUTH_STORAGE_KEY]: user });
    return { success: true, user };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

async function handleSignOut(): Promise<void> {
  const supabase = getSupabase();
  if (supabase) {
    await supabase.auth.signOut();
  }
  await chrome.storage.session.remove(AUTH_STORAGE_KEY);
}

async function getCurrentAuthState(): Promise<{ isAuthenticated: boolean; user: UserProfile | null }> {
  // Check session cache first
  const cached = await chrome.storage.session.get(AUTH_STORAGE_KEY);
  if (cached[AUTH_STORAGE_KEY]) {
    return { isAuthenticated: true, user: cached[AUTH_STORAGE_KEY] as UserProfile };
  }

  // Fallback: rehydrate from Supabase persisted session
  const supabase = getSupabase();
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) {
      const user: UserProfile = {
        id: data.session.user.id,
        email: data.session.user.email ?? "",
        name: data.session.user.user_metadata?.full_name ?? data.session.user.email ?? "",
        avatarUrl: data.session.user.user_metadata?.avatar_url ?? "",
      };
      await chrome.storage.session.set({ [AUTH_STORAGE_KEY]: user });
      return { isAuthenticated: true, user };
    }
  }

  return { isAuthenticated: false, user: null };
}

// Rehydrate auth on service worker startup
async function rehydrateAuth(): Promise<void> {
  if (!isSupabaseConfigured) return;
  await getCurrentAuthState();
}

// --- Alarm listener ---

chrome.alarms.onAlarm.addListener(async (alarm) => {
  const alert = await findAlertByAlarmName(alarm.name);
  if (!alert || !alert.enabled) return;

  chrome.notifications.create(alarm.name, {
    type: "basic",
    iconUrl: "public/icon-128.png",
    title: "Notara Reminder",
    message: alert.message || "Scheduled alert",
  });
});

// Migrate legacy storage keys & set up context menu
chrome.runtime.onInstalled.addListener(async () => {
  await migrateFromWebNoter();
  chrome.contextMenus.create({
    id: "notara-add",
    title: "Add Notara sticky note",
    contexts: ["page"],
  });
  await reregisterAllAlarms();
  await rehydrateAuth();
});

// Re-register alarms on service worker startup
chrome.runtime.onStartup.addListener(async () => {
  await reregisterAllAlarms();
  await rehydrateAuth();
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
      return true;
    }

    if (message.type === "SCHEDULE_ALERT") {
      const { alert } = message;
      if (alert.schedule) {
        registerAlarm(alert.schedule);
      }
      sendResponse({ success: true });
      return false;
    }

    if (message.type === "CANCEL_ALERT") {
      chrome.alarms.clear(message.alarmName);
      sendResponse({ success: true });
      return false;
    }

    if (message.type === "SIGN_IN_GOOGLE") {
      handleGoogleSignIn().then(sendResponse);
      return true;
    }

    if (message.type === "SIGN_OUT") {
      handleSignOut().then(() => sendResponse({ success: true }));
      return true;
    }

    if (message.type === "GET_AUTH_STATE") {
      getCurrentAuthState().then(sendResponse);
      return true;
    }
  }
);

// Extension icon click — toggle panel (only fires when popup is empty, i.e. user is signed in)
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
