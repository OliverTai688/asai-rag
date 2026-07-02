"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  ListTodo,
  Mic,
  Plus,
  Tag,
  Type,
  UserPlus,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { VoiceRecordingBar } from "@/components/voice/voice-recording-bar";
import { useVoiceRecorder } from "@/lib/voice/use-voice-recorder";
import { useClientStore } from "@/domains/client/store";
import type { AddNoteInput } from "@/domains/note/store";
import {
  NOTE_COLOR_LABEL,
  NOTE_COLOR_SWATCH,
  NOTE_COLORS,
  type NoteChecklistItem,
  type NoteColor,
  type NoteSource,
} from "@/domains/note/types";

export function QuickNoteComposer({ onAdd }: { onAdd: (input: AddNoteInput) => void }) {
  const clients = useClientStore((state) => state.clients);

  const [expanded, setExpanded] = useState(false);
  const [isChecklist, setIsChecklist] = useState(false);
  const [body, setBody] = useState("");
  const [items, setItems] = useState<NoteChecklistItem[]>([]);
  const [itemDraft, setItemDraft] = useState("");
  const [color, setColor] = useState<NoteColor>("DEFAULT");
  const [labels, setLabels] = useState<string[]>([]);
  const [labelDraft, setLabelDraft] = useState("");
  const [showLabelInput, setShowLabelInput] = useState(false);
  const [clientMenu, setClientMenu] = useState(false);
  const [client, setClient] = useState<{ id: string; name: string } | null>(null);
  const [source, setSource] = useState<NoteSource>("TEXT");

  const rootRef = useRef<HTMLDivElement>(null);

  const voice = useVoiceRecorder({
    onTranscript: (text) => {
      setBody((prev) => (prev ? `${prev} ${text}` : text));
    },
  });
  const { start: startRecording, cancel: cancelRecording } = voice;
  const listening = voice.isBusy;

  const reset = useCallback(() => {
    cancelRecording();
    setExpanded(false);
    setIsChecklist(false);
    setBody("");
    setItems([]);
    setItemDraft("");
    setColor("DEFAULT");
    setLabels([]);
    setLabelDraft("");
    setShowLabelInput(false);
    setClientMenu(false);
    setClient(null);
    setSource("TEXT");
  }, [cancelRecording]);

  const hasContent = body.trim().length > 0 || items.some((it) => it.text.trim());

  const commit = useCallback(() => {
    if (!hasContent) {
      reset();
      return;
    }
    onAdd({
      body: isChecklist ? "" : body.trim(),
      checklist: isChecklist ? items.filter((it) => it.text.trim()) : undefined,
      color,
      labels,
      clientId: client?.id,
      clientName: client?.name,
      source,
    });
    reset();
  }, [body, client, color, hasContent, isChecklist, items, labels, onAdd, reset, source]);

  // Click-outside commits (Keep-style: no save button).
  useEffect(() => {
    if (!expanded) return;
    function onDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        commit();
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [expanded, commit]);

  const startVoice = useCallback(() => {
    setExpanded(true);
    setSource("MIC");
    // ChatGPT-style: record the whole note with an animation, then transcribe
    // the full recording once when the user stops. No raw audio is persisted.
    void startRecording();
  }, [startRecording]);

  const addItem = useCallback(() => {
    const text = itemDraft.trim();
    if (!text) return;
    setItems((prev) => [...prev, { id: `i_${prev.length}_${text.length}`, text, done: false }]);
    setItemDraft("");
  }, [itemDraft]);

  const addLabel = useCallback(() => {
    const l = labelDraft.trim();
    if (l && !labels.includes(l)) setLabels((prev) => [...prev, l]);
    setLabelDraft("");
    setShowLabelInput(false);
  }, [labelDraft, labels]);

  if (!expanded) {
    return (
      <div className="mx-auto w-full max-w-2xl">
        <div className="flex items-center gap-2 rounded-2xl border border-hairline bg-card px-4 py-2.5 shadow-sm">
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="flex-1 text-left text-sm text-muted-foreground"
          >
            隨手記一句…
          </button>
          <button
            type="button"
            onClick={() => {
              setExpanded(true);
              setIsChecklist(true);
            }}
            aria-label="新增清單"
            title="新增清單"
            className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-paper-2 hover:text-ink"
          >
            <ListTodo className="size-4" />
          </button>
          <button
            type="button"
            onClick={startVoice}
            aria-label="語音記錄"
            title="語音記錄"
            className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-paper-2 hover:text-ink"
          >
            <Mic className="size-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="mx-auto w-full max-w-2xl">
      <div className="rounded-2xl border border-hairline bg-card p-3 shadow-md">
        {/* Body or checklist */}
        {isChecklist ? (
          <div className="space-y-1.5 px-1 pt-1">
            {items.map((it) => (
              <div key={it.id} className="flex items-center gap-2 text-sm">
                <span className="inline-block size-4 rounded border border-hairline-2" />
                <span className="flex-1 text-ink">{it.text}</span>
                <button
                  type="button"
                  onClick={() => setItems((prev) => prev.filter((p) => p.id !== it.id))}
                  aria-label="移除項目"
                  className="text-muted-foreground hover:text-ink"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
            <div className="flex items-center gap-2 pt-0.5">
              <Plus className="size-4 text-muted-foreground" />
              <input
                value={itemDraft}
                onChange={(e) => setItemDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addItem();
                  }
                }}
                placeholder="新增項目，Enter 加入…"
                className="flex-1 bg-transparent py-1 text-sm text-ink outline-none placeholder:text-muted-foreground"
                autoFocus
              />
            </div>
          </div>
        ) : (
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                commit();
              }
            }}
            placeholder={listening ? "聆聽中…" : "記下一句話…（⌘/Ctrl + Enter 完成）"}
            className="min-h-[72px] resize-none border-0 bg-transparent p-1 text-sm leading-6 shadow-none focus-visible:ring-0"
            autoFocus
          />
        )}

        {listening ? (
          <div className="px-1 pt-2">
            <VoiceRecordingBar
              elapsedMs={voice.elapsedMs}
              transcribing={voice.isTranscribing}
              onCancel={voice.cancel}
              onStop={voice.stop}
            />
          </div>
        ) : null}
        {voice.error ? (
          <p className="px-1 pt-1 text-xs text-destructive">{voice.error}</p>
        ) : null}

        {/* Draft chips: labels + client */}
        {(labels.length > 0 || client) && (
          <div className="flex flex-wrap gap-1.5 px-1 pt-2">
            {client ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-0.5 text-xs text-sky-900 dark:bg-sky-950/40 dark:text-sky-200">
                <UserPlus className="size-3" />
                {client.name}
                <button type="button" onClick={() => setClient(null)} aria-label="取消歸戶">
                  <X className="size-3" />
                </button>
              </span>
            ) : null}
            {labels.map((l) => (
              <span
                key={l}
                className="inline-flex items-center gap-1 rounded-full border border-hairline px-2.5 py-0.5 text-xs text-muted-foreground"
              >
                {l}
                <button
                  type="button"
                  onClick={() => setLabels((prev) => prev.filter((p) => p !== l))}
                  aria-label={`移除標籤 ${l}`}
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Color row */}
        <div className="flex items-center gap-1.5 px-1 pt-2.5">
          {NOTE_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={`顏色：${NOTE_COLOR_LABEL[c]}`}
              title={NOTE_COLOR_LABEL[c]}
              className={`size-5 rounded-full border ${NOTE_COLOR_SWATCH[c]} ${
                color === c ? "ring-2 ring-[#1A3A6B] ring-offset-1" : ""
              }`}
            />
          ))}
        </div>

        {showLabelInput ? (
          <div className="flex items-center gap-2 px-1 pt-2">
            <Tag className="size-3.5 text-muted-foreground" />
            <input
              value={labelDraft}
              onChange={(e) => setLabelDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addLabel();
                }
              }}
              placeholder="標籤名稱，Enter 加入…"
              className="flex-1 bg-transparent py-1 text-xs text-ink outline-none placeholder:text-muted-foreground"
              autoFocus
            />
          </div>
        ) : null}

        {/* Toolbar */}
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-hairline pt-2">
          <div className="flex items-center gap-0.5">
            <ToolbarButton
              label={isChecklist ? "切換文字" : "切換清單"}
              onClick={() => setIsChecklist((v) => !v)}
              icon={isChecklist ? <Type className="size-4" /> : <ListTodo className="size-4" />}
            />
            <ToolbarButton
              label={listening ? "聆聽中" : "語音"}
              onClick={startVoice}
              active={listening}
              icon={<Mic className="size-4" />}
            />
            <ToolbarButton
              label="標籤"
              onClick={() => setShowLabelInput((v) => !v)}
              icon={<Tag className="size-4" />}
            />
            <div className="relative">
              <ToolbarButton
                label="歸客戶"
                onClick={() => setClientMenu((v) => !v)}
                icon={<UserPlus className="size-4" />}
              />
              {clientMenu ? (
                <div className="absolute bottom-10 left-0 z-20 max-h-64 w-52 overflow-y-auto rounded-xl border border-hairline bg-popover p-1 shadow-lg">
                  {clients.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-muted-foreground">尚無客戶</p>
                  ) : (
                    clients.slice(0, 12).map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setClient({ id: c.id, name: c.name });
                          setClientMenu(false);
                        }}
                        className="block w-full rounded-lg px-3 py-1.5 text-left text-sm text-ink hover:bg-paper-2"
                      >
                        {c.name}
                      </button>
                    ))
                  )}
                </div>
              ) : null}
            </div>
          </div>
          <Button type="button" variant="mono" size="sm" className="rounded-full" onClick={commit}>
            <Check className="mr-1.5 size-3.5" />
            完成
          </Button>
        </div>
        <p className="px-1 pt-1.5 text-[11px] text-muted-foreground">點空白處或「完成」即自動保存</p>
      </div>
    </div>
  );
}

function ToolbarButton({
  label,
  icon,
  onClick,
  active,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`inline-flex size-9 items-center justify-center rounded-full transition ${
        active ? "bg-ink text-paper" : "text-muted-foreground hover:bg-paper-2 hover:text-ink"
      }`}
    >
      {icon}
    </button>
  );
}
