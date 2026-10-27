"use client";

import { createContext, useContext, type ReactNode } from "react";
import { CircleCheck } from "lucide-react";
import type { ProgressStats } from "@/lib/types";
import { useProgress, useProgressStats } from "@/components/providers/progress-provider";
import { ProgressBar } from "@/components/ui/progress-bar";
import { toneText } from "@/components/ui/badge";

const TopicStatsContext = createContext<ProgressStats["byTopic"] | null>(null);

/** Loads GET /api/progress/stats once for a page of topic cards. */
export function TopicsProgressProvider({ children }: { children: ReactNode }) {
  const { stats } = useProgressStats();
  return <TopicStatsContext.Provider value={stats?.byTopic ?? null}>{children}</TopicStatsContext.Provider>;
}

/** Personal progress bar on a topic card (renders nothing when logged out). */
export function TopicCardProgress({ slug, total, title }: { slug: string; total: number; title: string }) {
  const byTopic = useContext(TopicStatsContext);
  const { isLoggedIn } = useProgress();
  if (!isLoggedIn) return null;
  const entry = byTopic?.find((t) => t.topic === slug);
  const solved = entry?.solved ?? 0;
  const max = entry?.total ?? total;
  if (!byTopic) return <div className="h-5" aria-hidden />;
  return (
    <ProgressBar
      value={solved}
      max={max}
      label={`${title}: ${solved} of ${max} solved`}
      tone={solved > 0 && solved >= max ? "success" : "brand"}
      size="xs"
      showValue={`${solved}/${max}`}
      className="relative z-10"
    />
  );
}

/** Topic page progress summary computed from the ProgressProvider snapshot. */
export function TopicProgressSummary({ slugs, title }: { slugs: string[]; title: string }) {
  const { isLoggedIn, ready, status, isBookmarked } = useProgress();
  if (!ready) return <div className="h-14 animate-pulse rounded-lg bg-surface-2" aria-hidden />;
  if (!isLoggedIn) return null;
  const solved = slugs.filter((s) => status(s) === "solved").length;
  const attempted = slugs.filter((s) => status(s) === "attempted").length;
  const bookmarked = slugs.filter((s) => isBookmarked(s)).length;
  const done = slugs.length > 0 && solved === slugs.length;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">Your progress</span>
        {done && (
          <span className="inline-flex items-center gap-1 text-xs font-medium" style={toneText("success")}>
            <CircleCheck className="size-3.5" aria-hidden /> Complete
          </span>
        )}
      </div>
      <ProgressBar
        value={solved}
        max={slugs.length}
        label={`${title} progress`}
        tone={done ? "success" : "brand"}
        size="md"
        showValue={`${solved}/${slugs.length}`}
      />
      <p className="text-xs text-muted">
        {attempted} attempted · {bookmarked} bookmarked
      </p>
    </div>
  );
}
