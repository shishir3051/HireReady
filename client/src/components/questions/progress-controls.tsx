"use client";

import { Bookmark, BookmarkCheck, Circle, CircleCheck, CircleDot } from "lucide-react";
import type { ProgressStatus } from "@/lib/types";
import { STATUS_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useProgress } from "@/components/providers/progress-provider";
import { toneText } from "@/components/ui/badge";

const STATUS_ICON = { todo: Circle, attempted: CircleDot, solved: CircleCheck } as const;

/** Static icon for a status (no data access). */
export function StatusGlyph({ status, className }: { status: ProgressStatus; className?: string }) {
  const Icon = STATUS_ICON[status];
  return (
    <Icon
      className={cn("size-[18px] shrink-0", status === "todo" && "text-border", className)}
      style={status === "solved" ? toneText("success") : status === "attempted" ? toneText("warning") : undefined}
      aria-hidden
    />
  );
}

/** Solved / attempted / to-do indicator for a question, from ProgressProvider. */
export function QuestionStatusIcon({ slug, className }: { slug: string; className?: string }) {
  const { status, ready, isLoggedIn } = useProgress();
  const s = ready && isLoggedIn ? status(slug) : "todo";
  return (
    <span className={cn("inline-flex", className)} title={isLoggedIn ? STATUS_LABELS[s] : undefined}>
      <StatusGlyph status={s} />
      {isLoggedIn && <span className="sr-only">{STATUS_LABELS[s]}</span>}
    </span>
  );
}

export interface BookmarkButtonProps {
  slug: string;
  /** question title, used in the accessible label */
  title?: string;
  showLabel?: boolean;
  className?: string;
}

/** Toggle a bookmark (optimistic; prompts to log in when logged out). */
export function BookmarkButton({ slug, title, showLabel = false, className }: BookmarkButtonProps) {
  const { isBookmarked, toggleBookmark, ready } = useProgress();
  const on = ready && isBookmarked(slug);
  const Icon = on ? BookmarkCheck : Bookmark;
  const label = on ? "Remove bookmark" : "Bookmark";
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={showLabel ? undefined : title ? `${label}: ${title}` : label}
      title={label}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void toggleBookmark(slug);
      }}
      className={cn(
        "relative z-10 inline-flex shrink-0 items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors",
        showLabel
          ? "h-9 border border-border bg-surface px-3 hover:bg-surface-2"
          : "size-8 text-muted hover:bg-surface-2 hover:text-foreground",
        on && "text-brand hover:text-brand",
        className,
      )}
    >
      <Icon className={cn("size-4", on && "fill-brand-soft")} aria-hidden />
      {showLabel && <span>{on ? "Bookmarked" : "Bookmark"}</span>}
    </button>
  );
}
