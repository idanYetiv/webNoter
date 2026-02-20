import type { Alert, Note, NoteScope } from "./types";

const PAGE_PREFIX = "notara_page_";
const SITE_PREFIX = "notara_site_";
const ALERT_PAGE_PREFIX = "notara_alert_page_";
const ALERT_SITE_PREFIX = "notara_alert_site_";

// Legacy prefixes for migration from webNoter
const LEGACY_PREFIXES = [
  { old: "webnoter_page_", new: PAGE_PREFIX },
  { old: "webnoter_site_", new: SITE_PREFIX },
  { old: "webnoter_alert_page_", new: ALERT_PAGE_PREFIX },
  { old: "webnoter_alert_site_", new: ALERT_SITE_PREFIX },
];

/** Migrate data from old webnoter_* keys to notara_* keys. */
export async function migrateFromWebNoter(): Promise<void> {
  const all = await chrome.storage.sync.get(null);
  const updates: Record<string, unknown> = {};
  const removals: string[] = [];

  for (const [key, value] of Object.entries(all)) {
    for (const prefix of LEGACY_PREFIXES) {
      if (key.startsWith(prefix.old)) {
        const suffix = key.slice(prefix.old.length);
        const newKey = `${prefix.new}${suffix}`;
        // Only migrate if new key doesn't already exist
        if (!(newKey in all)) {
          updates[newKey] = value;
        }
        removals.push(key);
        break;
      }
    }
  }

  if (Object.keys(updates).length > 0) {
    await chrome.storage.sync.set(updates);
  }
  if (removals.length > 0) {
    await chrome.storage.sync.remove(removals);
  }
}

export function getHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function storageKey(scope: NoteScope, identifier: string): string {
  return scope === "site"
    ? `${SITE_PREFIX}${identifier}`
    : `${PAGE_PREFIX}${identifier}`;
}

/** Key used to store a given note based on its scope. */
function noteStorageKey(note: Pick<Note, "scope" | "url">): string {
  const id = note.scope === "site" ? getHostname(note.url) : note.url;
  return storageKey(note.scope, id);
}

/** Get notes stored under a specific scope+identifier. */
async function getNotesForKey(key: string): Promise<Note[]> {
  const result = await chrome.storage.sync.get(key);
  return (result[key] as Note[] | undefined) ?? [];
}

/** Get page-level notes for a URL. */
export async function getPageNotes(url: string): Promise<Note[]> {
  return getNotesForKey(storageKey("page", url));
}

/** Get site-level notes for a hostname. */
export async function getSiteNotes(hostname: string): Promise<Note[]> {
  return getNotesForKey(storageKey("site", hostname));
}

/** Get both page-level and site-level notes visible on a given URL. */
export async function getNotesForUrl(url: string): Promise<Note[]> {
  const hostname = getHostname(url);
  const [pageNotes, siteNotes] = await Promise.all([
    getPageNotes(url),
    getSiteNotes(hostname),
  ]);
  return [...siteNotes, ...pageNotes];
}

export async function saveNote(note: Note): Promise<void> {
  const key = noteStorageKey(note);
  const notes = await getNotesForKey(key);
  const existing = notes.findIndex((n) => n.id === note.id);
  if (existing >= 0) {
    notes[existing] = note;
  } else {
    notes.push(note);
  }
  await chrome.storage.sync.set({ [key]: notes });
}

export async function deleteNote(note: Pick<Note, "id" | "scope" | "url">): Promise<void> {
  const key = noteStorageKey(note);
  const notes = await getNotesForKey(key);
  const filtered = notes.filter((n) => n.id !== note.id);
  if (filtered.length === 0) {
    await chrome.storage.sync.remove(key);
  } else {
    await chrome.storage.sync.set({ [key]: filtered });
  }
}

