"use client";

import { create } from "zustand";

import type { NoteChecklistItem, NoteColor, NoteSource, QuickNote } from "./types";

// Deterministic demo seed (fixed timestamps to avoid hydration mismatch).
// UI-first only; real notes will come from a QuickNote BFF later.
const SEED_NOTES: QuickNote[] = [
  {
    id: "seed-1",
    body: "王大明：醫療實支額度要回去查既有保單，下次帶比較表。預算上限每月 6000。",
    color: "ROSE",
    labels: ["跟進", "加保"],
    pinned: true,
    archived: false,
    clientId: "c_wang",
    clientName: "王大明",
    source: "TEXT",
    createdAt: "2026-06-19T08:30:00.000Z",
    updatedAt: "2026-06-19T08:30:00.000Z",
  },
  {
    id: "seed-2",
    body: "",
    checklist: [
      { id: "s2a", text: "教育金試算兩個版本", done: false },
      { id: "s2b", text: "調既有醫療險保單", done: true },
      { id: "s2c", text: "約下週三回訪", done: false },
    ],
    color: "AMBER",
    labels: ["待辦"],
    pinned: false,
    archived: false,
    source: "TEXT",
    createdAt: "2026-06-19T09:10:00.000Z",
    updatedAt: "2026-06-19T09:10:00.000Z",
  },
  {
    id: "seed-3",
    body: "想法：可以做一張「家庭責任 vs 現有保障」的一頁圖，客戶比較有感。",
    color: "VIOLET",
    labels: ["點子"],
    pinned: false,
    archived: false,
    source: "MIC",
    createdAt: "2026-06-18T13:05:00.000Z",
    updatedAt: "2026-06-18T13:05:00.000Z",
  },
  {
    id: "seed-4",
    body: "通話備忘：陳太太問是否能調整繳費年期，需確認商品條款後回覆。",
    color: "DEFAULT",
    labels: [],
    pinned: false,
    archived: false,
    source: "MIC",
    createdAt: "2026-06-18T16:40:00.000Z",
    updatedAt: "2026-06-18T16:40:00.000Z",
  },
];

export interface AddNoteInput {
  body?: string;
  checklist?: NoteChecklistItem[];
  color?: NoteColor;
  labels?: string[];
  clientId?: string;
  clientName?: string;
  source?: NoteSource;
  pinned?: boolean;
}

interface NoteState {
  notes: QuickNote[];
  addNote: (input: AddNoteInput) => string;
  updateNote: (id: string, patch: Partial<QuickNote>) => void;
  togglePin: (id: string) => void;
  setColor: (id: string, color: NoteColor) => void;
  addLabel: (id: string, label: string) => void;
  removeLabel: (id: string, label: string) => void;
  attachClient: (id: string, clientId: string, clientName: string) => void;
  detachClient: (id: string) => void;
  toggleChecklistItem: (id: string, itemId: string) => void;
  archiveNote: (id: string) => void;
}

function makeId(): string {
  return `n_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

export const useNoteStore = create<NoteState>((set) => ({
  notes: SEED_NOTES,
  addNote: (input) => {
    const id = makeId();
    const at = nowIso();
    const note: QuickNote = {
      id,
      body: input.body ?? "",
      checklist: input.checklist,
      color: input.color ?? "DEFAULT",
      labels: input.labels ?? [],
      pinned: input.pinned ?? false,
      archived: false,
      clientId: input.clientId,
      clientName: input.clientName,
      source: input.source ?? "TEXT",
      createdAt: at,
      updatedAt: at,
    };
    set((state) => ({ notes: [note, ...state.notes] }));
    return id;
  },
  updateNote: (id, patch) =>
    set((state) => ({
      notes: state.notes.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: nowIso() } : n)),
    })),
  togglePin: (id) =>
    set((state) => ({
      notes: state.notes.map((n) => (n.id === id ? { ...n, pinned: !n.pinned, updatedAt: nowIso() } : n)),
    })),
  setColor: (id, color) =>
    set((state) => ({
      notes: state.notes.map((n) => (n.id === id ? { ...n, color, updatedAt: nowIso() } : n)),
    })),
  addLabel: (id, label) =>
    set((state) => ({
      notes: state.notes.map((n) =>
        n.id === id && !n.labels.includes(label)
          ? { ...n, labels: [...n.labels, label], updatedAt: nowIso() }
          : n,
      ),
    })),
  removeLabel: (id, label) =>
    set((state) => ({
      notes: state.notes.map((n) =>
        n.id === id ? { ...n, labels: n.labels.filter((l) => l !== label), updatedAt: nowIso() } : n,
      ),
    })),
  attachClient: (id, clientId, clientName) =>
    set((state) => ({
      notes: state.notes.map((n) =>
        n.id === id ? { ...n, clientId, clientName, updatedAt: nowIso() } : n,
      ),
    })),
  detachClient: (id) =>
    set((state) => ({
      notes: state.notes.map((n) =>
        n.id === id ? { ...n, clientId: undefined, clientName: undefined, updatedAt: nowIso() } : n,
      ),
    })),
  toggleChecklistItem: (id, itemId) =>
    set((state) => ({
      notes: state.notes.map((n) =>
        n.id === id && n.checklist
          ? {
              ...n,
              checklist: n.checklist.map((it) =>
                it.id === itemId ? { ...it, done: !it.done } : it,
              ),
              updatedAt: nowIso(),
            }
          : n,
      ),
    })),
  archiveNote: (id) =>
    set((state) => ({
      notes: state.notes.map((n) => (n.id === id ? { ...n, archived: true, updatedAt: nowIso() } : n)),
    })),
}));
