"use client";

import { useState } from "react";
import { Archive, Mic, Pin, PinOff, Square, SquareCheckBig, UserPlus } from "lucide-react";

import { useMounted } from "@/lib/hooks/use-mounted";
import { useClientStore } from "@/domains/client/store";
import { useNoteStore } from "@/domains/note/store";
import {
  NOTE_COLOR_CLASS,
  NOTE_COLOR_LABEL,
  NOTE_COLOR_SWATCH,
  NOTE_COLORS,
  type QuickNote,
} from "@/domains/note/types";

export function NoteCard({ note }: { note: QuickNote }) {
  const clients = useClientStore((state) => state.clients);
  const togglePin = useNoteStore((s) => s.togglePin);
  const setColor = useNoteStore((s) => s.setColor);
  const attachClient = useNoteStore((s) => s.attachClient);
  const archiveNote = useNoteStore((s) => s.archiveNote);
  const toggleChecklistItem = useNoteStore((s) => s.toggleChecklistItem);
  const mounted = useMounted();

  const [clientMenu, setClientMenu] = useState(false);

  return (
    <div
      className={`group relative mb-4 break-inside-avoid rounded-2xl border p-4 transition hover:shadow-md ${NOTE_COLOR_CLASS[note.color]}`}
    >
      {/* Pin */}
      <button
        type="button"
        onClick={() => togglePin(note.id)}
        aria-label={note.pinned ? "取消置頂" : "置頂"}
        title={note.pinned ? "取消置頂" : "置頂"}
        className={`absolute right-3 top-3 inline-flex size-7 items-center justify-center rounded-full transition ${
          note.pinned
            ? "text-[#1A3A6B]"
            : "text-muted-foreground opacity-0 hover:bg-paper-2 group-hover:opacity-100"
        }`}
      >
        {note.pinned ? <Pin className="size-4 fill-current" /> : <PinOff className="size-4" />}
      </button>

      {/* Body / checklist */}
      {note.checklist ? (
        <ul className="space-y-1.5 pr-6">
          {note.checklist.map((it) => (
            <li key={it.id} className="flex items-start gap-2 text-sm">
              <button
                type="button"
                onClick={() => toggleChecklistItem(note.id, it.id)}
                aria-label={it.done ? "標記未完成" : "標記完成"}
                className="mt-0.5 shrink-0 text-muted-foreground hover:text-ink"
              >
                {it.done ? (
                  <SquareCheckBig className="size-4 text-[#1A3A6B]" />
                ) : (
                  <Square className="size-4" />
                )}
              </button>
              <span className={it.done ? "text-muted-foreground line-through" : "text-ink"}>
                {it.text}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="whitespace-pre-wrap pr-6 text-sm leading-6 text-ink">{note.body}</p>
      )}

      {/* Meta: client + labels */}
      {(note.clientName || note.labels.length > 0) && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {note.clientName ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-0.5 text-xs text-sky-900 dark:bg-sky-950/40 dark:text-sky-200">
              <UserPlus className="size-3" />
              {note.clientName}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-hairline-2 px-2.5 py-0.5 text-xs text-muted-foreground">
              未歸戶
            </span>
          )}
          {note.labels.map((l) => (
            <span
              key={l}
              className="inline-flex items-center rounded-full border border-hairline px-2.5 py-0.5 text-xs text-muted-foreground"
            >
              {l}
            </span>
          ))}
        </div>
      )}

      {/* Footer actions (appear on hover) */}
      <div className="mt-3 flex items-center justify-between gap-2 opacity-0 transition group-hover:opacity-100">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {note.source === "MIC" ? <Mic className="size-3.5" /> : null}
          <span>{mounted ? relativeTime(note.updatedAt) : ""}</span>
        </div>
        <div className="flex items-center gap-0.5">
          {/* Color picker */}
          <div className="flex items-center gap-1 pr-1">
            {NOTE_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(note.id, c)}
                aria-label={`顏色：${NOTE_COLOR_LABEL[c]}`}
                title={NOTE_COLOR_LABEL[c]}
                className={`size-4 rounded-full border ${NOTE_COLOR_SWATCH[c]} ${
                  note.color === c ? "ring-1 ring-[#1A3A6B] ring-offset-1" : ""
                }`}
              />
            ))}
          </div>
          <div className="relative">
            <CardIcon
              label="歸客戶"
              onClick={() => setClientMenu((v) => !v)}
              icon={<UserPlus className="size-4" />}
            />
            {clientMenu ? (
              <div className="absolute bottom-9 right-0 z-20 max-h-64 w-48 overflow-y-auto rounded-xl border border-hairline bg-popover p-1 shadow-lg">
                {clients.slice(0, 12).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      attachClient(note.id, c.id, c.name);
                      setClientMenu(false);
                    }}
                    className="block w-full rounded-lg px-3 py-1.5 text-left text-sm text-ink hover:bg-paper-2"
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <CardIcon
            label="封存"
            onClick={() => archiveNote(note.id)}
            icon={<Archive className="size-4" />}
          />
        </div>
      </div>
    </div>
  );
}

function CardIcon({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="inline-flex size-7 items-center justify-center rounded-full text-muted-foreground transition hover:bg-paper-2 hover:text-ink"
    >
      {icon}
    </button>
  );
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffMs = Date.now() - then;
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "剛剛";
  if (min < 60) return `${min} 分鐘前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} 小時前`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} 天前`;
  return new Date(iso).toLocaleDateString("zh-TW", { month: "numeric", day: "numeric" });
}
