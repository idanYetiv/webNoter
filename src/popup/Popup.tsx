import { useState, useEffect } from "react";
import type { Note } from "../lib/types";
import { getAllNotes, deleteNote } from "../lib/storage";
import { NOTE_COLORS } from "../lib/types";
import { canCreateNote, FREE_NOTE_LIMIT } from "../lib/freemium";

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
  const [atLimit, setAtLimit] = useState(false);

  useEffect(() => {
    loadNotes();
  }, []);

  async function loadNotes() {
    const allNotes = await getAllNotes();
    setGroups(groupByDomain(allNotes));
    const check = await canCreateNote();
    setAtLimit(!check.allowed);
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
    <div className="flex flex-col h-full text-[#e2e8f0]" style={{ backgroundColor: "#0a0a14" }}>
      {/* Header */}
      <div className="p-4" style={{ backgroundColor: "#1a1a2e", borderBottom: "1px solid #2a2a40" }}>
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold" style={{ color: "#00d4ff" }}>Notara</h1>
          <span className="text-sm px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(0,212,255,0.15)", color: atLimit ? "#f87171" : "#00d4ff" }}>
            {totalNotes} / {FREE_NOTE_LIMIT} notes
          </span>
        </div>
        <p className="text-xs mt-1" style={{ color: "#64748b" }}>Sticky notes on any website</p>
      </div>

      {/* Add note button */}
      <div className="p-3">
        <button
          onClick={handleAddNote}
          disabled={atLimit}
          className="w-full py-2 px-4 rounded-lg font-medium text-sm transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          style={{ backgroundColor: "#1a1a2e", color: atLimit ? "#64748b" : "#00d4ff", border: "1px solid #2a2a40" }}
          title={atLimit ? `Note limit reached (${FREE_NOTE_LIMIT})` : undefined}
        >
          {atLimit ? `Limit reached (${FREE_NOTE_LIMIT} notes)` : "+ Add Note to Current Page"}
        </button>
      </div>

      {/* Sites list */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {groups.length === 0 ? (
          <div className="text-center mt-8 text-sm" style={{ color: "#64748b" }}>
            <p>No notes yet!</p>
            <p className="mt-1">Click the + button to add your first note.</p>
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.domain} className="mb-2">
              <button
                onClick={() => toggleExpand(group.domain)}
                className="w-full flex items-center justify-between p-2 rounded-lg text-left cursor-pointer"
                style={{ backgroundColor: "#12121f", border: "1px solid #2a2a40" }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm" style={{ color: "#64748b" }}>
                    {expanded.has(group.domain) ? "\u25BC" : "\u25B6"}
                  </span>
                  <span className="font-medium text-sm truncate" style={{ color: "#e2e8f0" }}>
                    {group.domain}
                  </span>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: "rgba(0,212,255,0.15)", color: "#00d4ff" }}>
                  {group.notes.length}
                </span>
              </button>

              {expanded.has(group.domain) && (
                <div className="ml-4 mt-1 space-y-1">
                  {group.notes.map((note) => (
                    <div
                      key={note.id}
                      className="flex items-center gap-2 p-2 rounded text-xs"
                      style={{ backgroundColor: "#1a1a2e", border: "1px solid #2a2a40" }}
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
                      <span className="flex-1 truncate" style={{ color: "#e2e8f0" }}>
                        {note.text || "(empty note)"}
                      </span>
                      <button
                        onClick={() => handleDeleteNote(note)}
                        className="flex-shrink-0 cursor-pointer"
                        style={{ color: "#64748b" }}
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
