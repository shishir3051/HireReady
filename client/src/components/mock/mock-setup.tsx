"use client";

import { useState, type FormEvent } from "react";
import { CircleAlert, Clock, Play, Shuffle } from "lucide-react";
import type { Category, Difficulty, MockConfig, QuestionKind } from "@/lib/types";
import { CATEGORY_LABELS, CATEGORY_ORDER, DIFFICULTY_LABELS, KINDS, KIND_LABELS } from "@/lib/constants";
import { KIND_ICONS } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/input";
import { MultiSelect, type MultiSelectOption } from "@/components/ui/multi-select";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { toneStyle } from "@/components/ui/badge";
import { TopicIcon } from "@/components/topics/topic-icon";
import { DIFFICULTY_CHOICES, KIND_HINTS, KIND_MINUTES, MAX_QUESTIONS, MIN_QUESTIONS } from "./constants";

export interface TopicOption {
  slug: string;
  title: string;
  category: Category;
}

export interface MockSetupProps {
  topics: TopicOption[];
  /** initial values (topics prefilled from ?topics=) */
  initial: MockConfig;
  starting: boolean;
  error: string | null;
  onStart: (config: MockConfig) => void;
}

const COUNTS = Array.from({ length: MAX_QUESTIONS - MIN_QUESTIONS + 1 }, (_, i) => String(MIN_QUESTIONS + i));

