/**
 * In-memory SDK request log. Every SDK call recorded through the
 * client wrapper is appended here so the /logs page (and any future
 * inspector) can render a live timeline.
 */

export type SdkLogStatus = "pending" | "ok" | "error";

export interface SdkLogEntry {
  id: string;
  method: string;
  kind: "query" | "intent" | "connect" | "disconnect" | "event";
  params?: unknown;
  response?: unknown;
  error?: { message: string; stack?: string };
  startedAt: number;
  finishedAt?: number;
  duration?: number;
  status: SdkLogStatus;
}

type Listener = (entries: SdkLogEntry[]) => void;

const MAX_ENTRIES = 500;
let entries: SdkLogEntry[] = [];
const listeners = new Set<Listener>();

function emit() {
  const snap = entries.slice();
  for (const l of listeners) l(snap);
}

function nextId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const sdkLog = {
  list(): SdkLogEntry[] {
    return entries.slice();
  },
  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    fn(entries.slice());
    return () => {
      listeners.delete(fn);
    };
  },
  clear() {
    entries = [];
    emit();
  },
  start(input: {
    method: string;
    kind: SdkLogEntry["kind"];
    params?: unknown;
  }): SdkLogEntry {
    const entry: SdkLogEntry = {
      id: nextId(),
      method: input.method,
      kind: input.kind,
      params: input.params,
      startedAt: Date.now(),
      status: "pending",
    };
    entries = [entry, ...entries].slice(0, MAX_ENTRIES);
    emit();
    return entry;
  },
  finish(id: string, patch: Partial<SdkLogEntry>) {
    const now = Date.now();
    entries = entries.map((e) =>
      e.id === id
        ? {
            ...e,
            ...patch,
            finishedAt: now,
            duration: now - e.startedAt,
          }
        : e,
    );
    emit();
  },
  event(method: string, params?: unknown) {
    const now = Date.now();
    const entry: SdkLogEntry = {
      id: nextId(),
      method,
      kind: "event",
      params,
      startedAt: now,
      finishedAt: now,
      duration: 0,
      status: "ok",
    };
    entries = [entry, ...entries].slice(0, MAX_ENTRIES);
    emit();
  },
};
