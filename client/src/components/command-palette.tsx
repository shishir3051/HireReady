"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  CornerDownLeft,
  LayoutDashboard,
  ListChecks,
  LoaderCircle,
  Map as MapIcon,
  Mic,
  Search,
  SearchX,
  Target,
  type LucideIcon,
} from "lucide-react";
import { api, getErrorMessage } from "@/lib/api";
import { useApiQuery, useDebouncedValue } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { KIND_ICONS } from "@/lib/icons";
import { Dialog } from "@/components/ui/dialog";
import { Badge, DifficultyBadge, type Tone } from "@/components/ui/badge";
import { Kbd } from "@/components/ui/kbd";

// ---------------------------------------------------------------- context

interface CommandPaletteContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null);

function isEditable(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
}

/** Owns the palette state and the global Ctrl/⌘+K (and "/") shortcut. */
export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((o) => !o), []);

  useEffect(() => {
    function onKeyDown(e: globalThis.KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey && !isEditable(e.target)) {
        e.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const value = useMemo(() => ({ open, setOpen, toggle }), [open, toggle]);
  return (
    <CommandPaletteContext.Provider value={value}>
      {children}
      <CommandPalette open={open} onOpenChange={setOpen} />
    </CommandPaletteContext.Provider>
  );
}

export function useCommandPalette(): CommandPaletteContextValue {
  const ctx = useContext(CommandPaletteContext);
  if (!ctx) throw new Error("useCommandPalette must be used inside <CommandPaletteProvider>");
  return ctx;
}

// ---------------------------------------------------------------- palette

interface PaletteItem {
  id: string;
  label: string;
  hint?: string;
  href: string;
  icon: LucideIcon;
  difficulty?: "easy" | "medium" | "hard";
  badge?: string;
  badgeTone?: Tone;
  keywords?: string[];
}

const PAGES: PaletteItem[] = [
  {
    id: "page-topics",
    label: "Browse topics",
    hint: "All 29 topics by category",
    href: "/topics",
    icon: BookOpen,
    badge: "Page",
    badgeTone: "neutral",
    keywords: ["topics", "topic", "browse", "categories", "dsa", "cs", "web", "টপিক", "বিষয়"],
  },
  {
    id: "page-questions",
    label: "All questions",
    hint: "Search and filter 340+ interview questions",
    href: "/questions",
    icon: ListChecks,
    badge: "Page",
    badgeTone: "neutral",
    keywords: ["questions", "question", "problems", "coding", "theory", "প্রশ্ন", "সমস্যা"],
  },
  {
    id: "page-quiz",
    label: "Take a quiz",
    hint: "Topic MCQs — timed or practice mode",
    href: "/quiz",
    icon: Target,
    badge: "Quiz",
    badgeTone: "info",
    keywords: ["quiz", "quizzes", "mcq", "mcqs", "test", "practice", "কুইজ", "এমসিকিউ", "পরীক্ষা"],
  },
  {
    id: "page-mock",
    label: "Start a mock interview",
    hint: "Timed interview simulation with rubric",
    href: "/mock-interview",
    icon: Mic,
    badge: "Mock",
    badgeTone: "warning",
    keywords: ["mock", "interview", "timed", "simulation", "মক", "ইন্টারভিউ", "সাক্ষাৎকার"],
  },
  {
    id: "page-roadmap",
    label: "30-day roadmap",
    hint: "Day-by-day structured study plan",
    href: "/roadmap",
    icon: MapIcon,
    badge: "Page",
    badgeTone: "neutral",
    keywords: ["roadmap", "plan", "30 day", "30-day", "study", "schedule", "রোডম্যাপ", "প্ল্যান"],
  },
  {
    id: "page-dashboard",
    label: "Dashboard",
    hint: "Your progress, streak & bookmarks",
    href: "/dashboard",
    icon: LayoutDashboard,
    badge: "Page",
    badgeTone: "neutral",
    keywords: ["dashboard", "progress", "stats", "streak", "bookmarks", "ড্যাশবোর্ড", "প্রগ্রেস"],
  },
];

const MODE_STRIP_RE = /\b(quiz|quizzes|mcq|mcqs|mock|interviews?|topics?|questions?|কুইজ|মক|ইন্টারভিউ|টপিক|প্রশ্ন)\b/gi;

function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Search HireReady"
      description="Search topics, questions, quizzes, mock interviews, or jump to a page."
      hideHeader
      position="top"
      size="lg"
    >
      {open && <PaletteBody onClose={() => onOpenChange(false)} />}
    </Dialog>
  );
}

