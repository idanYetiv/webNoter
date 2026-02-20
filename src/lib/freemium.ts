import { getAllNotes } from "./storage";

export const FREE_NOTE_LIMIT = 20;

const PRO_KEY = "notara_pro";

/** Check whether the user has Pro status. */
export async function isPro(): Promise<boolean> {
  const result = await chrome.storage.sync.get(PRO_KEY);
  return result[PRO_KEY] === true;
}

/** Set Pro status (for future payment integration). */
export async function setPro(value: boolean): Promise<void> {
  await chrome.storage.sync.set({ [PRO_KEY]: value });
}

/** Count all notes across every page and site. */
export async function getTotalNoteCount(): Promise<number> {
  const allNotes = await getAllNotes();
  let count = 0;
  for (const notes of Object.values(allNotes)) {
    count += notes.length;
  }
  return count;
}

/** Check whether the user can create a new note. */
export async function canCreateNote(): Promise<{
  allowed: boolean;
  current: number;
  limit: number;
}> {
  if (await isPro()) {
    const current = await getTotalNoteCount();
    return { allowed: true, current, limit: Infinity };
  }

  const current = await getTotalNoteCount();
  return {
    allowed: current < FREE_NOTE_LIMIT,
    current,
    limit: FREE_NOTE_LIMIT,
  };
}
