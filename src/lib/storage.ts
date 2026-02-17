import type { Note } from "./types";

const STORAGE_KEY_PREFIX = "webnoter_";

function storageKey(url: string): string {
  return `${STORAGE_KEY_PREFIX}${url}`;
}

export async function getNotes(url: string): Promise<Note[]> {
  const key = storageKey(url);
  const result = await chrome.storage.sync.get(key);
  return (result[key] as Note[] | undefined) ?? [];
}

export async function saveNote(note: Note): Promise<void> {
  const notes = await getNotes(note.url);
  const existing = notes.findIndex((n) => n.id === note.id);
  if (existing >= 0) {
    notes[existing] = note;
  } else {
    notes.push(note);
  }
  await chrome.storage.sync.set({ [storageKey(note.url)]: notes });
}

export async function deleteNote(url: string, noteId: string): Promise<void> {
  const notes = await getNotes(url);
  const filtered = notes.filter((n) => n.id !== noteId);
  if (filtered.length === 0) {
    await chrome.storage.sync.remove(storageKey(url));
  } else {
    await chrome.storage.sync.set({ [storageKey(url)]: filtered });
  }
}

export async function updateNote(
  url: string,
  noteId: string,
  updates: Partial<Omit<Note, "id" | "url" | "createdAt">>
): Promise<void> {
  const notes = await getNotes(url);
  const index = notes.findIndex((n) => n.id === noteId);
  if (index < 0) return;
  notes[index] = { ...notes[index], ...updates, updatedAt: Date.now() };
  await chrome.storage.sync.set({ [storageKey(url)]: notes });
}

export async function getAllNotes(): Promise<Record<string, Note[]>> {
  const all = await chrome.storage.sync.get(null);
  const result: Record<string, Note[]> = {};
  for (const [key, value] of Object.entries(all)) {
    if (key.startsWith(STORAGE_KEY_PREFIX)) {
      const url = key.slice(STORAGE_KEY_PREFIX.length);
      result[url] = value as Note[];
    }
  }
  return result;
}