function PaletteBody({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();
  const q = useDebouncedValue(query.trim(), 200);

  const effectiveQ = useMemo(() => {
    if (!q) return "";
    const stripped = q.replace(MODE_STRIP_RE, "").trim();
    return stripped || q;
  }, [q]);

  const { data: topicsData } = useApiQuery(
    "palette:topics",
    (signal) => api.topics.list({ signal }),
  );

  const { data, loading, error } = useApiQuery(
    effectiveQ ? `palette:q:${effectiveQ}` : null,
    (signal) => api.questions.list({ q: effectiveQ, limit: 8 }, { signal }),
    { keepPrevious: true },
  );

  const { items, hasMatches } = useMemo(() => {
    const typed = query.trim();
    if (!typed) return { items: PAGES, hasMatches: true };

    const lower = typed.toLowerCase();
    const norm = lower.replace(/[-_]+/g, " ").trim();
    const wantsQuiz = /\b(quiz|quizzes|mcq|mcqs|কুইজ|এমসিকিউ)\b/i.test(lower);
    const wantsMock = /\b(mock|interviews?|মক|ইন্টারভিউ)\b/i.test(lower);
    const wantsTopic = /\b(topics?|টপিক)\b/i.test(lower);
    const topicTerm = norm.replace(MODE_STRIP_RE, "").replace(/\s+/g, " ").trim();

    const pages = PAGES.filter(
      (p) =>
        p.label.toLowerCase().includes(lower) ||
        (p.hint && p.hint.toLowerCase().includes(lower)) ||
        (p.keywords && p.keywords.some((k) => k.includes(lower) || lower.includes(k))),
    );

    const allTopics = topicsData?.items ?? [];
    const matchedTopics = topicTerm
      ? allTopics.filter((t) => {
          const title = t.title.toLowerCase();
          const slug = t.slug.toLowerCase();
          const slugWords = slug.replace(/-/g, " ");
          const summary = t.summary.toLowerCase();
          return (
            title.includes(topicTerm) ||
            slug.includes(topicTerm) ||
            slugWords.includes(topicTerm) ||
            summary.includes(topicTerm) ||
            t.category.toLowerCase().includes(topicTerm)
          );
        })
      : wantsTopic
        ? allTopics.slice(0, 5)
        : [];

    const topicItems: PaletteItem[] = [];
    for (const t of matchedTopics.slice(0, 4)) {
      if (!wantsQuiz && !wantsMock) {
        topicItems.push({
          id: `topic-${t.slug}`,
          label: t.title,
          hint: `${t.questionCount} questions · ${t.quizCount} quiz MCQs`,
          href: `/topics/${t.slug}`,
          icon: BookOpen,
          badge: "Topic",
          badgeTone: "brand",
        });
      }
      if (t.quizCount > 0 && (wantsQuiz || !wantsMock)) {
        topicItems.push({
          id: `quiz-${t.slug}`,
          label: `${t.title} — Quiz`,
          hint: `${t.quizCount} MCQs · Timed or practice`,
          href: `/quiz/${t.slug}`,
          icon: Target,
          badge: "Quiz",
          badgeTone: "info",
        });
      }
      if (wantsMock || (!wantsQuiz && matchedTopics.length <= 2)) {
        topicItems.push({
          id: `mock-${t.slug}`,
          label: `${t.title} — Mock Interview`,
          hint: `Timed interview simulation · ${t.questionCount} questions pool`,
          href: `/mock-interview?topics=${encodeURIComponent(t.slug)}`,
          icon: Mic,
          badge: "Mock",
          badgeTone: "warning",
        });
      }
    }

    // When user types "quiz" or "mock" without a specific topic, surface popular topic quizzes / mocks
    if (!topicTerm && wantsQuiz) {
      for (const t of allTopics.filter((x) => x.quizCount > 0).slice(0, 4)) {
        topicItems.push({
          id: `quiz-${t.slug}`,
          label: `${t.title} — Quiz`,
          hint: `${t.quizCount} MCQs · Timed or practice`,
          href: `/quiz/${t.slug}`,
          icon: Target,
          badge: "Quiz",
          badgeTone: "info",
        });
      }
    } else if (!topicTerm && wantsMock) {
      for (const t of allTopics.slice(0, 4)) {
        topicItems.push({
          id: `mock-${t.slug}`,
          label: `${t.title} — Mock Interview`,
          hint: `Timed interview simulation · ${t.questionCount} questions pool`,
          href: `/mock-interview?topics=${encodeURIComponent(t.slug)}`,
          icon: Mic,
          badge: "Mock",
          badgeTone: "warning",
        });
      }
    }

    const showQuestions = !(
      !topicTerm &&
      (wantsQuiz || wantsMock || wantsTopic)
    );

    const questions: PaletteItem[] =
      effectiveQ && showQuestions
        ? (data?.items ?? []).map((item) => ({
            id: `q-${item.slug}`,
            label: item.title,
            hint: item.topicTitle + (item.pattern ? ` · ${item.pattern}` : ""),
            href: `/questions/${item.slug}`,
            icon: KIND_ICONS[item.kind],
            difficulty: item.difficulty,
          }))
        : [];

    const combined: PaletteItem[] =
      wantsQuiz || wantsMock || wantsTopic
        ? [...pages, ...topicItems, ...questions]
        : [...topicItems, ...questions, ...pages];

    return {
      items: [
        ...combined,
        {
          id: "search-all",
          label: `Search all questions for “${typed}”`,
          href: `/questions?q=${encodeURIComponent(typed)}`,
          icon: Search,
        },
      ],
      hasMatches: combined.length > 0,
    };
  }, [query, effectiveQ, data, topicsData]);

  const activeIndex = Math.min(active, items.length - 1);
  const activeItem = items[activeIndex];

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  function go(item: PaletteItem | undefined) {
    if (!item) return;
    onClose();
    router.push(item.href);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((activeIndex + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((activeIndex - 1 + items.length) % items.length);
    } else if (e.key === "Home" && e.ctrlKey) {
      setActive(0);
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(activeItem);
    }
  }

  const searching = query.trim() !== "" && (loading || q !== query.trim());

  return (
    <div className="flex max-h-[min(70vh,560px)] flex-col">
      <div className="flex items-center gap-3 border-b border-border px-4">
        {searching ? (
          <LoaderCircle className="size-5 shrink-0 animate-spin text-muted" aria-hidden />
        ) : (
          <Search className="size-5 shrink-0 text-muted" aria-hidden />
        )}
        <input
          ref={inputRef}
          autoFocus
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          placeholder="Search topics, questions, quizzes, mock interviews…"
          aria-label="Search topics, questions, quizzes, mock interviews and pages"
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeItem ? `${listId}-${activeItem.id}` : undefined}
          className="h-12 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted focus-visible:outline-none"
        />
        <button
          type="button"
          onClick={onClose}
          className="hidden rounded-md sm:block"
          aria-label="Close search"
        >
          <Kbd>Esc</Kbd>
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {error != null && query.trim() !== "" && (
          <p className="mx-2 my-2 rounded-lg bg-surface-2 px-3 py-2 text-sm text-muted">
            Couldn&apos;t search questions: {getErrorMessage(error)}
          </p>
        )}
        {query.trim() !== "" && !searching && error == null && !hasMatches && (
          <div className="flex items-center gap-2 px-3 py-2.5 text-sm text-muted">
            <SearchX className="size-4" aria-hidden /> No results match “{query.trim()}”.
          </div>
        )}
        <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted" aria-hidden>
          {query.trim() ? "Results" : "Jump to"}
        </p>
        <ul ref={listRef} id={listId} role="listbox" aria-label="Results" className="space-y-0.5">
          {items.map((item, i) => {
            const Icon = item.icon;
            const selected = i === activeIndex;
            return (
              <li
                key={item.id}
                id={`${listId}-${item.id}`}
                role="option"
                aria-selected={selected}
                data-index={i}
                onMouseMove={() => {
                  if (!selected) setActive(i);
                }}
                onClick={() => go(item)}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm",
                  selected ? "bg-brand-soft text-foreground" : "text-foreground/90",
                )}
              >
                <span
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-md border",
                    selected ? "border-brand/30 bg-surface text-brand" : "border-border bg-surface-2 text-muted",
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{item.label}</span>
                  {item.hint && <span className="block truncate text-xs text-muted">{item.hint}</span>}
                </span>
                {item.difficulty ? (
                  <DifficultyBadge difficulty={item.difficulty} className="hidden sm:inline-flex" />
                ) : item.badge ? (
                  <Badge tone={item.badgeTone ?? "neutral"} className="hidden sm:inline-flex">
                    {item.badge}
                  </Badge>
                ) : null}
                {selected ? (
                  <CornerDownLeft className="size-4 shrink-0 text-muted" aria-hidden />
                ) : (
                  <ArrowRight className="size-4 shrink-0 text-transparent" aria-hidden />
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="hidden items-center gap-4 border-t border-border bg-surface-2/50 px-4 py-2 text-xs text-muted sm:flex">
        <span className="inline-flex items-center gap-1.5">
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd> navigate
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Kbd>↵</Kbd> open
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Kbd>Esc</Kbd> close
        </span>
      </div>
    </div>
  );
}
