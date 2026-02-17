import { useState, useEffect, useCallback } from "react";
import type { Note, NoteColor } from "../lib/types";
import { getNotes, saveNote, deleteNote, updateNote } from "../lib/storage";

export function useNotes(url: string) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    const loaded = await getNotes(url);
    setNotes(loaded);
    setLoading(false);
  }, [url]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const addNote = useCallback(async () => {
    const note: Note = {
      id: crypto.randomUUID(),
      url,
      text: "",
      color: "yellow",
      position: { x: 100 + Math.random() * 200, y: 100 + Math.random() * 200 },
      size: { w: 240, h: 200 },
      minimized: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await saveNote(note);
    setNotes((prev) => [...prev, note]);
    return note;
  }, [url]);

  const removeNote = useCallback(
    async (noteId: string) => {
      await deleteNote(url, noteId);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    },
    [url]
  );

  const editNote = useCallback(
    async (
      noteId: string,
      updates: Partial<Omit<Note, "id" | "url" | "createdAt">>
    ) => {
      await updateNote(url, noteId, updates);
      setNotes((prev) =>
        prev.map((n) =>
          n.id === noteId ? { ...n, ...updates, updatedAt: Date.now() } : n
        )
      );
    },
    [url]
  );

  const changeColor = useCallback(
    async (noteId: string, color: NoteColor) => {
      await editNote(noteId, { color });
    },
    [editNote]
  );

  return { notes, loading, addNote, removeNote, editNote, changeColor };
}
