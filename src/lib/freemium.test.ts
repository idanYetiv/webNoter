import { describe, it, expect, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { canCreateNote, isPro, FREE_NOTE_LIMIT } from "./freemium";
import type { Note } from "./types";

const mockGet = chrome.storage.sync.get as unknown as Mock;
const mockSet = chrome.storage.sync.set as unknown as Mock;

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

describe("freemium", () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockSet.mockReset();
  });

  it("canCreateNote returns allowed=true when under limit", async () => {
    const notes = Array.from({ length: 5 }, () => makeNote());
    mockGet
      // isPro check
      .mockResolvedValueOnce({})
      // getAllNotes
      .mockResolvedValueOnce({
        "notara_page_https://example.com/page1": notes,
      });

    const result = await canCreateNote();
    expect(result.allowed).toBe(true);
    expect(result.current).toBe(5);
    expect(result.limit).toBe(FREE_NOTE_LIMIT);
  });

  it("canCreateNote returns allowed=false when at limit", async () => {
    const notes = Array.from({ length: FREE_NOTE_LIMIT }, () => makeNote());
    mockGet
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({
        "notara_page_https://example.com/page1": notes,
      });

    const result = await canCreateNote();
    expect(result.allowed).toBe(false);
    expect(result.current).toBe(FREE_NOTE_LIMIT);
    expect(result.limit).toBe(FREE_NOTE_LIMIT);
  });

  it("canCreateNote returns allowed=false when over limit", async () => {
    const notes = Array.from({ length: FREE_NOTE_LIMIT + 5 }, () =>
      makeNote()
    );
    mockGet
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({
        "notara_page_https://example.com/page1": notes,
      });

    const result = await canCreateNote();
    expect(result.allowed).toBe(false);
    expect(result.current).toBe(FREE_NOTE_LIMIT + 5);
  });

  it("isPro returns true when flag is set, bypasses limit", async () => {
    const notes = Array.from({ length: FREE_NOTE_LIMIT + 10 }, () =>
      makeNote()
    );

    // First: standalone isPro check
    mockGet.mockResolvedValueOnce({ notara_pro: true });
    const pro = await isPro();
    expect(pro).toBe(true);

    // Then: canCreateNote (calls isPro internally, then getAllNotes)
    mockGet
      .mockResolvedValueOnce({ notara_pro: true })
      .mockResolvedValueOnce({
        "notara_page_https://example.com/page1": notes,
      });

    const result = await canCreateNote();
    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(Infinity);
  });

  it("isPro returns false when flag is not set", async () => {
    mockGet.mockResolvedValueOnce({});
    const result = await isPro();
    expect(result).toBe(false);
  });

  it("counts notes across multiple storage keys", async () => {
    const pageNotes = Array.from({ length: 10 }, () => makeNote());
    const siteNotes = Array.from({ length: 11 }, () =>
      makeNote({ scope: "site" })
    );
    mockGet
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({
        "notara_page_https://example.com/page1": pageNotes,
        "notara_site_example.com": siteNotes,
      });

    const result = await canCreateNote();
    expect(result.allowed).toBe(false);
    expect(result.current).toBe(21);
  });
});
