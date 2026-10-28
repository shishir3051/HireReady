import { useSyncExternalStore } from "react";

/**
 * Tiny localStorage-backed external store usable with useSyncExternalStore.
 *
 *   const practiceStore = createLocalStore("hr-practice-mode-v2", true, parseBoolean);
 *   const on = practiceStore.useValue();   // SSR renders the fallback, the browser the stored value
 *   practiceStore.set(true);               // persists + notifies every subscriber (and other tabs)
 *
 * Safe when storage is unavailable (private mode, blocked cookies): reads fall back, writes are ignored.
 */
export interface LocalStore<T> {
  get(): T;
  set(value: T): void;
  subscribe(listener: () => void): () => void;
  useValue(): T;
}

export function createLocalStore<T>(
  key: string,
  fallback: T,
  parse: (raw: string) => T | undefined = (raw) => JSON.parse(raw) as T,
  serialize: (value: T) => string = (value) => JSON.stringify(value),
): LocalStore<T> {
  const listeners = new Set<() => void>();
  let cachedRaw: string | null | undefined;
  let cachedValue: T = fallback;
  let memoryOnly = false; // a write failed (e.g. storage full): this session keeps the in-memory value

  function read(): T {
    if (memoryOnly) return cachedValue;
    let raw: string | null;
    try {
      raw = window.localStorage.getItem(key);
    } catch {
      // storage blocked: serve the in-memory value (set() keeps it up to date)
      return cachedValue;
    }
    // Keep snapshot identity stable for useSyncExternalStore.
    if (raw === cachedRaw) return cachedValue;
    cachedRaw = raw;
    if (raw === null) {
      cachedValue = fallback;
    } else {
      try {
        const parsed = parse(raw);
        cachedValue = parsed === undefined ? fallback : parsed;
      } catch {
        cachedValue = fallback;
      }
    }
    return cachedValue;
  }

  function emit() {
    listeners.forEach((l) => l());
  }

  function onStorage(e: StorageEvent) {
    if (e.key === key || e.key === null) emit();
  }

  const store: LocalStore<T> = {
    get: () => (typeof window === "undefined" ? fallback : read()),
    set(value) {
      try {
        window.localStorage.setItem(key, serialize(value));
        memoryOnly = false;
      } catch {
        // storage unavailable or full — keep the in-memory value so the UI still updates this session
        memoryOnly = true;
        cachedRaw = serialize(value);
        cachedValue = value;
      }
      emit();
    },
    subscribe(listener) {
      listeners.add(listener);
      if (listeners.size === 1) window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) window.removeEventListener("storage", onStorage);
      };
    },
    useValue() {
      return useSyncExternalStore(store.subscribe, store.get, () => fallback);
    },
  };
  return store;
}

export const parseString = (raw: string) => raw;
export const serializeString = (value: string) => value;
export const parseBoolean = (raw: string) => raw === "true";

/** Subscribe to a media query (e.g. "(prefers-color-scheme: dark)"). Returns `serverValue` during SSR. */
export function useMediaQuery(query: string, serverValue = false) {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}

const noopSubscribe = () => () => {};

/** true after hydration on the client, false during SSR and the hydration render. */
export function useIsClient() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

/** true on macOS / iOS (for showing ⌘ instead of Ctrl). false during SSR. */
export function useIsMac() {
  return useSyncExternalStore(
    noopSubscribe,
    () => /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent),
    () => false,
  );
}
