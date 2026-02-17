import { describe, it, expect, beforeEach } from "vitest";
import { getNotes, saveNote, deleteNote, updateNote, getAllNotes } from "./storage";
import type { Note } from "./types";

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: crypto.randomUUID(),
    url: "https://example.com",
    text: "Test note",
    color: "yellow",
    position: { x: 100, y: 100 },
    size: { w: 240, h: 200 },
    minimized: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

describe("storage", () => {
  beforeEach(() => {
    vi.mocked(chrome.storage.sync.get).mockReset();
    vi.mocked(chrome.storage.sync.set).mockReset();
    vi.mocked(chrome.storage.sync.remove).mockReset();
  });

  it("returns empty array when no notes exist", async () => {
    vi.mocked(chrome.storage.sync.get).mockResolvedValue({});
    const notes = await getNotes("https://example.com");
    expect(notes).toEqual([]);
  });

  it("saves a new note", async () => {
    vi.mocked(chrome.storage.sync.get).mockResolvedValue({});
    vi.mocked(chrome.storage.sync.set).mockResolvedValue(undefined);

    const note = makeNote();
    await saveNote(note);

    expect(chrome.storage.sync.set).toHaveBeenCalledWith({
      "webnoter_https://example.com": [note],
    });
  });

  it("deletes a note", async () => {
    const note = makeNote();
    vi.mocked(chrome.storage.sync.get).mockResolvedValue({
      "webnoter_https://example.com": [note],
    });
    vi.mocked(chrome.storage.sync.remove).mockResolvedValue(undefined);

    await deleteNote("https://example.com", note.id);
    expect(chrome.storage.sync.remove).toHaveBeenCalled();
  });

  it("updates a note", async () => {
    const note = makeNote();
    vi.mocked(chrome.storage.sync.get).mockResolvedValue({
      "webnoter_https://example.com": [note],
    });
    vi.mocked(chrome.storage.sync.set).mockResolvedValue(undefined);

    await updateNote("https://example.com", note.id, { text: "Updated" });

    const setCall = vi.mocked(chrome.storage.sync.set).mock.calls[0][0];
    const savedNotes = setCall["webnoter_https://example.com"] as Note[];
    expect(savedNotes[0].text).toBe("Updated");
  });

  it("gets all notes grouped by URL", async () => {
    const note1 = makeNote({ url: "https://a.com" });
    const note2 = makeNote({ url: "https://b.com" });
    vi.mocked(chrome.storage.sync.get).mockResolvedValue({
      "webnoter_https://a.com": [note1],
      "webnoter_https://b.com": [note2],
      "other_key": "ignored",
    });

    const all = await getAllNotes();
    expect(Object.keys(all)).toHaveLength(2);
    expect(all["https://a.com"]).toHaveLength(1);
    expect(all["https://b.com"]).toHaveLength(1);
  });
});