/** Mock interview configuration form. */
export function MockSetup({ topics, initial, starting, error, onStart }: MockSetupProps) {
  const [count, setCount] = useState(initial.count);
  const [kinds, setKinds] = useState<QuestionKind[]>(initial.kinds);
  const [selectedTopics, setSelectedTopics] = useState<string[]>(initial.topics);
  const [difficulty, setDifficulty] = useState<Difficulty | "mixed">(initial.difficulty);
  const [kindsError, setKindsError] = useState(false);

  const topicOptions: MultiSelectOption[] = CATEGORY_ORDER.flatMap((category) =>
    topics
      .filter((t) => t.category === category)
      .map((t) => ({
        value: t.slug,
        label: t.title,
        group: CATEGORY_LABELS[category],
        icon: <TopicIcon slug={t.slug} />,
      })),
  );

  const minutes = kinds.map((k) => KIND_MINUTES[k]);
  const lo = minutes.length ? Math.min(...minutes) * count : 0;
  const hi = minutes.length ? Math.max(...minutes) * count : 0;
  const estimate = lo === hi ? `${lo} min` : `${lo}–${hi} min`;

  function toggleKind(kind: QuestionKind, on: boolean) {
    setKindsError(false);
    setKinds((prev) => (on ? KINDS.filter((k) => k === kind || prev.includes(k)) : prev.filter((k) => k !== kind)));
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (kinds.length === 0) {
      setKindsError(true);
      document.getElementById("mock-kinds")?.focus();
      return;
    }
    onStart({ count, kinds, topics: selectedTopics, difficulty });
  }

  return (
    <Card className="overflow-hidden">
      <form onSubmit={submit} noValidate aria-labelledby="mock-setup-title">
        <div className="border-b border-border px-4 py-3 sm:px-5">
          <h2 id="mock-setup-title" className="text-lg font-semibold tracking-tight">
            Set up your interview
          </h2>
          <p className="mt-0.5 text-sm text-muted">Random questions from the bank, timed like the real thing.</p>
        </div>

        <div className="space-y-5 p-4 sm:p-5">
          {/* count */}
          <div className="space-y-2.5">
            <p className="text-sm font-medium">
              Number of questions
            </p>
            <SegmentedControl
              label="Number of questions"
              fullWidth
              value={String(count)}
              onChange={(v) => setCount(Number(v))}
              options={COUNTS.map((c) => ({ value: c, label: c }))}
            />
          </div>

          {/* kinds */}
          <fieldset
            id="mock-kinds"
            tabIndex={-1}
            className="relative outline-none"
            aria-describedby={kindsError ? "mock-kinds-error" : undefined}
            aria-invalid={kindsError || undefined}
          >
            <legend className="float-left mb-2.5 text-sm font-medium">Question types</legend>
            <div className="absolute right-0 top-0 flex gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setKinds([...KINDS]);
                    setKindsError(false);
                  }}
                  className="rounded px-1.5 py-0.5 font-medium text-brand hover:bg-brand-soft"
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setKinds([])}
                  className="rounded px-1.5 py-0.5 font-medium text-muted hover:bg-surface-2 hover:text-foreground"
                >
                  None
                </button>
            </div>
            <div className="clear-both grid gap-2 sm:grid-cols-2">
              {KINDS.map((kind) => {
                const Icon = KIND_ICONS[kind];
                const checked = kinds.includes(kind);
                return (
                  <Checkbox
                    key={kind}
                    id={`mock-kind-${kind}`}
                    checked={checked}
                    onChange={(e) => toggleKind(kind, e.target.checked)}
                    className={
                      "rounded-xl border px-3 py-2.5 transition-colors " +
                      (checked ? "border-brand/40 bg-brand-soft/40" : "border-border bg-surface hover:bg-surface-2/60")
                    }
                    label={
                      <span className="flex items-center gap-1.5 font-medium">
                        <Icon className="size-4 text-muted" aria-hidden />
                        {KIND_LABELS[kind]}
                        <span className="inline-flex items-center gap-1 text-xs font-normal tabular-nums text-muted">
                          <span aria-hidden>·</span>
                          {KIND_MINUTES[kind]} min
                        </span>
                      </span>
                    }
                    description={KIND_HINTS[kind]}
                  />
                );
              })}
            </div>
            {kindsError && (
              <p id="mock-kinds-error" className="mt-2.5 flex items-center gap-1.5 text-xs font-medium" style={{ color: "var(--viz-danger)" }}>
                <CircleAlert className="size-3.5" aria-hidden /> Pick at least one question type.
              </p>
            )}
          </fieldset>

          {/* topics */}
          <div className="space-y-2.5">
            <p className="text-sm font-medium">Topics</p>
            <MultiSelect
              label="Topics"
              options={topicOptions}
              value={selectedTopics}
              onChange={setSelectedTopics}
              searchPlaceholder="Filter topics…"
            />
            <p className="text-xs text-muted">
              {topics.length === 0
                ? "Topics couldn't be loaded — the interview will draw from every topic."
                : selectedTopics.length === 0
                  ? "All topics. Narrow it down to focus on what you're about to be asked."
                  : `${selectedTopics.length} ${selectedTopics.length === 1 ? "topic" : "topics"} selected.`}
            </p>
          </div>

          {/* difficulty */}
          <div className="space-y-2.5">
            <p className="text-sm font-medium">Difficulty</p>
            <SegmentedControl
              label="Difficulty"
              fullWidth
              value={difficulty}
              onChange={setDifficulty}
              options={DIFFICULTY_CHOICES.map((d) => ({
                value: d,
                label: d === "mixed" ? "Mixed" : DIFFICULTY_LABELS[d],
                icon:
                  d === "mixed" ? (
                    <Shuffle aria-hidden />
                  ) : (
                    <span className="size-2 rounded-full" style={{ backgroundColor: `var(--${d})` }} aria-hidden />
                  ),
              }))}
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm" style={toneStyle("danger")} role="alert">
              <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span className="text-foreground">{error}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-border bg-surface-2/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="flex items-center gap-1.5 text-sm text-muted">
            <Clock className="size-4" aria-hidden />
            {kinds.length ? (
              <>
                About <span className="font-medium tabular-nums text-foreground">{estimate}</span> · {count} questions
              </>
            ) : (
              "Pick at least one question type"
            )}
          </p>
          <Button type="submit" size="lg" loading={starting} leftIcon={<Play aria-hidden />}>
            {starting ? "Picking questions…" : "Start interview"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
