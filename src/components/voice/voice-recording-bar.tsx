"use client";

import { Check, Loader2, X } from "lucide-react";

function formatElapsed(ms: number) {
  const total = Math.floor(ms / 1000);
  const minutes = Math.floor(total / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (total % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

// Staggered heights + delays give a simple, calm "listening" waveform.
const WAVE_BARS = [
  { height: "h-2", delay: "0ms" },
  { height: "h-4", delay: "120ms" },
  { height: "h-5", delay: "240ms" },
  { height: "h-3", delay: "360ms" },
  { height: "h-4", delay: "80ms" },
  { height: "h-2", delay: "200ms" },
];

/**
 * ChatGPT-style recording surface: shows an animated waveform + elapsed timer
 * while recording, a spinner while transcribing, and cancel / confirm controls.
 * Replaces the text composer during capture. Respects prefers-reduced-motion.
 */
export function VoiceRecordingBar({
  elapsedMs,
  transcribing,
  onCancel,
  onStop,
}: {
  elapsedMs: number;
  transcribing: boolean;
  onCancel: () => void;
  onStop: () => void;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-3 rounded-xl border border-ring/40 bg-paper px-3 py-2.5"
    >
      <button
        type="button"
        onClick={onCancel}
        disabled={transcribing}
        aria-label="取消錄音"
        title="取消錄音"
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-paper-2 hover:text-ink focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/25 disabled:opacity-40"
      >
        <X className="size-4" />
      </button>

      <div className="flex min-w-0 flex-1 items-center gap-3">
        {transcribing ? (
          <span className="flex items-center gap-2 text-sm text-ink-3">
            <Loader2 className="size-4 animate-spin" />
            轉寫中，正在把整段錄音轉成文字…
          </span>
        ) : (
          <>
            <span className="flex items-end gap-0.5" aria-hidden="true">
              {WAVE_BARS.map((bar, index) => (
                <span
                  key={index}
                  className={`w-1 rounded-full bg-[#1A3A6B] motion-safe:animate-bounce ${bar.height}`}
                  style={{ animationDelay: bar.delay }}
                />
              ))}
            </span>
            <span className="text-sm text-ink-3">錄音中，說完按 ✓ 一次轉成文字</span>
            <span className="ml-auto shrink-0 text-sm font-medium tabular-nums text-ink">
              {formatElapsed(elapsedMs)}
            </span>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={onStop}
        disabled={transcribing}
        aria-label="結束錄音並轉成文字"
        title="結束錄音並轉成文字"
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-ink text-paper transition hover:bg-ink/90 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/25 disabled:opacity-40"
      >
        {transcribing ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
      </button>
    </div>
  );
}
