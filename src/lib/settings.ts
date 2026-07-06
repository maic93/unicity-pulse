/**
 * User settings persisted to localStorage with subscription support so
 * hooks re-render when the user changes them from /settings.
 */
import { useSyncExternalStore } from "react";

export interface DevConsoleSettings {
  autoRefreshMs: number;
  defaultLanding: "/" | "/wallet" | "/playground" | "/logs" | "/explorer";
  developerMode: boolean;
}

const KEY = "unicity-dev-console:settings";

const DEFAULTS: DevConsoleSettings = {
  autoRefreshMs: 30_000,
  defaultLanding: "/",
  developerMode: true,
};

let current: DevConsoleSettings = load();
const listeners = new Set<() => void>();

function load(): DevConsoleSettings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<DevConsoleSettings>;
    return { ...DEFAULTS, ...parsed };
  } catch {
    return DEFAULTS;
  }
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    /* ignore */
  }
}

export const settingsStore = {
  get(): DevConsoleSettings {
    return current;
  },
  set(patch: Partial<DevConsoleSettings>) {
    current = { ...current, ...patch };
    persist();
    for (const l of listeners) l();
  },
  reset() {
    current = { ...DEFAULTS };
    persist();
    for (const l of listeners) l();
  },
  subscribe(fn: () => void): () => void {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
};

export function useSettings(): DevConsoleSettings {
  return useSyncExternalStore(
    (cb) => settingsStore.subscribe(cb),
    () => settingsStore.get(),
    () => DEFAULTS,
  );
}
