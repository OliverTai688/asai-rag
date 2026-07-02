"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * ChatGPT-style voice capture: record the whole utterance while showing a
 * recording animation, then transcribe the complete recording in one request
 * once the user stops. No live/interim transcription, no raw audio persistence.
 */
export type VoiceRecorderStatus =
  | "IDLE"
  | "REQUESTING"
  | "RECORDING"
  | "TRANSCRIBING"
  | "UNSUPPORTED"
  | "DENIED"
  | "ERROR";

export interface UseVoiceRecorderOptions {
  /** Server transcription endpoint. Must accept multipart form-data and return { text }. */
  endpoint?: string;
  /** Form field name carrying the audio blob. */
  fieldName?: string;
  /** Called with the full transcript once recording stops and STT completes. */
  onTranscript: (text: string) => void;
  /** Called on any failure with a user-facing zh-TW message. */
  onError?: (message: string) => void;
}

export interface VoiceRecorderController {
  status: VoiceRecorderStatus;
  isRecording: boolean;
  isTranscribing: boolean;
  isBusy: boolean;
  elapsedMs: number;
  error: string | null;
  supported: boolean;
  start: () => Promise<void>;
  stop: () => void;
  cancel: () => void;
  toggle: () => void;
}

const DEFAULT_ENDPOINT = "/api/ai/interview/transcribe";
// Match the transcribe route's floor so near-silent recordings do not bill.
const MIN_AUDIO_BYTES = 1200;
const MIME_CANDIDATES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type));
}

function recorderSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia)
  );
}

function extensionForMime(mime: string): string {
  if (mime.includes("mp4")) return "mp4";
  if (mime.includes("ogg")) return "ogg";
  return "webm";
}

export function useVoiceRecorder(options: UseVoiceRecorderOptions): VoiceRecorderController {
  const { endpoint = DEFAULT_ENDPOINT, fieldName = "audio", onTranscript, onError } = options;

  const [status, setStatus] = useState<VoiceRecorderStatus>("IDLE");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);
  const cancelledRef = useRef(false);

  // Keep the latest callbacks without re-creating start/stop each render.
  const onTranscriptRef = useRef(onTranscript);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
    onErrorRef.current = onError;
  });

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const fail = useCallback((message: string, nextStatus: VoiceRecorderStatus = "ERROR") => {
    setError(message);
    setStatus(nextStatus);
    onErrorRef.current?.(message);
  }, []);

  const transcribe = useCallback(
    async (blob: Blob) => {
      if (blob.size < MIN_AUDIO_BYTES) {
        setStatus("IDLE");
        setElapsedMs(0);
        return;
      }
      setStatus("TRANSCRIBING");
      try {
        const form = new FormData();
        form.append(fieldName, blob, `recording.${extensionForMime(blob.type)}`);
        const response = await fetch(endpoint, { method: "POST", body: form });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          fail(payload?.message ?? payload?.error ?? "語音轉寫暫時無法使用，請改用文字輸入。");
          return;
        }
        const text = typeof payload?.text === "string" ? payload.text.trim() : "";
        setError(null);
        setStatus("IDLE");
        setElapsedMs(0);
        if (text) onTranscriptRef.current(text);
      } catch {
        fail("語音轉寫連線失敗，請改用文字輸入。");
      }
    },
    [endpoint, fieldName, fail],
  );

  const start = useCallback(async () => {
    if (recorderRef.current) return; // already recording
    if (!recorderSupported()) {
      fail("此瀏覽器不支援語音錄音，請改用文字輸入。建議使用 Chrome。", "UNSUPPORTED");
      return;
    }

    setError(null);
    setStatus("REQUESTING");

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      const denied = err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "SecurityError");
      fail(
        denied ? "麥克風權限被拒絕，請改用文字輸入。" : "無法存取麥克風，請改用文字輸入。",
        denied ? "DENIED" : "ERROR",
      );
      return;
    }

    streamRef.current = stream;
    cancelledRef.current = false;
    chunksRef.current = [];

    const mimeType = pickMimeType();
    let recorder: MediaRecorder;
    try {
      recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    } catch {
      releaseStream();
      fail("無法啟動錄音，請改用文字輸入。");
      return;
    }
    recorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      clearTimer();
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
      chunksRef.current = [];
      recorderRef.current = null;
      releaseStream();
      if (cancelledRef.current) {
        setStatus("IDLE");
        setElapsedMs(0);
        return;
      }
      void transcribe(blob);
    };

    try {
      recorder.start();
    } catch {
      recorderRef.current = null;
      releaseStream();
      fail("無法啟動錄音，請改用文字輸入。");
      return;
    }

    startedAtRef.current = Date.now();
    setElapsedMs(0);
    setStatus("RECORDING");
    clearTimer();
    timerRef.current = window.setInterval(() => {
      setElapsedMs(Date.now() - startedAtRef.current);
    }, 200);
  }, [clearTimer, fail, releaseStream, transcribe]);

  const stop = useCallback(() => {
    const recorder = recorderRef.current;
    clearTimer();
    if (recorder && recorder.state !== "inactive") {
      cancelledRef.current = false;
      try {
        recorder.stop();
      } catch {
        releaseStream();
        recorderRef.current = null;
        setStatus("IDLE");
        setElapsedMs(0);
      }
    }
  }, [clearTimer, releaseStream]);

  const cancel = useCallback(() => {
    const recorder = recorderRef.current;
    clearTimer();
    cancelledRef.current = true;
    setElapsedMs(0);
    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch {
        releaseStream();
        recorderRef.current = null;
        setStatus("IDLE");
      }
    } else {
      releaseStream();
      recorderRef.current = null;
      setStatus("IDLE");
    }
  }, [clearTimer, releaseStream]);

  const toggle = useCallback(() => {
    if (recorderRef.current) stop();
    else void start();
  }, [start, stop]);

  // Release the mic and timers if the component unmounts mid-recording.
  useEffect(
    () => () => {
      clearTimer();
      cancelledRef.current = true;
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        try {
          recorder.stop();
        } catch {
          /* ignore teardown races */
        }
      }
      recorderRef.current = null;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    },
    [clearTimer],
  );

  const isRecording = status === "RECORDING" || status === "REQUESTING";
  const isTranscribing = status === "TRANSCRIBING";

  return {
    status,
    isRecording,
    isTranscribing,
    isBusy: isRecording || isTranscribing,
    elapsedMs,
    error,
    // Not rendered during SSR-critical paths, so evaluating globals here is safe.
    supported: recorderSupported(),
    start,
    stop,
    cancel,
    toggle,
  };
}
