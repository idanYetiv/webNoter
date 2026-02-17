export interface NotePosition {
  x: number;
  y: number;
}

export interface NoteSize {
  w: number;
  h: number;
}

export type NoteColor = "yellow" | "pink" | "blue" | "green" | "purple";

export const NOTE_COLORS: Record<NoteColor, string> = {
  yellow: "#fef08a",
  pink: "#fda4af",
  blue: "#93c5fd",
  green: "#86efac",
  purple: "#c4b5fd",
};

export interface Note {
  id: string;
  url: string;
  text: string;
  color: NoteColor;
  position: NotePosition;
  size: NoteSize;
  minimized: boolean;
  screenshot?: string; // base64 data URL
  createdAt: number;
  updatedAt: number;
}

export interface SiteNotes {
  [url: string]: Note[];
}

export type MessageAction =
  | { type: "ADD_NOTE"; url: string }
  | { type: "GET_NOTE_COUNT"; url: string }
  | { type: "NOTE_COUNT"; count: number };
