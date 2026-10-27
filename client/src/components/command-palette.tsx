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
import { DifficultyBadge } from "@/components/ui/badge";
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
}

const PAGES: PaletteItem[] = [
  { id: "page-topics", label: "Browse topics", hint: "All 29 topics by category", href: "/topics", icon: BookOpen },
  { id: "page-questions", label: "All questions", hint: "Search and filter", href: "/questions", icon: ListChecks },
  { id: "page-quiz", label: "Take a quiz", hint: "Topic MCQs", href: "/quiz", icon: Target },
  { id: "page-mock", label: "Start a mock interview", hint: "Timed practice", href: "/mock-interview", icon: Mic },
  { id: "page-roadmap", label: "30-day roadmap", hint: "Study plan", href: "/roadmap", icon: MapIcon },
  { id: "page-dashboard", label: "Dashboard", hint: "Your progress", href: "/dashboard", icon: LayoutDashboard },
];

function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Search HireReady"
      description="Search questions by title, tag or pattern, or jump to a page."
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

  const { data, loading, error } = useApiQuery(
    q ? `palette:${q}` : null,
    (signal) => api.questions.list({ q, limit: 8 }, { signal }),
    { keepPrevious: true },
  );

  const items = useMemo<PaletteItem[]>(() => {
    const typed = query.trim();
    if (!typed) return PAGES;
    const lower = typed.toLowerCase();
    const pages = PAGES.filter((p) => p.label.toLowerCase().includes(lower));
    const questions: PaletteItem[] = q
      ? (data?.items ?? []).map((item) => ({
          id: `q-${item.slug}`,
          label: item.title,
          hint: item.topicTitle + (item.pattern ? ` · ${item.pattern}` : ""),
          href: `/questions/${item.slug}`,
          icon: KIND_ICONS[item.kind],
          difficulty: item.difficulty,
        }))
      : [];
    return [
      ...questions,
      ...pages,
      {
        id: "search-all",
        label: `Search all questions for “${typed}”`,
        href: `/questions?q=${encodeURIComponent(typed)}`,
        icon: Search,
      },
    ];
  }, [query, q, data]);

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
  const questionCount = query.trim() && q ? (data?.items.length ?? 0) : 0;

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
          placeholder="Search questions, patterns, tags…"
          aria-label="Search questions and pages"
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
        {query.trim() !== "" && !searching && error == null && questionCount === 0 && (
          <div className="flex items-center gap-2 px-3 py-2.5 text-sm text-muted">
            <SearchX className="size-4" aria-hidden /> No questions match “{query.trim()}”.
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
                {item.difficulty && <DifficultyBadge difficulty={item.difficulty} className="hidden sm:inline-flex" />}
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
