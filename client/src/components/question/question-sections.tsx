import Link from "next/link";
import { ArrowLeft, ArrowRight, Clock, Database, MessageSquareQuote, Sparkles, TriangleAlert, Trophy } from "lucide-react";
import type { NavRef, Question, QuestionDetailResponse } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Markdown } from "@/components/markdown";
import { Accordion, AccordionItem } from "@/components/ui/accordion";
import { Badge, DifficultyBadge, KindBadge, toneText } from "@/components/ui/badge";

// ---------------------------------------------------------------- problem

export function Examples({ examples }: { examples: NonNullable<Question["examples"]> }) {
  return (
    <div className="space-y-3">
      {examples.map((ex, i) => (
        <div key={i} className="overflow-hidden rounded-xl border border-border bg-surface">
          <p className="border-b border-border bg-surface-2/60 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted">
            Example {i + 1}
          </p>
          <dl className="grid gap-x-4 gap-y-2 px-4 py-2.5 text-sm sm:grid-cols-[auto_1fr]">
            <dt className="font-medium text-muted">Input</dt>
            <dd className="min-w-0 overflow-x-auto font-mono text-[13px] whitespace-pre-wrap [overflow-wrap:anywhere]">{ex.input}</dd>
            <dt className="font-medium text-muted">Output</dt>
            <dd className="min-w-0 overflow-x-auto font-mono text-[13px] whitespace-pre-wrap [overflow-wrap:anywhere]">{ex.output}</dd>
            {ex.explanation && (
              <>
                <dt className="font-medium text-muted">Why</dt>
                <dd className="min-w-0">
                  <Markdown size="sm">{ex.explanation}</Markdown>
                </dd>
              </>
            )}
          </dl>
        </div>
      ))}
    </div>
  );
}

