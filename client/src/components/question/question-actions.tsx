"use client";

import { CircleCheck, CircleDot, Circle, PartyPopper, Undo2 } from "lucide-react";
import type { ProgressStatus } from "@/lib/types";
import { useProgress } from "@/components/providers/progress-provider";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Button } from "@/components/ui/button";
import { toneText } from "@/components/ui/badge";
import { BookmarkButton } from "@/components/questions/progress-controls";

/** To do / Attempted / Solved + Bookmark, shown in the question header. */
export function QuestionActions({ slug, title }: { slug: string; title: string }) {
  const { status, update, ready } = useProgress();
  const current = ready ? status(slug) : "todo";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <SegmentedControl<ProgressStatus>
        label="Your progress on this question"
        value={current}
        onChange={(next) => void update(slug, { status: next })}
        options={[
          { value: "todo", label: "To do", icon: <Circle aria-hidden /> },
          { value: "attempted", label: "Attempted", icon: <CircleDot aria-hidden style={toneText("warning")} /> },
          { value: "solved", label: "Solved", icon: <CircleCheck aria-hidden style={toneText("success")} /> },
        ]}
      />
      <BookmarkButton slug={slug} title={title} showLabel />
    </div>
  );
}

/** End-of-page call to action: mark solved (or undo). */
export function MarkSolvedCta({ slug }: { slug: string }) {
  const { status, update, ready } = useProgress();
  const solved = ready && status(slug) === "solved";
  if (solved) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-2 text-sm font-medium" style={toneText("success")}>
          <PartyPopper className="size-4" aria-hidden /> Marked as solved
        </span>
        <Button variant="ghost" size="sm" onClick={() => void update(slug, { status: "attempted" })} leftIcon={<Undo2 aria-hidden />}>
          Undo
        </Button>
      </div>
    );
  }
  return (
    <Button onClick={() => void update(slug, { status: "solved" })} leftIcon={<CircleCheck aria-hidden />}>
      I can answer this — mark solved
    </Button>
  );
}
