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
  yellow: "#ca8a04",
  pink: "#e11d48",
  blue: "#3b82f6",
  green: "#22c55e",
  purple: "#8b5cf6",
};

export type NoteScope = "page" | "site" | "global";

export interface AlertSchedule {
  type: "daily" | "weekly" | "custom";
  dayOfWeek?: number; // 0 = Sunday, 6 = Saturday
  timeOfDay: string; // "HH:MM" format
  intervalMinutes?: number; // for custom type
  alarmName: string;
}

export interface Note {
  id: string;
  url: string;
  scope: NoteScope;
  text: string;
  color: NoteColor;
  position: NotePosition;
  size: NoteSize;
  minimized: boolean;
  screenshot?: string; // base64 data URL
  createdAt: number;
  updatedAt: number;
}

export interface Alert {
  id: string;
  url: string;
  scope: NoteScope;
  message: string;
  enabled: boolean;
  schedule?: AlertSchedule;
  createdAt: number;
  updatedAt: number;
}

export type MessageAction =
  | { type: "ADD_NOTE"; url: string }
  | { type: "GET_NOTE_COUNT"; url: string }
  | { type: "NOTE_COUNT"; count: number }
  | { type: "SCHEDULE_ALERT"; alert: Alert }
  | { type: "CANCEL_ALERT"; alarmName: string }
  | { type: "SIGN_IN_GOOGLE" }
  | { type: "SIGN_OUT" }
  | { type: "GET_AUTH_STATE" }
  | { type: "TOGGLE_PANEL" };