export function Constraints({ constraints }: { constraints: string[] }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-2.5">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">Constraints</p>
      <ul className="mt-2 space-y-1">
        {constraints.map((c) => (
          <li key={c} className="flex gap-2 font-mono text-[13px] text-foreground/85">
            <span className="text-muted" aria-hidden>
              •
            </span>
            <span className="min-w-0 [overflow-wrap:anywhere]">{c}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------- approaches

/** Brute force → optimal, as a connected sequence of cards. The last one is the recommended answer. */
export function Approaches({ approaches, kind }: { approaches: Question["approaches"]; kind: Question["kind"] }) {
  const coding = kind === "coding" || kind === "sql";
  return (
    <ol className="relative space-y-3">
      {approaches.map((a, i) => {
        const best = i === approaches.length - 1;
        const hasComplexity = a.time !== "—" || a.space !== "—";
        return (
          <li key={a.name} className="relative flex gap-3 sm:gap-4">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "z-10 grid size-8 shrink-0 place-items-center rounded-full border text-xs font-semibold",
                  best ? "border-transparent bg-brand text-brand-foreground" : "border-border bg-surface text-muted",
                )}
                aria-hidden
              >
                {best ? <Trophy className="size-4" /> : i + 1}
              </span>
              {!best && <span className="mt-1 w-px flex-1 bg-border" aria-hidden />}
            </div>
            <div
              className={cn(
                "mb-1 min-w-0 flex-1 rounded-xl border p-4",
                best ? "border-brand/40 bg-brand-soft/30" : "border-border bg-surface",
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold">{a.name}</h3>
                {best && (
                  <Badge tone="brand" icon={<Sparkles aria-hidden />}>
                    {coding ? "Optimal" : "Aim for this"}
                  </Badge>
                )}
              </div>
              <Markdown size="sm" className="mt-1.5 text-foreground/85">
                {a.idea}
              </Markdown>
              {hasComplexity && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="outline" icon={<Clock aria-hidden />} className="font-mono">
                    Time {a.time}
                  </Badge>
                  <Badge variant="outline" icon={<Database aria-hidden />} className="font-mono">
                    Space {a.space}
                  </Badge>
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

// ---------------------------------------------------------------- solution

export function SayThisFirst({ summary }: { summary: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-brand/30 bg-brand-soft/40 p-4 sm:p-5">
      <MessageSquareQuote className="absolute -right-3 -top-3 size-24 text-brand/10" aria-hidden />
      <p className="relative flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand">
        <MessageSquareQuote className="size-4" aria-hidden /> Say this first
      </p>
      <p className="relative mt-2 text-pretty text-base font-medium leading-relaxed sm:text-lg">{summary}</p>
    </div>
  );
}

export function Complexity({ complexity }: { complexity: NonNullable<Question["solution"]["complexity"]> }) {
  const split = (s: string) => {
    const m = s.match(/^\s*(O\([^)]*\))\s*(?:[—–:-]\s*)?(.*)$/);
    return m ? { big: m[1]!, why: m[2] ?? "" } : { big: s, why: "" };
  };
  const items = [
    { label: "Time", icon: Clock, ...split(complexity.time) },
    { label: "Space", icon: Database, ...split(complexity.space) },
  ];
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {items.map(({ label, icon: Icon, big, why }) => (
        <div key={label} className="rounded-xl border border-border bg-surface p-4">
          <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted">
            <Icon className="size-3.5" aria-hidden /> {label} complexity
          </dt>
          <dd className="mt-1.5">
            <span className="font-mono text-lg font-semibold">{big}</span>
            {why && <span className="mt-0.5 block text-sm text-muted">{why}</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

// ---------------------------------------------------------------- pitfalls & follow-ups

export function Pitfalls({ pitfalls }: { pitfalls: string[] }) {
  return (
    <ul className="space-y-2">
      {pitfalls.map((p) => (
        <li
          key={p}
          className="flex gap-3 rounded-xl border px-4 py-2.5"
          style={{
            borderColor: "color-mix(in oklch, var(--viz-warning) 35%, var(--border))",
            backgroundColor: "color-mix(in oklch, var(--viz-warning) 7%, var(--surface))",
          }}
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0" style={toneText("warning")} aria-hidden />
          <Markdown size="sm" className="flex-1">
            {p}
          </Markdown>
        </li>
      ))}
    </ul>
  );
}

export function FollowUps({ followUps }: { followUps: NonNullable<Question["followUps"]> }) {
  return (
    <Accordion>
      {followUps.map((f, i) => (
        <AccordionItem
          key={f.question}
          title={f.question}
          defaultOpen={i === 0}
          leading={
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-surface-2 text-xs font-semibold text-muted">
              {i + 1}
            </span>
          }
        >
          <Markdown size="sm">{f.answer}</Markdown>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

// ---------------------------------------------------------------- related & navigation

export function RelatedQuestions({ items }: { items: QuestionDetailResponse[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {items.map(({ question: q, topic }) => (
        <li key={q.slug}>
          <Link
            href={`/questions/${q.slug}`}
            className="group flex h-full flex-col gap-2 rounded-xl border border-border bg-surface p-4 transition-[border-color,transform] hover:-translate-y-0.5 hover:border-brand/40"
          >
            <span className="text-xs text-muted">{topic.title}</span>
            <span className="font-medium leading-snug group-hover:text-brand">{q.title}</span>
            <span className="mt-auto flex flex-wrap gap-1.5 pt-1">
              <DifficultyBadge difficulty={q.difficulty} />
              <KindBadge kind={q.kind} />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function PrevNextNav({ prev, next, topic }: { prev: NavRef | null; next: NavRef | null; topic: { slug: string; title: string } }) {
  return (
    <nav aria-label="Question navigation" className="grid gap-3 sm:grid-cols-2">
      {prev ? (
        <Link
          href={`/questions/${prev.slug}`}
          className="group flex items-center gap-3 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-brand/40"
        >
          <ArrowLeft className="size-5 shrink-0 text-muted transition-transform group-hover:-translate-x-0.5 group-hover:text-brand" aria-hidden />
          <span className="min-w-0">
            <span className="block text-xs text-muted">Previous</span>
            <span className="block truncate font-medium">{prev.title}</span>
          </span>
        </Link>
      ) : (
        <Link
          href={`/topics/${topic.slug}`}
          className="group flex items-center gap-3 rounded-xl border border-dashed border-border p-4 text-muted transition-colors hover:border-brand/40 hover:text-foreground"
        >
          <ArrowLeft className="size-5 shrink-0" aria-hidden />
          <span className="min-w-0">
            <span className="block text-xs">First question of the topic</span>
            <span className="block truncate font-medium">Back to {topic.title}</span>
          </span>
        </Link>
      )}
      {next ? (
        <Link
          href={`/questions/${next.slug}`}
          className="group flex items-center justify-end gap-3 rounded-xl border border-border bg-surface p-4 text-right transition-colors hover:border-brand/40"
        >
          <span className="min-w-0">
            <span className="block text-xs text-muted">Next</span>
            <span className="block truncate font-medium">{next.title}</span>
          </span>
          <ArrowRight className="size-5 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-brand" aria-hidden />
        </Link>
      ) : (
        <Link
          href={`/quiz/${topic.slug}`}
          className="group flex items-center justify-end gap-3 rounded-xl border border-dashed border-border p-4 text-right text-muted transition-colors hover:border-brand/40 hover:text-foreground"
        >
          <span className="min-w-0">
            <span className="block text-xs">Topic complete</span>
            <span className="block truncate font-medium">Take the {topic.title} quiz</span>
          </span>
          <ArrowRight className="size-5 shrink-0" aria-hidden />
        </Link>
      )}
    </nav>
  );
}
