import { describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";
import {
  getPageNotes,
  getSiteNotes,
  getNotesForUrl,
  saveNote,
  deleteNote,
  updateNote,
  changeNoteScope,
  getAllNotes,
  getNoteCountForUrl,
} from "./storage";
import type { Note } from "./types";

// Chrome storage methods are overloaded (callback vs promise).
// Cast to Mock for clean test usage.
const mockGet = chrome.storage.sync.get as unknown as Mock;
const mockSet = chrome.storage.sync.set as unknown as Mock;
const mockRemove = chrome.storage.sync.remove as unknown as Mock;

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: crypto.randomUUID(),
    url: "https://example.com/page1",
    scope: "page",
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
    mockGet.mockReset();
    mockSet.mockReset();
    mockRemove.mockReset();
  });

  it("returns empty array when no page notes exist", async () => {
    mockGet.mockResolvedValue({});
    const notes = await getPageNotes("https://example.com/page1");
    expect(notes).toEqual([]);
  });

  it("returns empty array when no site notes exist", async () => {
    mockGet.mockResolvedValue({});
    const notes = await getSiteNotes("example.com");
    expect(notes).toEqual([]);
  });

  it("saves a page-level note with the correct key", async () => {
    mockGet.mockResolvedValue({});
    mockSet.mockResolvedValue(undefined);

    const note = makeNote();
    await saveNote(note);

    expect(chrome.storage.sync.set).toHaveBeenCalledWith({
      "webnoter_page_https://example.com/page1": [note],
    });
  });

  it("saves a site-level note with hostname key", async () => {
    mockGet.mockResolvedValue({});
    mockSet.mockResolvedValue(undefined);

    const note = makeNote({ scope: "site" });
    await saveNote(note);

    expect(chrome.storage.sync.set).toHaveBeenCalledWith({
      "webnoter_site_example.com": [note],
    });
  });

  it("getNotesForUrl returns both page and site notes", async () => {
    const pageNote = makeNote({ id: "p1" });
    const siteNote = makeNote({ id: "s1", scope: "site" });

    mockGet.mockImplementation((key) => {
      if (key === "webnoter_page_https://example.com/page1") {
        return Promise.resolve({ [key as string]: [pageNote] });
      }
      if (key === "webnoter_site_example.com") {
        return Promise.resolve({ [key as string]: [siteNote] });
      }
      return Promise.resolve({});
    });

    const notes = await getNotesForUrl("https://example.com/page1");
    expect(notes).toHaveLength(2);
    expect(notes[0].id).toBe("s1"); // site notes come first
    expect(notes[1].id).toBe("p1");
  });

  it("deletes a page note and removes key when empty", async () => {
    const note = makeNote();
    mockGet.mockResolvedValue({
      "webnoter_page_https://example.com/page1": [note],
    });
    mockRemove.mockResolvedValue(undefined);

    await deleteNote(note);
    expect(chrome.storage.sync.remove).toHaveBeenCalledWith(
      "webnoter_page_https://example.com/page1"
    );
  });

  it("deletes a site note and removes key when empty", async () => {
    const note = makeNote({ scope: "site" });
    mockGet.mockResolvedValue({
      "webnoter_site_example.com": [note],
    });
    mockRemove.mockResolvedValue(undefined);

    await deleteNote(note);
    expect(chrome.storage.sync.remove).toHaveBeenCalledWith(
      "webnoter_site_example.com"
    );
  });

  it("updates a note's text", async () => {
    const note = makeNote();
    mockGet.mockResolvedValue({
      "webnoter_page_https://example.com/page1": [note],
    });
    mockSet.mockResolvedValue(undefined);

    await updateNote(note, { text: "Updated" });

    const setCall = mockSet.mock.calls[0][0] as Record<string, Note[]>;
    const savedNotes = setCall["webnoter_page_https://example.com/page1"];
    expect(savedNotes[0].text).toBe("Updated");
  });

  it("changeNoteScope moves a note from page to site key", async () => {
    const note = makeNote();

    // First call: delete reads from page key
    // Second call: save reads from site key
    mockGet
      .mockResolvedValueOnce({
        "webnoter_page_https://example.com/page1": [note],
      })
      .mockResolvedValueOnce({});
    mockRemove.mockResolvedValue(undefined);
    mockSet.mockResolvedValue(undefined);

    const updated = await changeNoteScope(note, "site");

    expect(updated.scope).toBe("site");
    expect(chrome.storage.sync.remove).toHaveBeenCalledWith(
      "webnoter_page_https://example.com/page1"
    );
    expect(chrome.storage.sync.set).toHaveBeenCalledWith(
      expect.objectContaining({
        "webnoter_site_example.com": expect.any(Array),
      })
    );
  });

  it("getAllNotes returns notes grouped by identifier", async () => {
    const pageNote = makeNote({ id: "p1" });
    const siteNote = makeNote({ id: "s1", scope: "site" });

    mockGet.mockResolvedValue({
      "webnoter_page_https://example.com/page1": [pageNote],
      "webnoter_site_example.com": [siteNote],
      other_key: "ignored",
    });

    const all = await getAllNotes();
    expect(Object.keys(all)).toHaveLength(2);
    expect(all["https://example.com/page1"]).toHaveLength(1);
    expect(all["example.com"]).toHaveLength(1);
  });

  it("getNoteCountForUrl counts both page and site notes", async () => {
    const pageNote = makeNote({ id: "p1" });
    const siteNote = makeNote({ id: "s1", scope: "site" });

    mockGet.mockImplementation((key) => {
      if (key === "webnoter_page_https://example.com/page1") {
        return Promise.resolve({ [key as string]: [pageNote] });
      }
      if (key === "webnoter_site_example.com") {
        return Promise.resolve({ [key as string]: [siteNote] });
      }
      return Promise.resolve({});
    });

    const count = await getNoteCountForUrl("https://example.com/page1");
    expect(count).toBe(2);
  });
});
