import type { ReactNode } from "react";
import {
  BookOpenCheck,
  Code,
  FileText,
  Lightbulb,
  ListChecks,
  MessagesSquare,
  NotebookPen,
  Route,
  Sparkles,
  TriangleAlert,
  Waypoints,
} from "lucide-react";
import type { QuestionDetailResponse } from "@/lib/types";
import { VisualWalkthrough } from "@/components/visualizers";
import { Breadcrumbs, Container } from "@/components/layout/page";
import { Markdown } from "@/components/markdown";
import { CodeTabs } from "@/components/code-tabs";
import { DifficultyBadge, FrequencyBadge, KindBadge, TagBadge, Badge } from "@/components/ui/badge";
import { VisualTypeIcons } from "@/components/questions/visual-type-icons";
import { PracticeGate, PracticeModeProvider, PracticeModeToggle } from "@/components/question/practice-mode";
import { MarkSolvedCta, QuestionActions } from "@/components/question/question-actions";
import { Hints } from "@/components/question/hints";
import { KeyPoints } from "@/components/question/key-points";
import { QuestionNotes } from "@/components/question/question-notes";
import { QuestionToc, type TocItem } from "@/components/question/question-toc";
import {
  Approaches,
  Complexity,
  Constraints,
  Examples,
  FollowUps,
  Pitfalls,
  PrevNextNav,
  RelatedQuestions,
  SayThisFirst,
} from "@/components/question/question-sections";

export interface QuestionViewProps {
  data: QuestionDetailResponse;
  /** resolved `question.related` entries (missing ones already dropped) */
  related?: QuestionDetailResponse[];
}

/**
 * The full study page for one question (header, problem, hints, visual walkthrough, approaches,
 * solution, key points, pitfalls, follow-ups, related, notes, prev/next) — server component with
 * client islands. `app/questions/[slug]/page.tsx` fetches the data and renders this.
 */
