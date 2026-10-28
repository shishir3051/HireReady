"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MotionConfig } from "motion/react";
import { CircleAlert, CircleCheck, LoaderCircle, RefreshCw } from "lucide-react";
import type { Paginated, Question, QuestionDetailResponse, QuestionSummary, Visual } from "@/lib/types";
import { VisualErrorBoundary } from "@/components/visualizers/core/ErrorBoundary";
import { InlineMarkdown } from "@/components/visualizers/core/Markdown";
import { PanelCard } from "@/components/visualizers/core/Panels";
import { VarsBox } from "@/components/visualizers/core/VarsBox";
import { StepCanvas } from "@/components/visualizers/renderers";
import { parseMermaid } from "@/components/visualizers/lib/mermaid";
import { stepCount, stepMeta } from "@/components/visualizers/lib/steps";
import { errorMessage } from "@/components/visualizers/lib/utils";

export interface ContentFailure {
  slug: string;
  /** index into question.visuals; null for question-level problems */
  visual: number | null;
  type: string;
  /** step / frame index; null when not step-specific */
  step: number | null;
  error: string;
}

interface Totals {
  questions: number;
  visuals: number;
  steps: number;
}

declare global {
  interface Window {
    __contentCheck?: { done: boolean; failures: ContentFailure[]; totals?: Totals };
  }
}

const KNOWN = new Set(["array", "grid", "linked-list", "tree", "graph", "table", "state", "timeline", "diagram", "comparison"]);

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { accept: "application/json" }, cache: "no-store" });
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try {
      const body = (await res.json()) as { error?: { message?: string } };
      if (body?.error?.message) msg += ` — ${body.error.message}`;
    } catch {
      /* not json */
    }
    throw new Error(`GET ${url}: ${msg}`);
  }
  return (await res.json()) as T;
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}

/** Renders one step exactly like the player does (canvas, panels, vars, note) — without the player. */
function StepProbe({ visual, index }: { visual: Visual; index: number }) {
  const meta = stepMeta(visual, index);
  return (
    <div>
      <StepCanvas visual={visual} index={index} />
      {visual.type !== "state" && meta.panels.map((p, i) => <PanelCard key={i} panel={p} />)}
      {meta.vars ? <VarsBox vars={meta.vars} /> : null}
      <InlineMarkdown text={meta.note} />
    </div>
  );
}

interface ProbeJob {
  id: number;
  question: Question;
}

function Probe({
  job,
  onError,
  onDone,
}: {
  job: ProbeJob;
  onError: (slug: string, vi: number, type: string, si: number, err: unknown) => void;
  onDone: (id: number) => void;
}) {
  useEffect(() => {
    onDone(job.id);
  }, [job.id, onDone]);
  const visuals = Array.isArray(job.question.visuals) ? job.question.visuals : [];
  return (
    <MotionConfig reducedMotion="always">
      {visuals.map((v, vi) => {
        if (!v || v.type === "diagram" || !KNOWN.has(v.type)) return null;
        const n = Math.max(1, stepCount(v));
        return Array.from({ length: n }, (_, si) => (
          <VisualErrorBoundary
            key={`${job.id}-${vi}-${si}`}
            fallback={() => null}
            onError={(err: unknown) => onError(job.question.slug, vi, v.type, si, err)}
          >
            <StepProbe visual={v} index={si} />
          </VisualErrorBoundary>
        ));
      })}
    </MotionConfig>
  );
}