export async function updateNote(
  note: Pick<Note, "id" | "scope" | "url">,
  updates: Partial<Omit<Note, "id" | "url" | "createdAt">>
): Promise<void> {
  const key = noteStorageKey(note);
  const notes = await getNotesForKey(key);
  const index = notes.findIndex((n) => n.id === note.id);
  if (index < 0) return;
  notes[index] = { ...notes[index], ...updates, updatedAt: Date.now() };
  await chrome.storage.sync.set({ [key]: notes });
}

/** Change a note's scope (moves it between storage keys). */
export async function changeNoteScope(
  note: Note,
  newScope: NoteScope
): Promise<Note> {
  if (note.scope === newScope) return note;
  // Remove from old key
  await deleteNote(note);
  // Save under new key
  const updated = { ...note, scope: newScope, updatedAt: Date.now() };
  await saveNote(updated);
  return updated;
}

/** Get all notes across all storage keys, grouped by their storage key identifier. */
export async function getAllNotes(): Promise<Record<string, Note[]>> {
  const all = await chrome.storage.sync.get(null);
  const result: Record<string, Note[]> = {};
  for (const [key, value] of Object.entries(all)) {
    if (key.startsWith(PAGE_PREFIX)) {
      const url = key.slice(PAGE_PREFIX.length);
      result[url] = [...(result[url] ?? []), ...(value as Note[])];
    } else if (key.startsWith(SITE_PREFIX)) {
      const hostname = key.slice(SITE_PREFIX.length);
      result[hostname] = [...(result[hostname] ?? []), ...(value as Note[])];
    }
  }
  return result;
}

/** Count notes visible on a given URL (page + site). */
export async function getNoteCountForUrl(url: string): Promise<number> {
  const notes = await getNotesForUrl(url);
  return notes.length;
}

// --- Alert storage ---

function alertStorageKey(alert: Pick<Alert, "scope" | "url">): string {
  const id = alert.scope === "site" ? getHostname(alert.url) : alert.url;
  return alert.scope === "site"
    ? `${ALERT_SITE_PREFIX}${id}`
    : `${ALERT_PAGE_PREFIX}${id}`;
}

async function getAlertsForKey(key: string): Promise<Alert[]> {
  const result = await chrome.storage.sync.get(key);
  return (result[key] as Alert[] | undefined) ?? [];
}

export async function getAlertsForUrl(url: string): Promise<Alert[]> {
  const hostname = getHostname(url);
  const [pageAlerts, siteAlerts] = await Promise.all([
    getAlertsForKey(`${ALERT_PAGE_PREFIX}${url}`),
    getAlertsForKey(`${ALERT_SITE_PREFIX}${hostname}`),
  ]);
  return [...siteAlerts, ...pageAlerts];
}

export async function saveAlert(alert: Alert): Promise<void> {
  const key = alertStorageKey(alert);
  const alerts = await getAlertsForKey(key);
  const existing = alerts.findIndex((a) => a.id === alert.id);
  if (existing >= 0) {
    alerts[existing] = alert;
  } else {
    alerts.push(alert);
  }
  await chrome.storage.sync.set({ [key]: alerts });
}

export async function deleteAlert(alert: Pick<Alert, "id" | "scope" | "url">): Promise<void> {
  const key = alertStorageKey(alert);
  const alerts = await getAlertsForKey(key);
  const filtered = alerts.filter((a) => a.id !== alert.id);
  if (filtered.length === 0) {
    await chrome.storage.sync.remove(key);
  } else {
    await chrome.storage.sync.set({ [key]: filtered });
  }
}

export async function updateAlert(
  alert: Pick<Alert, "id" | "scope" | "url">,
  updates: Partial<Omit<Alert, "id" | "url" | "createdAt">>
): Promise<void> {
  const key = alertStorageKey(alert);
  const alerts = await getAlertsForKey(key);
  const index = alerts.findIndex((a) => a.id === alert.id);
  if (index < 0) return;
  alerts[index] = { ...alerts[index], ...updates, updatedAt: Date.now() };
  await chrome.storage.sync.set({ [key]: alerts });
}
