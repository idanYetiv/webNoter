import { useState, useRef, useCallback, useEffect } from "react";
import type { Alert, AlertSchedule, Note, NoteColor, NoteScope } from "../../lib/types";
import { NOTE_COLORS } from "../../lib/types";
import { useScreenshot } from "../../hooks/useScreenshot";
import { FREE_NOTE_LIMIT } from "../../lib/freemium";
import { saveGlobalAlert } from "../../lib/storage";
import { useAuth } from "../../hooks/useAuth";
import GlobalPanel from "./GlobalPanel";
import ScheduleModal from "./ScheduleModal";

interface FloatingPanelProps {
  notes: Note[];
  url: string;
  onAddNote: (scope?: NoteScope) => Promise<Note | null>;
  onDeleteNote: (note: Note) => void;
  onEditNote: (
    note: Note,
    updates: Partial<Omit<Note, "id" | "url" | "createdAt">>
  ) => void;
  onToggleScope: (note: Note) => void;
  alerts: Alert[];
  onAddAlert: (scope?: NoteScope) => Promise<Alert>;
  onDeleteAlert: (alert: Alert) => void;
  onEditAlert: (
    alert: Alert,
    updates: Partial<Omit<Alert, "id" | "url" | "createdAt">>
  ) => void;
  onToggleAlert: (alert: Alert) => void;
  forceShow?: number;
}

/** Returns true if URL is a root/main page of the domain (no meaningful path). */
function isMainRoute(url: string): boolean {
  try {
    const path = new URL(url).pathname;
    return path === "/" || path === "";
  } catch {
    return false;
  }
}

function getDisplayLocation(url: string): { label: string; isMain: boolean } {
  try {
    const u = new URL(url);
    const isMain = u.pathname === "/" || u.pathname === "";
    if (isMain) {
      return { label: u.hostname, isMain: true };
    }
    // Show hostname + truncated path
    const path =
      u.pathname.length > 30
        ? u.pathname.slice(0, 27) + "..."
        : u.pathname;
    return { label: u.hostname + path, isMain: false };
  } catch {
    return { label: url, isMain: false };
  }
}

// --- Drag hook (GPU-accelerated via transform) ---

function useDrag(panelRef: React.RefObject<HTMLDivElement | null>) {
  const didDrag = useRef(false);
  const offset = useRef({ x: 0, y: 0 });
  const startPos = useRef({ x: 0, y: 0 });

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      const el = panelRef.current;
      if (!el) return;

      didDrag.current = false;
      const rect = el.getBoundingClientRect();
      offset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      startPos.current = { x: rect.left, y: rect.top };

      const onMove = (ev: MouseEvent) => {
        didDrag.current = true;
        const dx = ev.clientX - offset.current.x - startPos.current.x;
        const dy = ev.clientY - offset.current.y - startPos.current.y;
        el.style.transform = `translate(${dx}px, ${dy}px)`;
        el.style.willChange = "transform";
      };

      const onUp = (ev: MouseEvent) => {
        const nx = ev.clientX - offset.current.x;
        const ny = ev.clientY - offset.current.y;
        el.style.transform = "";
        el.style.willChange = "";
        el.style.left = `${nx}px`;
        el.style.top = `${ny}px`;
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [panelRef]
  );

  return { onMouseDown, wasDragged: () => didDrag.current };
}

// --- Color options ---

const COLOR_OPTIONS: NoteColor[] = ["yellow", "pink", "blue", "green", "purple"];

// --- Main component ---

