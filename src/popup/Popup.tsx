import { useState, useEffect } from "react";
import type { Note } from "../lib/types";
import { getAllNotes, deleteNote } from "../lib/storage";
import { NOTE_COLORS } from "../lib/types";

interface SiteGroup {
  domain: string;
  notes: Note[];
}

function groupByDomain(allNotes: Record<string, Note[]>): SiteGroup[] {
  const domainMap = new Map<string, Note[]>();

  for (const notes of Object.values(allNotes)) {
    for (const note of notes) {
      let domain: string;
      try {
        domain = new URL(note.url).hostname;
      } catch {
        domain = note.url;
      }
      if (!domainMap.has(domain)) domainMap.set(domain, []);
      domainMap.get(domain)!.push(note);
    }
  }

  return Array.from(domainMap.entries())
    .map(([domain, notes]) => ({ domain, notes }))
    .sort((a, b) => b.notes.length - a.notes.length);
}

export default function Popup() {
  const [groups, setGroups] = useState<SiteGroup[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadNotes();
  }, []);

  async function loadNotes() {
    const allNotes = await getAllNotes();
    setGroups(groupByDomain(allNotes));
  }

  function toggleExpand(domain: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(domain)) next.delete(domain);
      else next.add(domain);
      return next;
    });
  }

  async function handleDeleteNote(note: Note) {
    await deleteNote(note);
    await loadNotes();
  }

  async function handleAddNote() {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, { type: "ADD_NOTE", url: tab.url });
    }
  }

  const totalNotes = groups.reduce((sum, g) => sum + g.notes.length, 0);

  return (
    <div className="flex flex-col h-full bg-amber-50 text-gray-800">
      {/* Header */}
      <div className="p-4 bg-amber-400 text-gray-900">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">webNoter</h1>
          <span className="text-sm bg-amber-500/30 px-2 py-0.5 rounded-full">
            {totalNotes} note{totalNotes !== 1 ? "s" : ""}
          </span>
        </div>
        <p className="text-xs mt-1 opacity-80">Sticky notes on any website</p>
      </div>

      {/* Add note button */}
      <div className="p-3">
        <button
          onClick={handleAddNote}
          className="w-full py-2 px-4 bg-amber-400 hover:bg-amber-500 text-gray-900 rounded-lg font-medium text-sm transition-colors cursor-pointer"
        >
          + Add Note to Current Page
        </button>
      </div>

      {/* Sites list */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {groups.length === 0 ? (
          <div className="text-center text-gray-500 mt-8 text-sm">
            <p>No notes yet!</p>
            <p className="mt-1">Click the + button to add your first note.</p>
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.domain} className="mb-2">
              <button
                onClick={() => toggleExpand(group.domain)}
                className="w-full flex items-center justify-between p-2 bg-white rounded-lg shadow-sm hover:shadow text-left cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm">
                    {expanded.has(group.domain) ? "\u25BC" : "\u25B6"}
                  </span>
                  <span className="font-medium text-sm truncate">
                    {group.domain}
                  </span>
                </div>
                <span className="text-xs bg-amber-100 px-2 py-0.5 rounded-full flex-shrink-0">
                  {group.notes.length}
                </span>
              </button>

              {expanded.has(group.domain) && (
                <div className="ml-4 mt-1 space-y-1">
                  {group.notes.map((note) => (
                    <div
                      key={note.id}
                      className="flex items-center gap-2 p-2 bg-white rounded shadow-sm text-xs"
                    >
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: NOTE_COLORS[note.color] }}
                      />
                      <span
                        className="flex-shrink-0"
                        title={
                          note.scope === "site"
                            ? "Website-level note"
                            : "Page-level note"
                        }
                      >
                        {note.scope === "site" ? "\u{1F310}" : "\u{1F4C4}"}
                      </span>
                      <span className="flex-1 truncate">
                        {note.text || "(empty note)"}
                      </span>
                      <button
                        onClick={() => handleDeleteNote(note)}
                        className="text-gray-400 hover:text-red-500 flex-shrink-0 cursor-pointer"
                        title="Delete note"
                      >
                        {"\u2715"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
