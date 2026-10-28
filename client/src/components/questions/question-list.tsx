import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { QuestionSummary } from "@/lib/types";
import { cn } from "@/lib/utils";
import { DifficultyBadge, FrequencyBadge, KindBadge } from "@/components/ui/badge";
import { BookmarkButton, QuestionStatusIcon } from "./progress-controls";
import { VisualTypeIcons } from "./visual-type-icons";

export interface QuestionRowProps {
  question: QuestionSummary;
  /** show the topic name in the meta line (off inside a topic page) */
  showTopic?: boolean;
  /** number shown before the title (e.g. order within the topic) */
  index?: number;
  /** show the one-line summary under the title */
  showSummary?: boolean;
}

/** One question in a list. The whole row is clickable; the bookmark button stays independent. */
export function QuestionRow({ question: q, showTopic = true, index, showSummary = false }: QuestionRowProps) {
  return (
    <li className="group relative flex items-start gap-3 px-4 py-2.5 transition-colors hover:bg-surface-2/50 sm:items-center sm:px-5">
      <QuestionStatusIcon slug={q.slug} className="mt-0.5 sm:mt-0" />
      {index !== undefined && (
        <span className="hidden w-6 shrink-0 text-right font-mono text-xs tabular-nums text-muted sm:inline">{index}</span>
      )}
      <div className="min-w-0 flex-1">
        <Link
          href={`/questions/${q.slug}`}
          className="font-medium leading-snug text-foreground outline-none after:absolute after:inset-0 after:content-[''] group-hover:text-brand focus-visible:after:rounded-lg focus-visible:after:outline-2 focus-visible:after:outline-ring"
        >
          {q.title}
        </Link>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
          {showTopic && <span>{q.topicTitle}</span>}
          {showTopic && q.pattern && <span aria-hidden>·</span>}
          {q.pattern && <span className="font-medium text-foreground/70">{q.pattern}</span>}
        </p>
        {showSummary && q.summary && <p className="mt-1 line-clamp-2 text-sm text-muted">{q.summary}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-1.5 sm:hidden">
          <DifficultyBadge difficulty={q.difficulty} />
          <KindBadge kind={q.kind} />
          <VisualTypeIcons types={q.visualTypes} />
        </div>
      </div>
      <div className="hidden shrink-0 items-center gap-2 sm:flex">
        <VisualTypeIcons types={q.visualTypes} className="hidden md:inline-flex" />
        <FrequencyBadge frequency={q.frequency} compact className="hidden lg:inline-flex" />
        <KindBadge kind={q.kind} className="hidden md:inline-flex" />
        <DifficultyBadge difficulty={q.difficulty} className="w-[4.25rem] justify-center" />
      </div>
      <BookmarkButton slug={q.slug} title={q.title} className="-my-1 sm:my-0" />
    </li>
  );
}

/** Bordered list of QuestionRows. */
export function QuestionList({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <ul className={cn("divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface", className)}>
      {children}
    </ul>
  );
}

/** Page links that work in server and client components. */
export function Pagination({
  page,
  totalPages,
  hrefForPage,
  className,
  previousLabel = "Previous",
  nextLabel = "Next",
}: {
  page: number;
  totalPages: number;
  hrefForPage: (page: number) => string;
  className?: string;
  previousLabel?: string;
  nextLabel?: string;
}) {
  if (totalPages <= 1) return null;
  const pages = pageWindow(page, totalPages);
  const linkCls =
    "inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-medium transition-colors";
  return (
    <nav aria-label="Pagination" className={cn("flex items-center justify-center gap-1", className)}>
      {page > 1 ? (
        <Link href={hrefForPage(page - 1)} className={cn(linkCls, "gap-1 text-muted hover:bg-surface-2 hover:text-foreground")} scroll>
          <ChevronLeft className="size-4" aria-hidden />
          <span className="hidden sm:inline">{previousLabel}</span>
          <span className="sr-only sm:hidden">{previousLabel}</span>
        </Link>
      ) : (
        <span className={cn(linkCls, "gap-1 text-muted/50")} aria-hidden>
          <ChevronLeft className="size-4" />
          <span className="hidden sm:inline">{previousLabel}</span>
        </span>
      )}
      <ul className="flex items-center gap-1">
        {pages.map((p, i) =>
          p === "…" ? (
            <li key={`gap-${i}`} className="px-1 text-sm text-muted" aria-hidden>
              …
            </li>
          ) : (
            <li key={p} className={cn(Math.abs(p - page) > 1 && p !== 1 && p !== totalPages && "max-sm:hidden")}>
              <Link
                href={hrefForPage(p)}
                aria-current={p === page ? "page" : undefined}
                aria-label={`Page ${p}`}
                className={cn(
                  linkCls,
                  p === page ? "bg-brand text-brand-foreground" : "text-foreground/80 hover:bg-surface-2",
                )}
              >
                {p}
              </Link>
            </li>
          ),
        )}
      </ul>
      {page < totalPages ? (
        <Link href={hrefForPage(page + 1)} className={cn(linkCls, "gap-1 text-muted hover:bg-surface-2 hover:text-foreground")}>
          <span className="hidden sm:inline">{nextLabel}</span>
          <span className="sr-only sm:hidden">{nextLabel}</span>
          <ChevronRight className="size-4" aria-hidden />
        </Link>
      ) : (
        <span className={cn(linkCls, "gap-1 text-muted/50")} aria-hidden>
          <span className="hidden sm:inline">{nextLabel}</span>
          <ChevronRight className="size-4" />
        </span>
      )}
    </nav>
  );
}

function pageWindow(page: number, total: number): (number | "…")[] {
  const set = new Set<number>([1, total, page - 2, page - 1, page, page + 1, page + 2]);
  const sorted = Array.from(set)
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i]!;
    if (i > 0 && p - sorted[i - 1]! > 1) out.push("…");
    out.push(p);
  }
  return out;
}