export function ContentCheck() {
  const [status, setStatus] = useState<"loading" | "done">("loading");
  const [phase, setPhase] = useState("Starting…");
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [totals, setTotals] = useState<Totals>({ questions: 0, visuals: 0, steps: 0 });
  const [failures, setFailures] = useState<ContentFailure[]>([]);
  const [job, setJob] = useState<ProbeJob | null>(null);
  const [elapsed, setElapsed] = useState<number | null>(null);

  const failuresRef = useRef<ContentFailure[]>([]);
  const waiters = useRef(new Map<number, () => void>());

  const record = useCallback((f: ContentFailure) => {
    failuresRef.current.push(f);
  }, []);
  const onProbeError = useCallback(
    (slug: string, vi: number, type: string, si: number, err: unknown) => record({ slug, visual: vi, type, step: si, error: `render: ${errorMessage(err)}` }),
    [record],
  );
  const onProbeDone = useCallback((id: number) => {
    const w = waiters.current.get(id);
    if (w) {
      waiters.current.delete(id);
      // error boundaries have already committed (componentDidCatch runs before passive effects);
      // resolve in a microtask — rAF/timers are throttled in background tabs
      queueMicrotask(w);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const started = performance.now();
    window.__contentCheck = { done: false, failures: [] };
    failuresRef.current = [];
    const pending = waiters.current;
    let jobSeq = 0;

    const renderOffscreen = (question: Question) =>
      new Promise<void>((resolve) => {
        const id = ++jobSeq;
        pending.set(id, resolve);
        setJob({ id, question });
      });

    const publish = (done: boolean, t: Totals) => {
      const list = [...failuresRef.current];
      setFailures(list);
      setTotals(t);
      window.__contentCheck = { done, failures: list, totals: t };
    };

    (async () => {
      const t: Totals = { questions: 0, visuals: 0, steps: 0 };
      try {
        await Promise.resolve();
        if (cancelled) return;
        let questions: (Question | null)[];
        if (new URLSearchParams(window.location.search).get("source") === "fixtures") {
          // self-test: run the same checks against the /dev/visuals fixtures (no API needed)
          setPhase("Loading gallery fixtures…");
          const { FIXTURES } = await import("../visuals/fixtures");
          questions = FIXTURES.map(
            (f) =>
              ({
                slug: `fixture-${f.id}`,
                title: f.title,
                visuals: f.visuals,
                solution: { code: f.code ? [{ language: "javascript", code: f.code }] : [] },
              }) as unknown as Question,
          );
        } else {
          setPhase("Fetching question list…");
          const summaries: QuestionSummary[] = [];
          let page = 1;
          let totalPages = 1;
          do {
            const res = await getJson<Paginated<QuestionSummary>>(`/api/questions?limit=100&page=${page}`);
            summaries.push(...(Array.isArray(res.items) ? res.items : []));
            totalPages = Number(res.totalPages) || 1;
            page += 1;
          } while (page <= totalPages && page <= 200 && !cancelled);
          if (cancelled) return;

          setPhase(`Fetching ${summaries.length} questions…`);
          setProgress({ done: 0, total: summaries.length });
          let fetched = 0;
          questions = await mapLimit(summaries, 6, async (s) => {
            try {
              const d = await getJson<QuestionDetailResponse>(`/api/questions/${encodeURIComponent(s.slug)}`);
              return d.question;
            } catch (err) {
              record({ slug: s.slug, visual: null, type: "fetch", step: null, error: errorMessage(err) });
              return null;
            } finally {
              fetched += 1;
              if (!cancelled) setProgress({ done: fetched, total: summaries.length });
            }
          });
        }
        if (cancelled) return;

        setPhase("Checking visuals…");
        let i = 0;
        for (const q of questions) {
          i += 1;
          if (cancelled) return;
          setProgress({ done: i, total: questions.length });
          if (!q) continue;
          t.questions += 1;
          const visuals = Array.isArray(q.visuals) ? q.visuals : [];
          if (visuals.length === 0) record({ slug: q.slug, visual: null, type: "—", step: null, error: "question has no visuals" });
          const js = q.solution?.code?.find((c) => c.language === "javascript")?.code;
          const jsLines = js ? js.split("\n").length : 0;

          for (const [vi, v] of visuals.entries()) {
            t.visuals += 1;
            if (!v || !KNOWN.has(v.type)) {
              record({ slug: q.slug, visual: vi, type: String((v as { type?: unknown })?.type), step: null, error: "unknown visual type" });
              continue;
            }
            const n = stepCount(v);
            t.steps += Math.max(1, n);
            if (v.type === "diagram") {
              for (const [fi, f] of (Array.isArray(v.frames) ? v.frames : []).entries()) {
                const err = await parseMermaid(f?.mermaid ?? "");
                if (err) record({ slug: q.slug, visual: vi, type: v.type, step: fi, error: `mermaid: ${err}` });
              }
              continue;
            }
            for (let si = 0; si < n; si++) {
              const line = stepMeta(v, si).codeLine;
              if (line === undefined) continue;
              if (jsLines === 0) record({ slug: q.slug, visual: vi, type: v.type, step: si, error: `codeLine ${line} but the question has no javascript solution` });
              else if (line < 1 || line > jsLines) record({ slug: q.slug, visual: vi, type: v.type, step: si, error: `codeLine ${line} > ${jsLines} lines of javascript` });
            }
          }
          await renderOffscreen(q);
          if (i % 10 === 0) publish(false, { ...t });
        }
      } catch (err) {
        record({ slug: "(api)", visual: null, type: "fetch", step: null, error: errorMessage(err) });
      }
      if (cancelled) return;
      setJob(null);
      setPhase("Done");
      setElapsed(Math.round(performance.now() - started));
      publish(true, { ...t });
      setStatus("done");
    })();

    return () => {
      cancelled = true;
      for (const w of pending.values()) w();
      pending.clear();
    };
  }, [record]);

  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <main data-status={status} className="mx-auto w-full max-w-6xl xl:max-w-7xl 2xl:max-w-[90rem] px-4 sm:px-6 sm:py-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand">Dev</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Content check</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Fetches every question from the API, parses each Mermaid frame, renders every step of every other visual offscreen inside
            error boundaries and checks <code className="font-mono text-xs">codeLine</code> against the JavaScript solution. Add{" "}
            <code className="font-mono text-xs">?source=fixtures</code> to self-test against the gallery fixtures without the API.
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          disabled={status !== "done"}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-sm font-medium shadow-xs transition-colors hover:bg-surface-2 disabled:opacity-50"
        >
          <RefreshCw aria-hidden className="size-4" /> Re-run
        </button>
      </header>

      <section aria-live="polite" className="mt-6 rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-medium">
          {status === "loading" ? (
            <LoaderCircle aria-hidden className="size-4 animate-spin text-brand motion-reduce:animate-none" />
          ) : failures.length ? (
            <CircleAlert aria-hidden className="size-4 text-viz-danger" />
          ) : (
            <CircleCheck aria-hidden className="size-4 text-viz-success" />
          )}
          <span>
            {status === "loading"
              ? phase
              : failures.length
                ? `${failures.length} failure${failures.length === 1 ? "" : "s"}`
                : "All visuals rendered without errors"}
          </span>
          {elapsed !== null ? <span className="ml-auto font-mono text-xs text-muted">{(elapsed / 1000).toFixed(1)} s</span> : null}
        </div>
        {status === "loading" ? (
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-brand transition-[width] duration-200" style={{ width: `${pct}%` }} />
          </div>
        ) : null}
        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Questions", totals.questions],
            ["Visuals", totals.visuals],
            ["Steps checked", totals.steps],
            ["Failures", failures.length],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl border border-border bg-surface-2/50 px-3 py-2">
              <dt className="text-[11px] font-medium uppercase tracking-wider text-muted">{k}</dt>
              <dd className="mt-0.5 font-mono text-xl font-semibold tabular-nums" data-testid={`total-${String(k).toLowerCase().replace(/\s+/g, "-")}`}>
                {v}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-6" aria-labelledby="failures-h">
        <h2 id="failures-h" className="text-sm font-semibold uppercase tracking-wider text-muted">
          Failures
        </h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-border">
          <table data-testid="content-check-failures" className="w-full min-w-[40rem] border-collapse text-sm">
            <thead className="bg-surface-2 text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Slug
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Visual
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Type
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Step
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Error
                </th>
              </tr>
            </thead>
            <tbody>
              {failures.map((f, i) => (
                <tr key={i} className="border-t border-border align-top">
                  <td className="px-3 py-2 font-mono text-xs">
                    {f.slug.startsWith("(") ? (
                      f.slug
                    ) : (
                      <a href={`/questions/${encodeURIComponent(f.slug)}`} className="text-brand underline-offset-2 hover:underline">
                        {f.slug}
                      </a>
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs tabular-nums">{f.visual ?? "—"}</td>
                  <td className="px-3 py-2 font-mono text-xs">{f.type}</td>
                  <td className="px-3 py-2 font-mono text-xs tabular-nums">{f.step ?? "—"}</td>
                  <td className="break-words px-3 py-2 font-mono text-xs text-viz-danger">{f.error}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {failures.length === 0 ? (
            <p className="border-t border-border px-3 py-4 text-center text-sm text-muted">
              {status === "loading" ? "No failures so far." : "No failures."}
            </p>
          ) : null}
        </div>
      </section>

      {/* offscreen render target */}
      <div aria-hidden inert className="pointer-events-none fixed top-0 -left-[10000px] w-[960px] opacity-0">
        {job ? <Probe key={job.id} job={job} onError={onProbeError} onDone={onProbeDone} /> : null}
      </div>
    </main>
  );
}
