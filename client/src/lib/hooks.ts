import { useCallback, useEffect, useRef, useState } from "react";
import { isAbortError } from "@/lib/api";

/** Returns `value` after it stopped changing for `delay` ms. */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export interface ApiQueryResult<T> {
  /** last successful data for the current key (kept while reloading the same key) */
  data: T | undefined;
  error: unknown;
  /** true while the current key has no settled result yet */
  loading: boolean;
  /** re-run the fetcher for the current key */
  reload: () => void;
}

/**
 * Minimal data-fetching hook for client components.
 *
 *   const { data, loading, error, reload } = useApiQuery(user ? `quiz-attempts:${user.id}` : null,
 *     (signal) => api.quiz.attempts({ signal }));
 *
 * - `key === null` disables the query (e.g. while logged out).
 * - Changing the key aborts the in-flight request and fetches again.
 * - The fetcher may change every render; the latest one is used.
 * - `keepPrevious: true` keeps showing the last data while a new key loads (e.g. pagination, refetch-after-write).
 */
export function useApiQuery<T>(
  key: string | null,
  fetcher: (signal: AbortSignal) => Promise<T>,
  options: { keepPrevious?: boolean } = {},
): ApiQueryResult<T> {
  const [nonce, setNonce] = useState(0);
  const [state, setState] = useState<{ key: string | null; req: string | null; data?: T; error?: unknown }>({
    key: null,
    req: null,
  });
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const req = key === null ? null : `${key}#${nonce}`;

  useEffect(() => {
    if (key === null || req === null) return;
    const controller = new AbortController();
    fetcherRef.current(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setState({ key, req, data, error: undefined });
      },
      (error: unknown) => {
        if (controller.signal.aborted || isAbortError(error)) return;
        setState((prev) => ({ key, req, data: prev.key === key ? prev.data : undefined, error }));
      },
    );
    return () => controller.abort();
  }, [key, req]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const sameKey = key !== null && state.key === key;

  return {
    data: sameKey || (options.keepPrevious && key !== null) ? state.data : undefined,
    error: sameKey && state.req === req ? state.error : undefined,
    loading: req !== null && state.req !== req,
    reload,
  };
}
