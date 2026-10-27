"use client";

import { useState } from "react";
import { SearchX } from "lucide-react";
import type { Difficulty, QuestionKind, QuestionSummary } from "@/lib/types";
import { DIFFICULTIES, DIFFICULTY_LABELS, KINDS, KIND_LABELS, STATUS_FILTERS, type StatusFilter } from "@/lib/constants";
import { useProgress } from "@/components/providers/progress-provider";
import { ChipGroup } from "@/components/ui/chip-group";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { QuestionList, QuestionRow } from "@/components/questions/question-list";

/** Topic page question list with difficulty / type / progress filters (client-side). */
export function TopicQuestionList({ questions }: { questions: QuestionSummary[] }) {
  const { status, isBookmarked, isLoggedIn } = useProgress();
  const [difficulty, setDifficulty] = useState<Difficulty[]>([]);
  const [kind, setKind] = useState<QuestionKind[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const kindsPresent = KINDS.filter((k) => questions.some((q) => q.kind === k));
  const countBy = <K extends keyof QuestionSummary>(key: K, value: QuestionSummary[K]) =>
    questions.filter((q) => q[key] === value).length;

  const filtered = questions.filter((q) => {
    if (difficulty.length && !difficulty.includes(q.difficulty)) return false;
    if (kind.length && !kind.includes(q.kind)) return false;
    switch (statusFilter) {
      case "solved":
        return status(q.slug) === "solved";
      case "attempted":
        return status(q.slug) === "attempted";
      case "unsolved":
        return status(q.slug) !== "solved";
      case "bookmarked":
        return isBookmarked(q.slug);
      default:
        return true;
    }
  });

  const anyFilter = difficulty.length > 0 || kind.length > 0 || statusFilter !== "all";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <ChipGroup
            label="Filter by difficulty"
            value={difficulty}
            onChange={setDifficulty}
            options={DIFFICULTIES.filter((d) => countBy("difficulty", d) > 0).map((d) => ({
              value: d,
              label: DIFFICULTY_LABELS[d],
              tone: d,
              count: countBy("difficulty", d),
            }))}
          />
          {kindsPresent.length > 1 && (
            <ChipGroup
              label="Filter by question type"
              value={kind}
              onChange={setKind}
              options={kindsPresent.map((k) => ({ value: k, label: KIND_LABELS[k], count: countBy("kind", k) }))}
            />
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <SegmentedControl<StatusFilter>
            label="Filter by progress"
            size="sm"
            value={statusFilter}
            onChange={setStatusFilter}
            options={STATUS_FILTERS.map((s) => ({
              value: s.value,
              label: s.label,
              disabled: !isLoggedIn && s.value !== "all",
            }))}
          />
          <p className="text-xs text-muted" role="status">
            {filtered.length} of {questions.length} questions
          </p>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          compact
          icon={SearchX}
          title="No questions match"
          description="Try removing a filter."
          action={
            anyFilter && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setDifficulty([]);
                  setKind([]);
                  setStatusFilter("all");
                }}
              >
                Clear filters
              </Button>
            )
          }
        />
      ) : (
        <QuestionList>
          {filtered.map((q) => (
            <QuestionRow key={q.slug} question={q} showTopic={false} index={q.order + 1} />
          ))}
        </QuestionList>
      )}
      {!isLoggedIn && (
        <p className="text-xs text-muted">Log in to filter by solved, attempted and bookmarked questions.</p>
      )}
    </div>
  );
}
