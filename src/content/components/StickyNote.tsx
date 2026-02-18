import { useState, useRef, useCallback } from "react";
import type { Note, NoteColor } from "../../lib/types";
import { NOTE_COLORS } from "../../lib/types";
import NoteEditor from "./NoteEditor";
import ScreenshotButton from "./ScreenshotButton";

interface StickyNoteProps {
  note: Note;
  onUpdate: (
    note: Note,
    updates: Partial<Omit<Note, "id" | "url" | "createdAt">>
  ) => void;
  onDelete: (note: Note) => void;
  onToggleScope: (note: Note) => void;
}

const COLOR_OPTIONS: NoteColor[] = ["yellow", "pink", "blue", "green", "purple"];

export default function StickyNote({
  note,
  onUpdate,
  onDelete,
  onToggleScope,
}: StickyNoteProps) {
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [showColors, setShowColors] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const noteRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest("[data-no-drag]")) return;
      e.preventDefault();
      setDragging(true);
      dragOffset.current = {
        x: e.clientX - note.position.x,
        y: e.clientY - note.position.y,
      };

      const handleMouseMove = (ev: MouseEvent) => {
        onUpdate(note, {
          position: {
            x: ev.clientX - dragOffset.current.x,
            y: ev.clientY - dragOffset.current.y,
          },
        });
      };

      const handleMouseUp = () => {
        setDragging(false);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [note, onUpdate]
  );

  const handleResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setResizing(true);
      const startX = e.clientX;
      const startY = e.clientY;
      const startW = note.size.w;
      const startH = note.size.h;

      const handleMouseMove = (ev: MouseEvent) => {
        onUpdate(note, {
          size: {
            w: Math.max(180, startW + ev.clientX - startX),
            h: Math.max(120, startH + ev.clientY - startY),
          },
        });
      };

      const handleMouseUp = () => {
        setResizing(false);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [note, onUpdate]
  );

  const bgColor = NOTE_COLORS[note.color];
  const isSiteScope = note.scope === "site";

  return (
    <div
      ref={noteRef}
      onMouseDown={handleMouseDown}
      style={{
        position: "fixed",
        left: note.position.x,
        top: note.position.y,
        width: note.minimized ? 200 : note.size.w,
        height: note.minimized ? 32 : note.size.h,
        backgroundColor: bgColor,
        borderRadius: "8px",
        boxShadow: isSiteScope
          ? "0 4px 12px rgba(59,130,246,0.3)"
          : "0 4px 12px rgba(0,0,0,0.15)",
        cursor: dragging ? "grabbing" : "grab",
        zIndex: 2147483646,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        fontFamily: "system-ui, -apple-system, sans-serif",
        transition: resizing ? "none" : "width 0.2s, height 0.2s",
        userSelect: "none",
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "4px 8px",
          fontSize: "12px",
          borderBottom: note.minimized
            ? "none"
            : "1px solid rgba(0,0,0,0.1)",
          minHeight: "24px",
        }}
      >
        <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
          <button
            data-no-drag
            onClick={() => onUpdate(note, { minimized: !note.minimized })}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "12px",
              padding: "0 2px",
            }}
            title={note.minimized ? "Expand" : "Minimize"}
          >
            {note.minimized ? "\u25B6" : "\u25BC"}
          </button>

          {/* Scope toggle */}
          <button
            data-no-drag
            onClick={() => onToggleScope(note)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "12px",
              padding: "0 2px",
              opacity: isSiteScope ? 1 : 0.4,
            }}
            title={
              isSiteScope
                ? "Website-level note (visible on all pages of this site) — click to make page-level"
                : "Page-level note (only this URL) — click to make website-level"
            }
          >
            {"\u{1F310}"}
          </button>

          {!note.minimized && (
            <>
              <button
                data-no-drag
                onClick={() => setShowColors(!showColors)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "12px",
                  padding: "0 2px",
                }}
                title="Change color"
              >
                {"\u{1F3A8}"}
              </button>
              <ScreenshotButton
                onCapture={(dataUrl) =>
                  onUpdate(note, { screenshot: dataUrl })
                }
              />
            </>
          )}
        </div>
        <button
          data-no-drag
          onClick={() => onDelete(note)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: "14px",
            padding: "0 2px",
            color: "#666",
          }}
          title="Delete note"
        >
          {"\u2715"}
        </button>
      </div>

      {/* Color picker */}
      {showColors && !note.minimized && (
        <div
          data-no-drag
          style={{
            display: "flex",
            gap: "4px",
            padding: "4px 8px",
            borderBottom: "1px solid rgba(0,0,0,0.1)",
          }}
        >
          {COLOR_OPTIONS.map((c) => (
            <button
              key={c}
              onClick={() => {
                onUpdate(note, { color: c });
                setShowColors(false);
              }}
              style={{
                width: "20px",
                height: "20px",
                borderRadius: "50%",
                backgroundColor: NOTE_COLORS[c],
                border:
                  c === note.color
                    ? "2px solid #333"
                    : "1px solid rgba(0,0,0,0.2)",
                cursor: "pointer",
                padding: 0,
              }}
              title={c}
            />
          ))}
        </div>
      )}

      {/* Content */}
      {!note.minimized && (
        <>
          <div data-no-drag style={{ flex: 1, overflow: "auto" }}>
            <NoteEditor
              text={note.text}
              onChange={(text) => onUpdate(note, { text })}
            />
          </div>

          {/* Screenshot thumbnail */}
          {note.screenshot && (
            <div
              data-no-drag
              style={{
                padding: "4px 8px",
                borderTop: "1px solid rgba(0,0,0,0.1)",
              }}
            >
              <img
                src={note.screenshot}
                alt="Screenshot"
                style={{
                  width: "100%",
                  borderRadius: "4px",
                  display: "block",
                }}
              />
            </div>
          )}

          {/* Resize handle */}
          <div
            data-no-drag
            onMouseDown={handleResize}
            style={{
              position: "absolute",
              right: 0,
              bottom: 0,
              width: "16px",
              height: "16px",
              cursor: "nwse-resize",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "10px",
              color: "rgba(0,0,0,0.3)",
            }}
          >
            {"\u25E2"}
          </div>
        </>
      )}
    </div>
  );
}
