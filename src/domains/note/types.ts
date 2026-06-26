// Quick-capture notes (隨手筆記) — Google Keep-style anytime capture.
// Source of truth: docs/07_research-and-design/RES-025_visit-notes-quick-capture-interface-gap-research-v1.0.md
// UI-first: these power a local store + board; backend persistence (QuickNote table /
// BFF / Park-memory projection) is a follow-up. No raw audio is stored.

/** Restrained semantic tints (ARC-003: low-saturation, hairline-first, no full-bleed color). */
export type NoteColor = "DEFAULT" | "AMBER" | "GREEN" | "BLUE" | "ROSE" | "VIOLET";

export type NoteSource = "TEXT" | "MIC";

export interface NoteChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface QuickNote {
  id: string;
  /** Free-text body. Empty when the note is a checklist. */
  body: string;
  /** When present, the note renders as a checklist instead of body text. */
  checklist?: NoteChecklistItem[];
  color: NoteColor;
  labels: string[];
  pinned: boolean;
  archived: boolean;
  /** Optional client attachment — capture-first, attach later. */
  clientId?: string;
  clientName?: string;
  source: NoteSource;
  /** ISO timestamps. */
  createdAt: string;
  updatedAt: string;
}

export const NOTE_COLORS: NoteColor[] = ["DEFAULT", "AMBER", "GREEN", "BLUE", "ROSE", "VIOLET"];

export const NOTE_COLOR_LABEL: Record<NoteColor, string> = {
  DEFAULT: "預設",
  AMBER: "提醒",
  GREEN: "已完成",
  BLUE: "客戶",
  ROSE: "重要",
  VIOLET: "想法",
};

/** Card background + border classes per color. Kept very light to respect ARC-003. */
export const NOTE_COLOR_CLASS: Record<NoteColor, string> = {
  DEFAULT: "bg-card border-hairline",
  AMBER: "bg-amber-50/70 border-amber-200/70 dark:bg-amber-950/20 dark:border-amber-900/40",
  GREEN: "bg-emerald-50/70 border-emerald-200/70 dark:bg-emerald-950/20 dark:border-emerald-900/40",
  BLUE: "bg-sky-50/70 border-sky-200/70 dark:bg-sky-950/20 dark:border-sky-900/40",
  ROSE: "bg-rose-50/70 border-rose-200/70 dark:bg-rose-950/20 dark:border-rose-900/40",
  VIOLET: "bg-violet-50/70 border-violet-200/70 dark:bg-violet-950/20 dark:border-violet-900/40",
};

/** Small color swatch class for the picker. */
export const NOTE_COLOR_SWATCH: Record<NoteColor, string> = {
  DEFAULT: "bg-paper border-hairline-2",
  AMBER: "bg-amber-200",
  GREEN: "bg-emerald-200",
  BLUE: "bg-sky-200",
  ROSE: "bg-rose-200",
  VIOLET: "bg-violet-200",
};
