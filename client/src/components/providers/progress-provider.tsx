"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { api, getErrorMessage, isApiError } from "@/lib/api";
import { useApiQuery } from "@/lib/hooks";
import type {
  ProgressSnapshot,
  ProgressStats,
  ProgressStatus,
  QuestionProgress,
  QuestionProgressUpdate,
} from "@/lib/types";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "./auth-provider";

export interface ProgressContextValue {
  /** a user is logged in */
  isLoggedIn: boolean;
  /** auth settled and (if logged in) GET /api/progress has loaded */
  ready: boolean;
  /** progress docs by question slug (empty when logged out) */
  progress: Record<string, QuestionProgress>;
  /** increments after every successful server write — use as a cache key for derived data */
  version: number;
  getProgress: (slug: string) => QuestionProgress | undefined;
  /** "todo" when there is no progress doc */
  status: (slug: string) => ProgressStatus;
  isBookmarked: (slug: string) => boolean;
  /**
   * Optimistic PUT /api/progress/questions/:slug. Rolls back and toasts on failure.
   * When logged out it shows a "log in" toast and resolves to null.
   */
  update: (slug: string, patch: QuestionProgressUpdate) => Promise<QuestionProgress | null>;
  toggleBookmark: (slug: string) => Promise<QuestionProgress | null>;
  /** completed roadmap days, ascending */
  roadmapDays: number[];
  isRoadmapDayDone: (day: number) => boolean;
  /** optimistic PUT /api/progress/roadmap/:day */
  toggleRoadmapDay: (day: number) => Promise<void>;
  /** totals over the loaded snapshot */
  counts: { solved: number; attempted: number; bookmarked: number };
  /** re-fetch GET /api/progress */
  refresh: () => Promise<void>;
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

interface Snapshot {
  userId: string;
  questions: Record<string, QuestionProgress>;
  roadmapDays: number[];
}

function emptyProgress(slug: string): QuestionProgress {
  return { slug, status: "todo", bookmarked: false, notes: "", confidence: null, updatedAt: new Date().toISOString() };
}

function toSnapshot(userId: string, data: ProgressSnapshot): Snapshot {
  const questions: Record<string, QuestionProgress> = {};
  for (const q of data.questions) questions[q.slug] = q;
  return { userId, questions, roadmapDays: [...data.roadmapDays].sort((a, b) => a - b) };
}

const EMPTY: Record<string, QuestionProgress> = {};
const NO_DAYS: number[] = [];

export function ProgressProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading, refresh: refreshAuth } = useAuth();
  const { toast } = useToast();
  const pathname = usePathname();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [version, setVersion] = useState(0);
  const userId = user?.id ?? null;

  const snapshotRef = useRef<Snapshot | null>(null);
  const userIdRef = useRef<string | null>(null);
  const pathnameRef = useRef(pathname);
  const seqRef = useRef(new Map<string, number>());
  const roadmapSeq = useRef(0);
  useEffect(() => {
    snapshotRef.current = snapshot;
    userIdRef.current = userId;
    pathnameRef.current = pathname;
  });

  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    api.progress.get({ signal: controller.signal }).then(
      (data) => {
        if (!controller.signal.aborted) setSnapshot(toSnapshot(userId, data));
      },
      (e: unknown) => {
        if (controller.signal.aborted) return;
        console.warn("[progress] failed to load", e);
        // Show the app as "ready" with empty progress rather than blocking the UI.
        setSnapshot({ userId, questions: {}, roadmapDays: [] });
      },
    );
    return () => controller.abort();
  }, [userId]);

  const current = snapshot && snapshot.userId === userId ? snapshot : null;
  const questions = current?.questions ?? EMPTY;
  const roadmapDays = current?.roadmapDays ?? NO_DAYS;
  const ready = !authLoading && (userId === null || current !== null);

  const promptLogin = useCallback(() => {
    const next = encodeURIComponent(pathnameRef.current || "/");
    toast({
      id: "progress-login",
      title: "Log in to track your progress",
      description: "Solved marks, bookmarks, notes and your roadmap are saved to your account.",
      action: { label: "Log in", href: `/login?next=${next}` },
    });
  }, [toast]);

  const handleWriteError = useCallback(
    (e: unknown, what: string) => {
      if (isApiError(e) && e.status === 401) {
        toast({
          variant: "error",
          title: "Your session has expired",
          description: "Log in again to keep saving progress.",
          action: { label: "Log in", href: `/login?next=${encodeURIComponent(pathnameRef.current || "/")}` },
        });
        void refreshAuth();
        return;
      }
      toast({ variant: "error", title: `Couldn't save ${what}`, description: getErrorMessage(e) });
    },
    [toast, refreshAuth],
  );

  const update = useCallback(
    async (slug: string, patch: QuestionProgressUpdate): Promise<QuestionProgress | null> => {
      const id = userIdRef.current;
      if (!id) {
        promptLogin();
        return null;
      }
      const seq = (seqRef.current.get(slug) ?? 0) + 1;
      seqRef.current.set(slug, seq);
      const before = snapshotRef.current?.userId === id ? snapshotRef.current.questions[slug] : undefined;

      setSnapshot((s) => {
        if (!s || s.userId !== id) return s;
        const base = s.questions[slug] ?? emptyProgress(slug);
        return {
          ...s,
          questions: { ...s.questions, [slug]: { ...base, ...patch, updatedAt: new Date().toISOString() } },
        };
      });

      try {
        const { progress } = await api.progress.updateQuestion(slug, patch);
        if (seqRef.current.get(slug) === seq) {
          setSnapshot((s) => (s && s.userId === id ? { ...s, questions: { ...s.questions, [slug]: progress } } : s));
        }
        setVersion((v) => v + 1);
        return progress;
      } catch (e) {
        if (seqRef.current.get(slug) === seq) {
          setSnapshot((s) => {
            if (!s || s.userId !== id) return s;
            const next = { ...s.questions };
            if (before) {
              const cur = next[slug] ?? before;
              const restored = { ...cur };
              for (const key of Object.keys(patch) as (keyof QuestionProgressUpdate)[]) {
                (restored as Record<string, unknown>)[key] = before[key];
              }
              next[slug] = restored;
            } else {
              delete next[slug];
            }
            return { ...s, questions: next };
          });
        }
        const what =
          "notes" in patch ? "your notes" : "bookmarked" in patch ? "the bookmark" : "confidence" in patch ? "your rating" : "your progress";
        handleWriteError(e, what);
        return null;
      }
    },
    [promptLogin, handleWriteError],
  );

  const toggleBookmark = useCallback(
    (slug: string) => {
      const cur = snapshotRef.current?.questions[slug];
      return update(slug, { bookmarked: !(cur?.bookmarked ?? false) });
    },
    [update],
  );

  const toggleRoadmapDay = useCallback(
    async (day: number) => {
      const id = userIdRef.current;
      if (!id) {
        promptLogin();
        return;
      }
      const days = snapshotRef.current?.userId === id ? snapshotRef.current.roadmapDays : [];
      const done = !days.includes(day);
      const seq = ++roadmapSeq.current;
      setSnapshot((s) => {
        if (!s || s.userId !== id) return s;
        const set = new Set(s.roadmapDays);
        if (done) set.add(day);
        else set.delete(day);
        return { ...s, roadmapDays: Array.from(set).sort((a, b) => a - b) };
      });
      try {
        const { roadmapDays: serverDays } = await api.progress.setRoadmapDay(day, done);
        if (roadmapSeq.current === seq) {
          setSnapshot((s) => (s && s.userId === id ? { ...s, roadmapDays: [...serverDays].sort((a, b) => a - b) } : s));
        }
        setVersion((v) => v + 1);
      } catch (e) {
        if (roadmapSeq.current === seq) {
          setSnapshot((s) => {
            if (!s || s.userId !== id) return s;
            const set = new Set(s.roadmapDays);
            if (done) set.delete(day);
            else set.add(day);
            return { ...s, roadmapDays: Array.from(set).sort((a, b) => a - b) };
          });
        }
        handleWriteError(e, "the roadmap day");
      }
    },
    [promptLogin, handleWriteError],
  );

  const refresh = useCallback(async () => {
    const id = userIdRef.current;
    if (!id) return;
    try {
      const data = await api.progress.get();
      setSnapshot(toSnapshot(id, data));
    } catch (e) {
      toast({ variant: "error", title: "Couldn't refresh your progress", description: getErrorMessage(e) });
    }
  }, [toast]);

  const value = useMemo<ProgressContextValue>(() => {
    const list = Object.values(questions);
    return {
      isLoggedIn: userId !== null,
      ready,
      progress: questions,
      version,
      getProgress: (slug) => questions[slug],
      status: (slug) => questions[slug]?.status ?? "todo",
      isBookmarked: (slug) => questions[slug]?.bookmarked ?? false,
      update,
      toggleBookmark,
      roadmapDays,
      isRoadmapDayDone: (day) => roadmapDays.includes(day),
      toggleRoadmapDay,
      counts: {
        solved: list.filter((q) => q.status === "solved").length,
        attempted: list.filter((q) => q.status === "attempted").length,
        bookmarked: list.filter((q) => q.bookmarked).length,
      },
      refresh,
    };
  }, [questions, roadmapDays, userId, ready, version, update, toggleBookmark, toggleRoadmapDay, refresh]);

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress(): ProgressContextValue {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error("useProgress must be used inside <ProgressProvider>");
  return ctx;
}

/**
 * GET /api/progress/stats for the logged-in user, re-fetched after progress writes.
 * `stats` is null while logged out or before the first load.
 */
export function useProgressStats() {
  const { user } = useAuth();
  const { version } = useProgress();
  const { data, loading, error, reload } = useApiQuery<ProgressStats>(
    user ? `progress-stats:${user.id}:${version}` : null,
    (signal) => api.progress.stats({ signal }),
    { keepPrevious: true },
  );
  return { stats: data ?? null, loading, error, reload };
}