export default function FloatingPanel({
  notes,
  url,
  onAddNote,
  onDeleteNote,
  onEditNote,
  onToggleScope,
  alerts,
  onAddAlert,
  onDeleteAlert,
  onEditAlert,
  onToggleAlert,
  forceShow,
}: FloatingPanelProps) {
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const auth = useAuth();

  useEffect(() => {
    if (forceShow) {
      setHidden(false);
      setOpen(true);
    }
  }, [forceShow]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingAlertId, setEditingAlertId] = useState<string | null>(null);
  const [colorPickerId, setColorPickerId] = useState<string | null>(null);
  const [globalPanelOpen, setGlobalPanelOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const { onMouseDown, wasDragged } = useDrag(panelRef);

  const location = getDisplayLocation(url);
  const autoScope: NoteScope = isMainRoute(url) ? "site" : "page";

  const pageNotes = notes.filter((n) => n.scope === "page");
  const siteNotes = notes.filter((n) => n.scope === "site");

  const siteAlerts = alerts.filter((a) => a.scope === "site");
  const pageAlerts = alerts.filter((a) => a.scope === "page");

  const handleAdd = async () => {
    const note = await onAddNote(autoScope);
    if (note) setEditingId(note.id);
  };

  const handleAddAlert = async () => {
    const alert = await onAddAlert(autoScope);
    setEditingAlertId(alert.id);
  };

  const handleScheduleAlertSave = async (message: string, schedule: AlertSchedule) => {
    const now = Date.now();
    const alert: Alert = {
      id: crypto.randomUUID(),
      url: "",
      scope: "global",
      message,
      enabled: true,
      schedule,
      createdAt: now,
      updatedAt: now,
    };
    await saveGlobalAlert(alert);
    chrome.runtime.sendMessage({ type: "SCHEDULE_ALERT", alert });
    setScheduleModalOpen(false);
  };

  // --- Hidden — nothing rendered, reopen via extension icon ---
  if (hidden) return null;

  // --- Minimized circle ---
  if (!open) {
    return (
      <div
        ref={panelRef}
        onMouseDown={onMouseDown}
        style={{
          position: "fixed",
          left: window.innerWidth - 76,
          top: window.innerHeight - 76,
          zIndex: 2147483647,
          fontFamily: "system-ui, -apple-system, sans-serif",
          direction: "ltr",
          textAlign: "left" as const,
        }}
      >
        {/* Main circle button */}
        <div
          onClick={() => {
            if (!wasDragged()) setOpen(true);
          }}
          style={{
            width: "52px",
            height: "52px",
            borderRadius: "50%",
            backgroundColor: "#1a1a2e",
            border: "3px solid #00d4ff",
            boxShadow: "0 4px 16px rgba(0,212,255,0.15), 0 4px 16px rgba(0,0,0,0.25)",
            cursor: "grab",
            fontSize: "22px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#00d4ff",
            fontWeight: "bold",
            lineHeight: 1,
            userSelect: "none",
          }}
          title="Open Notara"
        >
          {notes.length > 0 ? (
            <span style={{ fontSize: "10px", pointerEvents: "none" }}>
              {notes.length}/{FREE_NOTE_LIMIT}
            </span>
          ) : (
            <span style={{ fontSize: "20px", pointerEvents: "none" }}>
              {"\u{1F4DD}"}
            </span>
          )}
        </div>
        {/* Close (X) button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setHidden(true);
          }}
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            position: "absolute",
            top: "-4px",
            right: "-4px",
            width: "20px",
            height: "20px",
            borderRadius: "50%",
            backgroundColor: "#1a1a2e",
            border: "2px solid #00d4ff",
            cursor: "pointer",
            fontSize: "10px",
            fontWeight: "bold",
            color: "#00d4ff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 0,
            lineHeight: 1,
          }}
          title="Hide Notara"
        >
          {"\u2715"}
        </button>
      </div>
    );
  }

  // --- Expanded panel ---
  return (
    <>
    <div
      ref={panelRef}
      style={{
        position: "fixed",
        left: Math.max(8, window.innerWidth - 344),
        top: Math.max(8, window.innerHeight - 520),
        width: "320px",
        maxHeight: "500px",
        borderRadius: "16px",
        backgroundColor: "#12121f",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4), 0 0 24px rgba(0,212,255,0.15)",
        zIndex: 2147483647,
        fontFamily: "system-ui, -apple-system, sans-serif",
        display: "flex",
        flexDirection: "column",
        overflow: "visible",
        border: "1px solid #2a2a40",
        direction: "ltr",
        textAlign: "left" as const,
      }}
    >
      {/* Global management panel (left side) */}
      {auth.isAuthenticated && globalPanelOpen && (
        <GlobalPanel onClose={() => setGlobalPanelOpen(false)} />
      )}

      {/* Inner content wrapper — clips overflow while outer allows GlobalPanel */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        maxHeight: "500px",
        overflow: "hidden",
        borderRadius: "16px",
      }}>
      {/* Header — draggable */}
      <div
        onMouseDown={onMouseDown}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          backgroundColor: "#1a1a2e",
          borderBottom: "1px solid #2a2a40",
          cursor: "grab",
          userSelect: "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "18px", fontWeight: "bold", color: "#00d4ff" }}>
            Notara
          </span>
          {auth.isAuthenticated && (
            <span
              style={{
                fontSize: "11px",
                backgroundColor: "rgba(0,212,255,0.15)",
                padding: "2px 8px",
                borderRadius: "12px",
                color: "#00d4ff",
              }}
            >
              {notes.length} / {FREE_NOTE_LIMIT}
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          {auth.isAuthenticated && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setGlobalPanelOpen((p) => !p);
              }}
              onMouseDown={(e) => e.stopPropagation()}
              style={{
                background: globalPanelOpen ? "rgba(0,212,255,0.15)" : "none",
                border: "none",
                cursor: "pointer",
                fontSize: "16px",
                color: globalPanelOpen ? "#00d4ff" : "#64748b",
                padding: "2px 6px",
                lineHeight: 1,
                borderRadius: "6px",
              }}
              title="Global management panel"
            >
              {"\u{1F4CB}"}
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "18px",
              color: "#64748b",
              padding: "0 4px",
              lineHeight: 1,
            }}
            title="Minimize"
          >
            {"\u2212"}
          </button>
        </div>
      </div>

      {/* --- Not authenticated: sign-in screen --- */}
      {!auth.isAuthenticated && !auth.loading && (
        <div style={{ padding: "32px 24px", textAlign: "center" }}>
          <div style={{ fontSize: "36px", marginBottom: "12px" }}>{"\u{1F4DD}"}</div>
          <p style={{ fontSize: "14px", color: "#e2e8f0", fontWeight: 600, marginBottom: "4px" }}>
            Welcome to Notara
          </p>
          <p style={{ fontSize: "12px", color: "#64748b", marginBottom: "20px" }}>
            Sign in to start creating sticky notes on any website.
          </p>
          <button
            onClick={auth.signIn}
            style={{
              width: "100%", padding: "10px", backgroundColor: "#1a1a2e",
              border: "1px solid #2a2a40", borderRadius: "10px", cursor: "pointer",
              fontSize: "13px", fontWeight: 500, color: "#e2e8f0", display: "flex",
              alignItems: "center", justifyContent: "center", gap: "8px",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.01 24.01 0 0 0 0 21.56l7.98-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Sign in with Google
          </button>
          {auth.error && (
            <p style={{ fontSize: "11px", color: "#f87171", marginTop: "10px", wordBreak: "break-word" as const }}>
              {auth.error}
            </p>
          )}
        </div>
      )}

      {auth.loading && (
        <div style={{ padding: "32px 24px", textAlign: "center" }}>
          <span style={{ fontSize: "13px", color: "#64748b" }}>Loading...</span>
        </div>
      )}

      {/* --- Authenticated: full panel content --- */}
      {auth.isAuthenticated && (
        <>
        {/* Location + add buttons */}
        <div style={{ padding: "10px 16px", borderBottom: "1px solid #2a2a40" }}>
          <div
            style={{
              fontSize: "11px",
              color: "#64748b",
              marginBottom: "8px",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              overflow: "hidden",
            }}
          >
            {location.isMain ? "\u{1F310}" : "\u{1F4C4}"}
            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap" as const,
              }}
            >
              {location.label}
            </span>
          </div>
          <div style={{ display: "flex", gap: "6px" }}>
            <button
              onClick={handleAdd}
              style={addBtnStyle("#1a1a2e", "#00d4ff")}
            >
              + Add Note
            </button>
            <button
              onClick={handleAddAlert}
              style={addBtnStyle("#1a1a2e", "#00d4ff")}
            >
              {"\uD83D\uDD14"} Add Alert
            </button>
          </div>
          <div style={{ marginTop: "6px" }}>
            <button
              onClick={() => setScheduleModalOpen(true)}
              style={{
                ...addBtnStyle("#1a1a2e", "#00d4ff"),
                width: "100%",
              }}
            >
              {"\u23F0"} Schedule Alert
            </button>
          </div>
        </div>

        {/* Alerts + Notes list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 12px 12px" }}>
          {/* Alerts section */}
          {alerts.length > 0 && (
            <>
              {siteAlerts.length > 0 && (
                <SectionHeader icon={"\uD83D\uDD14"} title="Site Alerts" />
              )}
              {siteAlerts.map((alert) => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  editing={editingAlertId === alert.id}
                  onStartEdit={() => setEditingAlertId(alert.id)}
                  onStopEdit={() => setEditingAlertId(null)}
                  onEdit={onEditAlert}
                  onDelete={onDeleteAlert}
                  onToggle={onToggleAlert}
                />
              ))}
              {pageAlerts.length > 0 && (
                <SectionHeader icon={"\uD83D\uDD14"} title="Page Alerts" />
              )}
              {pageAlerts.map((alert) => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  editing={editingAlertId === alert.id}
                  onStartEdit={() => setEditingAlertId(alert.id)}
                  onStopEdit={() => setEditingAlertId(null)}
                  onEdit={onEditAlert}
                  onDelete={onDeleteAlert}
                  onToggle={onToggleAlert}
                />
              ))}
            </>
          )}

          {/* Notes section */}
          {notes.length === 0 && alerts.length === 0 ? (
            <div style={{ textAlign: "center", color: "#64748b", fontSize: "13px", padding: "24px 0" }}>
              <div style={{ fontSize: "28px", marginBottom: "8px" }}>{"\u{1F4DD}"}</div>
              No notes on this page yet.
            </div>
          ) : (
            <>
              {siteNotes.length > 0 && (
                <SectionHeader icon={"\u{1F310}"} title="Site Notes" />
              )}
              {siteNotes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  editing={editingId === note.id}
                  showColorPicker={colorPickerId === note.id}
                  onStartEdit={() => setEditingId(note.id)}
                  onStopEdit={() => setEditingId(null)}
                  onToggleColor={() =>
                    setColorPickerId(colorPickerId === note.id ? null : note.id)
                  }
                  onEdit={onEditNote}
                  onDelete={onDeleteNote}
                  onToggleScope={onToggleScope}
                />
              ))}
              {pageNotes.length > 0 && (
                <SectionHeader icon={"\u{1F4C4}"} title="Page Notes" />
              )}
              {pageNotes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  editing={editingId === note.id}
                  showColorPicker={colorPickerId === note.id}
                  onStartEdit={() => setEditingId(note.id)}
                  onStopEdit={() => setEditingId(null)}
                  onToggleColor={() =>
                    setColorPickerId(colorPickerId === note.id ? null : note.id)
                  }
                  onEdit={onEditNote}
                  onDelete={onDeleteNote}
                  onToggleScope={onToggleScope}
                />
              ))}
            </>
          )}
        </div>

        {/* Auth footer — signed in user info */}
        <div style={{
          padding: "8px 12px",
          borderTop: "1px solid #2a2a40",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}>
          {auth.user?.avatarUrl ? (
            <img
              src={auth.user.avatarUrl}
              alt=""
              style={{ width: "20px", height: "20px", borderRadius: "50%", flexShrink: 0 }}
              referrerPolicy="no-referrer"
            />
          ) : (
            <div style={{
              width: "20px", height: "20px", borderRadius: "50%", flexShrink: 0,
              backgroundColor: "#2a2a40", color: "#00d4ff", fontSize: "10px", fontWeight: "bold",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {auth.user?.name?.[0]?.toUpperCase() ?? "?"}
            </div>
          )}
          <span style={{ fontSize: "11px", color: "#94a3b8", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
            {auth.user?.name}
          </span>
          <button
            onClick={auth.signOut}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: "10px", color: "#64748b", padding: "2px 4px" }}
          >
            Sign out
          </button>
        </div>
        </>
      )}
      </div>{/* end inner content wrapper */}
    </div>
    {scheduleModalOpen && (
      <ScheduleModal
        onSave={handleScheduleAlertSave}
        onCancel={() => setScheduleModalOpen(false)}
      />
    )}
    </>
  );
}

