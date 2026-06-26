"use client";

import { useMemo, useState } from "react";
import { Pin, Search, StickyNote } from "lucide-react";

import { useNoteStore } from "@/domains/note/store";
import type { QuickNote } from "@/domains/note/types";
import { NoteCard } from "./note-card";
import { QuickNoteComposer } from "./quick-note-composer";

type Filter = { kind: "ALL" } | { kind: "UNFILED" } | { kind: "LABEL"; label: string };

export function NotesBoard() {
  const notes = useNoteStore((s) => s.notes);
  const addNote = useNoteStore((s) => s.addNote);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>({ kind: "ALL" });

  const labels = useMemo(() => {
    const set = new Set<string>();
    notes.forEach((n) => !n.archived && n.labels.forEach((l) => set.add(l)));
    return Array.from(set).slice(0, 8);
  }, [notes]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes
      .filter((n) => !n.archived)
      .filter((n) => {
        if (filter.kind === "UNFILED") return !n.clientId;
        if (filter.kind === "LABEL") return n.labels.includes(filter.label);
        return true;
      })
      .filter((n) => {
        if (!q) return true;
        const hay = [n.body, n.clientName ?? "", n.labels.join(" "), ...(n.checklist?.map((i) => i.text) ?? [])]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
  }, [notes, query, filter]);

  const pinned = visible.filter((n) => n.pinned);
  const others = visible.filter((n) => !n.pinned);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            <StickyNote className="size-7 text-[#1A3A6B]" />
            隨手筆記
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            任何時刻記下一句話或一個語音備忘，先記再說，之後再歸到客戶、貼標籤或升級成會議。
          </p>
        </div>

        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜尋筆記、客戶或標籤…"
            className="h-10 w-full rounded-full border border-hairline bg-paper pl-9 pr-3 text-sm text-ink outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-3 focus:ring-ring/15"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <FilterChip active={filter.kind === "ALL"} onClick={() => setFilter({ kind: "ALL" })}>
            全部
          </FilterChip>
          <FilterChip active={filter.kind === "UNFILED"} onClick={() => setFilter({ kind: "UNFILED" })}>
            未歸戶
          </FilterChip>
          {labels.map((l) => (
            <FilterChip
              key={l}
              active={filter.kind === "LABEL" && filter.label === l}
              onClick={() => setFilter({ kind: "LABEL", label: l })}
            >
              {l}
            </FilterChip>
          ))}
        </div>
      </header>

      <QuickNoteComposer onAdd={addNote} />

      {visible.length === 0 ? (
        <EmptyState filtered={notes.some((n) => !n.archived)} />
      ) : (
        <div className="space-y-6">
          {pinned.length > 0 ? (
            <Section title="已置頂" icon={<Pin className="size-3.5" />}>
              <Masonry notes={pinned} />
            </Section>
          ) : null}
          {others.length > 0 ? (
            <Section title={pinned.length > 0 ? "其他" : undefined}>
              <Masonry notes={others} />
            </Section>
          ) : null}
        </div>
      )}
    </div>
  );
}

function Masonry({ notes }: { notes: QuickNote[] }) {
  return (
    <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
      {notes.map((n) => (
        <NoteCard key={n.id} note={n} />
      ))}
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      {title ? (
        <h2 className="flex items-center gap-1.5 px-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {icon}
          {title}
        </h2>
      ) : null}
      {children}
    </section>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-sm transition ${
        active
          ? "border-transparent bg-ink text-paper"
          : "border-hairline text-muted-foreground hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-hairline-2 py-16 text-center">
      <StickyNote className="size-8 text-muted-foreground/50" />
      <p className="text-sm font-medium text-ink">{filtered ? "這個篩選沒有筆記" : "還沒有筆記"}</p>
      <p className="max-w-xs text-xs leading-5 text-muted-foreground">
        用上方的輸入框或語音記下第一則，之後再整理。
      </p>
    </div>
  );
}
