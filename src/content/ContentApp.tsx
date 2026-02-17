import { useNotes } from "../hooks/useNotes";
import StickyNote from "./components/StickyNote";

export default function ContentApp() {
  const url = window.location.href;
  const { notes, addNote, removeNote, editNote } = useNotes(url);

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={addNote}
        title="Add sticky note"
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          width: "48px",
          height: "48px",
          borderRadius: "50%",
          backgroundColor: "#fbbf24",
          border: "none",
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
          cursor: "pointer",
          fontSize: "24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 2147483647,
          transition: "transform 0.2s",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.1)")}
        onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
      >
        +
      </button>

      {/* Sticky notes */}
      {notes.map((note) => (
        <StickyNote
          key={note.id}
          note={note}
          onUpdate={editNote}
          onDelete={removeNote}
        />
      ))}
    </>
  );
}