// --- Sub-components ---

function SectionHeader({ icon, title }: { icon: string; title: string }) {
  return (
    <div
      style={{
        fontSize: "11px",
        fontWeight: 600,
        color: "#64748b",
        textTransform: "uppercase" as const,
        letterSpacing: "0.05em",
        margin: "8px 0 4px",
        display: "flex",
        alignItems: "center",
        gap: "4px",
      }}
    >
      {icon} {title}
    </div>
  );
}

function NoteCard({
  note,
  editing,
  showColorPicker,
  onStartEdit,
  onStopEdit,
  onToggleColor,
  onEdit,
  onDelete,
  onToggleScope,
}: {
  note: Note;
  editing: boolean;
  showColorPicker: boolean;
  onStartEdit: () => void;
  onStopEdit: () => void;
  onToggleColor: () => void;
  onEdit: (note: Note, updates: Partial<Omit<Note, "id" | "url" | "createdAt">>) => void;
  onDelete: (note: Note) => void;
  onToggleScope: (note: Note) => void;
}) {
  const textRef = useRef<HTMLTextAreaElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const { capture, capturing } = useScreenshot();

  const handleTextChange = useCallback(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (textRef.current) {
        onEdit(note, { text: textRef.current.value });
      }
    }, 400);
  }, [note, onEdit]);

  const handleBlur = useCallback(() => {
    clearTimeout(debounceRef.current);
    if (textRef.current) {
      onEdit(note, { text: textRef.current.value });
    }
    onStopEdit();
  }, [note, onEdit, onStopEdit]);

  const handleScreenshot = async () => {
    const result = await capture();
    if (result) onEdit(note, { screenshot: result });
  };

  const bgColor = NOTE_COLORS[note.color];
  const isSite = note.scope === "site";

  return (
    <div
      style={{
        backgroundColor: "#1a1a2e",
        borderRadius: "10px",
        marginBottom: "6px",
        overflow: "hidden",
        boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
        borderLeft: `3px solid ${bgColor}`,
      }}
    >
      {/* Note toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "6px 10px",
          borderBottom: editing ? "1px solid #2a2a40" : "none",
        }}
      >
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          {/* Scope toggle */}
          <button
            onClick={() => onToggleScope(note)}
            style={toolBtnStyle(isSite ? 1 : 0.4)}
            title={isSite ? "Site note — click for page only" : "Page note — click for whole site"}
          >
            {"\u{1F310}"}
          </button>
          {/* Color */}
          <button onClick={onToggleColor} style={toolBtnStyle(1)} title="Color">
            {"\u{1F3A8}"}
          </button>
          {/* Screenshot */}
          <button
            onClick={handleScreenshot}
            disabled={capturing}
            style={toolBtnStyle(capturing ? 0.4 : 1)}
            title="Screenshot"
          >
            {capturing ? "..." : "\u{1F4F7}"}
          </button>
        </div>
        <button
          onClick={() => onDelete(note)}
          style={{ ...toolBtnStyle(1), fontSize: "13px", color: "#94a3b8" }}
          title="Delete"
        >
          {"\u2715"}
        </button>
      </div>

      {/* Color picker */}
      {showColorPicker && (
        <div style={{ display: "flex", gap: "4px", padding: "4px 10px 6px" }}>
          {COLOR_OPTIONS.map((c) => (
            <button
              key={c}
              onClick={() => {
                onEdit(note, { color: c });
                onToggleColor();
              }}
              style={{
                width: "22px",
                height: "22px",
                borderRadius: "50%",
                backgroundColor: NOTE_COLORS[c],
                border: c === note.color ? "2px solid #e2e8f0" : "1px solid #2a2a40",
                cursor: "pointer",
                padding: 0,
              }}
            />
          ))}
        </div>
      )}

      {/* Date/time */}
      <div
        style={{
          padding: "2px 10px 4px",
          fontSize: "10px",
          color: "#64748b",
          display: "flex",
          gap: "8px",
        }}
      >
        <span>{formatDate(note.createdAt)}</span>
        {note.updatedAt !== note.createdAt && (
          <span style={{ fontStyle: "italic" }}>edited {formatDate(note.updatedAt)}</span>
        )}
      </div>

      {/* Text — click to edit */}
      {editing ? (
        <div>
          <textarea
            ref={textRef}
            defaultValue={note.text}
            autoFocus
            onChange={handleTextChange}
            onBlur={handleBlur}
            placeholder="Type your note..."
            style={{
              width: "100%",
              minHeight: "60px",
              border: "none",
              outline: "none",
              resize: "vertical",
              background: "transparent",
              fontFamily: "inherit",
              fontSize: "13px",
              lineHeight: "1.5",
              padding: "6px 10px 4px",
              boxSizing: "border-box",
              color: "#e2e8f0",
            }}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", padding: "0 10px 6px" }}>
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                clearTimeout(debounceRef.current);
                if (textRef.current) {
                  onEdit(note, { text: textRef.current.value });
                }
                onStopEdit();
              }}
              style={{
                background: "#22c55e",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                color: "#fff",
                fontSize: "14px",
                fontWeight: "bold",
                padding: "4px 12px",
                lineHeight: 1,
              }}
              title="Save"
            >
              {"\u2713"}
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={onStartEdit}
          style={{
            padding: "6px 10px 8px",
            fontSize: "13px",
            lineHeight: "1.5",
            color: note.text ? "#e2e8f0" : "#64748b",
            cursor: "text",
            minHeight: "32px",
            whiteSpace: "pre-wrap" as const,
            wordBreak: "break-word" as const,
          }}
        >
          {note.text || "Click to type..."}
        </div>
      )}

      {/* Screenshot thumbnail */}
      {note.screenshot && (
        <div style={{ padding: "0 10px 8px" }}>
          <img
            src={note.screenshot}
            alt="Screenshot"
            style={{ width: "100%", borderRadius: "6px", display: "block" }}
          />
        </div>
      )}
    </div>
  );
}

