"use client";

import { useState } from "react";
import { Eye, Mic, NotebookPen, Star, Timer } from "lucide-react";
import type { MockConfig, Question } from "@/lib/types";
import { api, getErrorMessage } from "@/lib/api";
import { KINDS, KIND_LABELS } from "@/lib/constants";
import { useAuth, useToast } from "@/components/providers";
import { PageHeader } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { DEFAULT_MOCK_CONFIG, KIND_MINUTES } from "./constants";
import { MockHistory } from "./mock-history";
import { MockSessionView, type MockRunItem } from "./mock-session";
import { MockSetup, type TopicOption } from "./mock-setup";
import { MockSummary, type MockResult, type SaveState } from "./mock-summary";
import { useLeaveGuard } from "./use-leave-guard";

type Phase = "setup" | "running" | "summary";

interface RunningSession {
  id: number;
  questions: Question[];
  startedAt: number;
}

const LEAVE_MESSAGE = "Leave the mock interview? Your answers and timings for this session will be lost.";

function scrollTop() {
  window.scrollTo({ top: 0, behavior: "auto" });
}

/**
 * /mock-interview: setup → timed session → summary (saved via POST /api/mock-sessions when logged in).
 * Keyed by the ?topics= value in the page, so following a "practice this topic" link starts fresh.
 */
export function MockInterview({ topics, initialTopics }: { topics: TopicOption[]; initialTopics: string[] }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [phase, setPhase] = useState<Phase>("setup");
  const [config, setConfig] = useState<MockConfig>({ ...DEFAULT_MOCK_CONFIG, topics: initialTopics });
  const [setupKey, setSetupKey] = useState(0);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [session, setSession] = useState<RunningSession | null>(null);
  const [result, setResult] = useState<MockResult | null>(null);
  const [save, setSave] = useState<SaveState>({ status: "idle" });
  const [historyVersion, setHistoryVersion] = useState(0);

  useLeaveGuard(phase === "running", LEAVE_MESSAGE);

  const topicTitles: Record<string, string> = Object.fromEntries(topics.map((t) => [t.slug, t.title]));

  async function start(cfg: MockConfig) {
    setConfig(cfg);
    setStarting(true);
    setStartError(null);
    try {
      const { items } = await api.questions.random({
        count: cfg.count,
        kinds: cfg.kinds.length === KINDS.length ? undefined : cfg.kinds,
        topics: cfg.topics,
        difficulty: cfg.difficulty === "mixed" ? undefined : [cfg.difficulty],
      });
      if (items.length === 0) {
        setStartError("No questions match these settings yet. Add more topics or question types and try again.");
        setPhase("setup");
        return;
      }
      if (items.length < cfg.count) {
        toast({
          variant: "info",
          title: `Only ${items.length} ${items.length === 1 ? "question matches" : "questions match"} your settings`,
          description: "The interview uses all of them. Widen the topics or types for a longer session.",
        });
      }
      setSession((prev) => ({ id: (prev?.id ?? 0) + 1, questions: items, startedAt: Date.now() }));
      setResult(null);
      setSave({ status: "idle" });
      setPhase("running");
      scrollTop();
    } catch (e) {
      setStartError(getErrorMessage(e));
      setPhase("setup");
    } finally {
      setStarting(false);
    }
  }

  async function persist(r: MockResult, cfg: MockConfig) {
    setSave({ status: "saving" });
    try {
      await api.mockSessions.create({
        config: cfg,
        durationSec: Math.round(r.durationSec),
        items: r.items.map((i) => ({
          slug: i.question.slug,
          selfRating: i.rating,
          timeSpentSec: i.timeSec,
          revealed: i.revealed,
        })),
      });
      setSave({ status: "saved" });
      setHistoryVersion((v) => v + 1);
    } catch (e) {
      setSave({ status: "error", message: getErrorMessage(e) });
    }
  }

  function finish(items: MockRunItem[], endedEarly: boolean) {
    const r: MockResult = {
      items,
      total: session?.questions.length ?? items.length,
      durationSec: items.reduce((s, i) => s + i.timeSec, 0),
      endedEarly,
    };
    setResult(r);
    setPhase("summary");
    scrollTop();
    if (user) void persist(r, config);
    else setSave({ status: "anonymous" });
  }

  function discard() {
    setSession(null);
    setPhase("setup");
    scrollTop();
    toast({ title: "Interview discarded", description: "Nothing was rated, so nothing was saved." });
  }

  if (phase === "running" && session) {
    return (
      <div className="pb-12 pt-3">
        <h1 className="sr-only">Mock interview in progress</h1>
        <MockSessionView
          key={session.id}
          questions={session.questions}
          topicTitles={topicTitles}
          startedAt={session.startedAt}
          onFinish={finish}
          onDiscard={discard}
        />
      </div>
    );
  }

  if (phase === "summary" && result) {
    return (
      <div className="pb-12 pt-5 sm:pt-6">
        <h1 className="sr-only">Mock interview summary</h1>
        <MockSummary
          result={result}
          topicTitles={topicTitles}
          save={save}
          onRetrySave={() => void persist(result, config)}
          onRestart={() => void start(config)}
          starting={starting}
          onNewSettings={() => {
            setPhase("setup");
            setSetupKey((k) => k + 1);
            scrollTop();
          }}
        />
      </div>
    );
  }

  return (
    <div className="pb-12">
      <PageHeader
        eyebrow="Mock interview"
        title="Practice under real interview pressure"
        description="Random questions, a timer per question, private scratch notes, then the model answer with its visual walkthrough. Rate yourself honestly and we'll point out your weakest topics."
      />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <MockSetup
          key={setupKey}
          topics={topics}
          initial={config}
          starting={starting}
          error={startError}
          onStart={(cfg) => void start(cfg)}
        />
        <aside className="space-y-6">
          <HowItWorks />
          <MockHistory version={historyVersion} />
        </aside>
      </div>
    </div>
  );
}

function HowItWorks() {
  const steps = [
    { icon: Timer, title: "Answer against the clock", text: KINDS.map((k) => `${KIND_LABELS[k]} ${KIND_MINUTES[k]}m`).join(" · ") },
    { icon: NotebookPen, title: "Think on paper", text: "Private scratch notes per question — outline before you speak." },
    { icon: Eye, title: "Reveal the model answer", text: "Summary, the points interviewers listen for, and the visual walkthrough." },
    { icon: Star, title: "Rate yourself 1–5", text: "Required before moving on. Your summary shows where to study next." },
  ];
  return (
    <Card className="p-4">
      <p className="flex items-center gap-2 font-semibold">
        <Mic className="size-4 text-brand" aria-hidden /> How it works
      </p>
      <ol className="mt-3 space-y-3">
        {steps.map(({ icon: Icon, title, text }, i) => (
          <li key={title} className="flex gap-3">
            <span className="relative grid size-8 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand">
              <Icon className="size-4" aria-hidden />
              <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-brand text-[10px] font-semibold text-brand-foreground">
                {i + 1}
              </span>
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium">{title}</p>
              <p className="text-xs leading-relaxed text-muted">{text}</p>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}