export function QuestionView({ data, related = [] }: QuestionViewProps) {
  const { question: q, topic, prev, next } = data;
  const jsCode = q.solution.code?.find((c) => c.language === "javascript")?.code;
  const hasVisuals = q.visuals.length > 0;

  const toc: TocItem[] = [
    { id: "problem", label: "Problem" },
    ...(q.hints.length ? [{ id: "hints", label: "Hints" }] : []),
    ...(hasVisuals ? [{ id: "walkthrough", label: "Visual walkthrough", gated: true }] : []),
    ...(q.approaches.length ? [{ id: "approaches", label: "Approaches", gated: true }] : []),
    { id: "solution", label: "Solution", gated: true },
    ...(q.solution.keyPoints.length ? [{ id: "key-points", label: "Key points", gated: true }] : []),
    ...(q.pitfalls?.length ? [{ id: "pitfalls", label: "Pitfalls", gated: true }] : []),
    ...(q.followUps?.length ? [{ id: "follow-ups", label: "Follow-ups", gated: true }] : []),
    ...(related.length ? [{ id: "related", label: "Related" }] : []),
    { id: "notes", label: "Your notes" },
  ];
  const gatedCount = toc.filter((t) => t.gated).length;

  return (
    <PracticeModeProvider>
      <Container size="wide" className="pb-12 pt-4 sm:pt-5">
        <Breadcrumbs
          items={[
            { href: "/topics", label: "Topics" },
            { href: `/topics/${topic.slug}`, label: topic.title },
            { label: q.title },
          ]}
        />

        {/* Header */}
        <header className="mt-4 border-b border-border pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <DifficultyBadge difficulty={q.difficulty} size="md" />
            <KindBadge kind={q.kind} size="md" />
            <FrequencyBadge frequency={q.frequency} size="md" />
            {q.pattern && (
              <Badge tone="brand" size="md" icon={<Route aria-hidden />}>
                {q.pattern}
              </Badge>
            )}
          </div>
          <h1 className="mt-3 text-balance text-2xl font-semibold tracking-tight sm:text-3xl">{q.title}</h1>
          {q.tags.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Tags">
              {q.tags.map((t) => (
                <li key={t}>
                  <TagBadge>{t}</TagBadge>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <QuestionActions slug={q.slug} title={q.title} />
            <PracticeModeToggle className="self-start sm:self-auto" />
          </div>
        </header>

        <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_220px] xl:gap-8">
          <article className="min-w-0 space-y-8">
            <Section id="problem" title="Problem" icon={<FileText aria-hidden />}>
              <div className="space-y-4">
                <Markdown>{q.prompt}</Markdown>
                {q.examples && q.examples.length > 0 && <Examples examples={q.examples} />}
                {q.constraints && q.constraints.length > 0 && <Constraints constraints={q.constraints} />}
              </div>
            </Section>

            {q.hints.length > 0 && (
              <Section
                id="hints"
                title="Hints"
                icon={<Lightbulb aria-hidden />}
                description="Stuck? Reveal one hint at a time — the last one nearly gives it away."
              >
                <Hints hints={q.hints} />
              </Section>
            )}

            <PracticeGate className="space-y-8" sectionCount={gatedCount}>
              {hasVisuals && (
                <section aria-labelledby="walkthrough" className="relative">
                  <div className="overflow-hidden rounded-2xl border border-brand/30 bg-surface shadow-lg shadow-brand/5">
                    <div
                      className="flex flex-col gap-1 border-b border-brand/20 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                      style={{
                        background:
                          "linear-gradient(90deg, color-mix(in oklch, var(--brand-soft) 90%, transparent), color-mix(in oklch, var(--viz-info) 10%, transparent))",
                      }}
                    >
                      <div>
                        <h2 id="walkthrough" className="flex scroll-mt-20 items-center gap-2 text-base font-semibold tracking-tight sm:text-lg">
                          <Waypoints className="size-5 text-brand" aria-hidden /> Visual walkthrough
                        </h2>
                        <p className="mt-0.5 text-sm text-muted">
                          Step through the solution and watch the state change{jsCode ? " — synced to the code" : ""}.
                        </p>
                      </div>
                      <VisualTypeIcons types={q.visuals.map((v) => v.type)} />
                    </div>
                    <div className="p-2 sm:p-3">
                      <VisualWalkthrough visuals={q.visuals} code={jsCode} />
                    </div>
                  </div>
                </section>
              )}

              {q.approaches.length > 0 && (
                <Section
                  id="approaches"
                  title={q.kind === "coding" || q.kind === "sql" ? "Approaches: brute force → optimal" : "Weak vs strong answers"}
                  icon={<Route aria-hidden />}
                  description={
                    q.kind === "coding" || q.kind === "sql"
                      ? "Say the brute force out loud first, then improve it step by step."
                      : "What separates an average answer from one that gets you hired."
                  }
                >
                  <Approaches approaches={q.approaches} kind={q.kind} />
                </Section>
              )}

              <Section id="solution" title="Solution" icon={<Sparkles aria-hidden />}>
                <div className="space-y-4">
                  <SayThisFirst summary={q.solution.summary} />
                  <Markdown>{q.solution.explanation}</Markdown>
                  {q.solution.code && q.solution.code.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="flex items-center gap-2 text-sm font-semibold">
                        <Code className="size-4 text-muted" aria-hidden /> Code
                      </h3>
                      <CodeTabs snippets={q.solution.code} />
                    </div>
                  )}
                  {q.solution.complexity && <Complexity complexity={q.solution.complexity} />}
                </div>
              </Section>

              {q.solution.keyPoints.length > 0 && (
                <Section
                  id="key-points"
                  title="What the interviewer listens for"
                  icon={<ListChecks aria-hidden />}
                >
                  <KeyPoints points={q.solution.keyPoints} />
                </Section>
              )}

              {q.pitfalls && q.pitfalls.length > 0 && (
                <Section id="pitfalls" title="Common pitfalls" icon={<TriangleAlert aria-hidden />}>
                  <Pitfalls pitfalls={q.pitfalls} />
                </Section>
              )}

              {q.followUps && q.followUps.length > 0 && (
                <Section
                  id="follow-ups"
                  title="Likely follow-up questions"
                  icon={<MessagesSquare aria-hidden />}
                  description="Interviewers rarely stop at the first answer. Be ready for these."
                >
                  <FollowUps followUps={q.followUps} />
                </Section>
              )}
            </PracticeGate>

            {related.length > 0 && (
              <Section id="related" title="Related questions" icon={<BookOpenCheck aria-hidden />}>
                <RelatedQuestions items={related} />
              </Section>
            )}

            <Section
              id="notes"
              title="Your notes"
              icon={<NotebookPen aria-hidden />}
              description="Autosaved to your account. Write the answer the way you would say it."
            >
              <div className="space-y-4">
                <QuestionNotes slug={q.slug} />
                <MarkSolvedCta slug={q.slug} />
              </div>
            </Section>

            <PrevNextNav prev={prev} next={next} topic={topic} />
          </article>

          <aside className="hidden lg:block">
            <div className="sticky top-20 max-h-[calc(100dvh-6rem)] overflow-y-auto pb-4">
              <QuestionToc items={toc} />
            </div>
          </aside>
        </div>
      </Container>
    </PracticeModeProvider>
  );
}

function Section({
  id,
  title,
  icon,
  description,
  children,
}: {
  id: string;
  title: string;
  icon: ReactNode;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id}>
      <div className="mb-3 space-y-1">
        <h2 id={id} className="flex scroll-mt-20 items-center gap-2 text-base font-semibold tracking-tight sm:text-lg">
          <span className="text-brand [&_svg]:size-5">{icon}</span>
          {title}
        </h2>
        {description && <p className="text-sm text-muted">{description}</p>}
      </div>
      {children}
    </section>
  );
}