function AlertCard({
  alert,
  editing,
  onStartEdit,
  onStopEdit,
  onEdit,
  onDelete,
  onToggle,
}: {
  alert: Alert;
  editing: boolean;
  onStartEdit: () => void;
  onStopEdit: () => void;
  onEdit: (alert: Alert, updates: Partial<Omit<Alert, "id" | "url" | "createdAt">>) => void;
  onDelete: (alert: Alert) => void;
  onToggle: (alert: Alert) => void;
}) {
  const textRef = useRef<HTMLTextAreaElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const handleTextChange = useCallback(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (textRef.current) {
        onEdit(alert, { message: textRef.current.value });
      }
    }, 400);
  }, [alert, onEdit]);

  const handleBlur = useCallback(() => {
    clearTimeout(debounceRef.current);
    if (textRef.current) {
      onEdit(alert, { message: textRef.current.value });
    }
    onStopEdit();
  }, [alert, onEdit, onStopEdit]);

  return (
    <div
      style={{
        backgroundColor: alert.enabled ? "#1a1a2e" : "#0a0a14",
        borderRadius: "10px",
        marginBottom: "6px",
        overflow: "hidden",
        boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
        borderLeft: `3px solid ${alert.enabled ? "#00d4ff" : "#2a2a40"}`,
        opacity: alert.enabled ? 1 : 0.7,
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "6px 10px",
          borderBottom: editing ? "1px solid #2a2a40" : "none",
        }}
      >
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <span style={{ fontSize: "13px" }}>
            {alert.scope === "site" ? "\u{1F310}" : "\u{1F4C4}"}
          </span>
          <button
            onClick={() => onToggle(alert)}
            style={toolBtnStyle(1)}
            title={alert.enabled ? "Disable alert" : "Enable alert"}
          >
            {alert.enabled ? "\u2705" : "\u26AA"}
          </button>
        </div>
        <button
          onClick={() => onDelete(alert)}
          style={{ ...toolBtnStyle(1), fontSize: "13px", color: "#94a3b8" }}
          title="Delete"
        >
          {"\u2715"}
        </button>
      </div>

      {/* Message — click to edit */}
      {editing ? (
        <div>
          <textarea
            ref={textRef}
            defaultValue={alert.message}
            autoFocus
            onChange={handleTextChange}
            onBlur={handleBlur}
            placeholder="Type alert message..."
            style={{
              width: "100%",
              minHeight: "50px",
              border: "none",
              outline: "none",
              resize: "vertical",
              background: "transparent",
              fontFamily: "inherit",
              fontSize: "13px",
              lineHeight: "1.5",
              padding: "6px 10px 4px",
              boxSizing: "border-box",
              color: "#e2e8f0",
            }}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", padding: "0 10px 6px" }}>
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                clearTimeout(debounceRef.current);
                if (textRef.current) {
                  onEdit(alert, { message: textRef.current.value });
                }
                onStopEdit();
              }}
              style={{
                background: "#22c55e",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                color: "#fff",
                fontSize: "14px",
                fontWeight: "bold",
                padding: "4px 12px",
                lineHeight: 1,
              }}
              title="Save"
            >
              {"\u2713"}
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={onStartEdit}
          style={{
            padding: "6px 10px 8px",
            fontSize: "13px",
            lineHeight: "1.5",
            color: alert.message ? "#e2e8f0" : "#64748b",
            cursor: "text",
            minHeight: "32px",
            whiteSpace: "pre-wrap" as const,
            wordBreak: "break-word" as const,
          }}
        >
          {alert.message || "Click to type alert message..."}
        </div>
      )}
    </div>
  );
}

// --- Style helpers ---

function formatDate(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  // Same day — just show time
  if (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  ) {
    return time;
  }
  // Otherwise show date + time
  const date = d.toLocaleDateString([], { month: "short", day: "numeric" });
  return `${date}, ${time}`;
}

function addBtnStyle(bg: string, color: string): React.CSSProperties {
  return {
    flex: 1,
    padding: "8px",
    backgroundColor: bg,
    border: "1px solid #2a2a40",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 500,
    color,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "4px",
  };
}

function toolBtnStyle(opacity: number): React.CSSProperties {
  return {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: "14px",
    padding: "0 2px",
    opacity,
    lineHeight: 1,
  };
}
