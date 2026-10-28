"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Shuffle } from "lucide-react";
import type { QuizAttemptInput, QuizQuestion, QuizResponse } from "@/lib/types";
import { api, getErrorMessage } from "@/lib/api";
import { animationsReduced } from "@/lib/motion-preference";
import { useAuth, useProgressStats, useToast } from "@/components/providers";
import { Badge } from "@/components/ui/badge";
import { QuizProgress, QuizQuestionCard, type QuizSelection } from "./quiz-question";
import { QuizResults, type SubmitState } from "./quiz-results";
import { clearPendingAttempt, stashPendingAttempt, takePendingAttempt } from "./pending-attempt";

function shuffled<T>(list: T[]): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

// the app's "Reduce animations" choice, not the OS setting (see lib/motion-preference.ts)
const prefersReducedMotion = animationsReduced;

/** Scroll so `el` sits just below the sticky header when it is out of view. */
function bringIntoView(el: HTMLElement | null) {
  if (!el) return;
  const rect = el.getBoundingClientRect();
  if (rect.top >= 64 && rect.top < window.innerHeight * 0.6) return;
  window.scrollTo({ top: window.scrollY + rect.top - 80, behavior: prefersReducedMotion() ? "auto" : "smooth" });
}

function isTypingTarget(el: EventTarget | null) {
  if (!(el instanceof HTMLElement)) return false;
  return el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName);
}

type FocusTarget = "question" | "continue" | "results" | null;

/**
 * Runs a topic quiz: one question at a time with instant feedback, keyboard 1–9 / Enter,
 * then grades via POST /api/quiz/attempts (saved when logged in) and shows a full review.
 */
export function QuizRunner({ quiz, shuffledFromUrl = false }: { quiz: QuizResponse; shuffledFromUrl?: boolean }) {
  const topic = quiz.topic;
  const { user, loading: authLoading } = useAuth();
  const { stats } = useProgressStats();
  const { toast } = useToast();

  const [items, setItems] = useState<QuizQuestion[]>(quiz.items);
  const [answers, setAnswers] = useState<QuizSelection[]>(() => quiz.items.map(() => null));
  const [index, setIndex] = useState(0);
  const [finished, setFinished] = useState(false);
  const [durationSec, setDurationSec] = useState(0);
  const [submit, setSubmit] = useState<SubmitState>({ status: "idle" });
  const [round, setRound] = useState(0);
  const [retrying, setRetrying] = useState(false);
  const [isShuffled, setIsShuffled] = useState(shuffledFromUrl);
  const [announcement, setAnnouncement] = useState("");

  const startRef = useRef(0);
  const roundRef = useRef(0);
  const focusRef = useRef<FocusTarget>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const continueRef = useRef<HTMLButtonElement>(null);
  const resultsRef = useRef<HTMLHeadingElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const lastInputRef = useRef<QuizAttemptInput | null>(null);

  // Start the clock for each round.
  useEffect(() => {
    startRef.current = Date.now();
  }, [round]);

  // Move focus after state changes driven by the user (never on first render).
  useEffect(() => {
    const target = focusRef.current;
    if (!target) return;
    focusRef.current = null;
    if (target === "continue") {
      const btn = continueRef.current;
      btn?.focus({ preventScroll: true });
      btn?.scrollIntoView({ block: "nearest", behavior: prefersReducedMotion() ? "auto" : "smooth" });
    } else if (target === "question") {
      headingRef.current?.focus({ preventScroll: true });
      bringIntoView(topRef.current);
    } else {
      resultsRef.current?.focus({ preventScroll: true });
      bringIntoView(topRef.current);
    }
  });

  // An anonymous attempt that was stashed before logging in: save it now.
  useEffect(() => {
    if (authLoading || !user) return;
    const pending = takePendingAttempt();
    if (!pending) return;
    api.quiz.submitAttempt(pending.input).then(
      (res) => {
        if (!res.saved) return;
        toast({
          variant: "success",
          title: "Saved your last quiz score",
          description: `${res.score}/${res.total} (${res.pct}%) on ${pending.topicTitle} is now on your dashboard.`,
          action: { label: "View dashboard", href: "/dashboard" },
        });
      },
      (e: unknown) => console.warn("[quiz] could not save the pending attempt", e),
    );
  }, [authLoading, user, toast]);

  const send = useCallback(
    async (input: QuizAttemptInput) => {
      const myRound = roundRef.current;
      lastInputRef.current = input;
      const previousBest = stats?.quiz.bestByTopic.find((b) => b.topic === input.topic)?.bestPct ?? null;
      setSubmit({ status: "saving" });
      try {
        const result = await api.quiz.submitAttempt(input);
        if (roundRef.current !== myRound) return;
        if (result.saved) clearPendingAttempt();
        else stashPendingAttempt(input, topic.title);
        setSubmit({ status: "done", result, previousBest });
      } catch (e) {
        if (roundRef.current !== myRound) return;
        setSubmit({ status: "error", message: getErrorMessage(e) });
      }
    },
    [stats, topic.title],
  );

  const current = items[index];
  const selected = answers[index] ?? null;
  const answered = selected !== null;

  const choose = useCallback(
    (option: number) => {
      if (finished || answers[index] !== null || !current) return;
      setAnswers((prev) => prev.map((a, j) => (j === index ? option : a)));
      focusRef.current = "continue";
      if (option === -1) {
        setAnnouncement(`Skipped. The answer is option ${current.answer + 1}: ${current.options[current.answer]}.`);
      } else if (option === current.answer) {
        setAnnouncement("Correct!");
      } else {
        setAnnouncement(`Not quite. The answer is option ${current.answer + 1}: ${current.options[current.answer]}.`);
      }
    },
    [finished, answers, index, current],
  );

  const advance = useCallback(() => {
    if (finished || answers[index] === null) return;
    setAnnouncement("");
    if (index < items.length - 1) {
      focusRef.current = "question";
      setIndex(index + 1);
      return;
    }
    setDurationSec(Math.max(0, Math.round((Date.now() - startRef.current) / 1000)));
    setFinished(true);
    focusRef.current = "results";
    void send({
      topic: topic.slug,
      answers: items.map((q, i) => ({ questionId: q.id, selected: answers[i] ?? -1 })),
    });
  }, [finished, answers, index, items, send, topic.slug]);

  // Keyboard: 1–9 picks an option, Enter continues.
  useEffect(() => {
    if (finished) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return;
      if (document.querySelector('[role="dialog"]')) return;
      if (/^[1-9]$/.test(e.key)) {
        const n = Number(e.key) - 1;
        if (!answered && current && n < current.options.length) {
          e.preventDefault();
          choose(n);
        }
        return;
      }
      if (e.key === "Enter" && answered) {
        // a focused button/link handles Enter itself
        if (e.target instanceof HTMLElement && e.target.closest("button, a, [role='button']")) return;
        e.preventDefault();
        advance();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [finished, answered, current, choose, advance]);

  async function retry() {
    setRetrying(true);
    let next: QuizQuestion[] = [];
    try {
      next = (await api.quiz.get(topic.slug, { shuffle: true })).items;
    } catch {
      // offline or API hiccup: shuffle what we have
    }
    if (next.length === 0) next = shuffled(items);
    roundRef.current += 1;
    setItems(next);
    setAnswers(next.map(() => null));
    setIndex(0);
    setFinished(false);
    setSubmit({ status: "idle" });
    setDurationSec(0);
    setAnnouncement("");
    setRound((r) => r + 1);
    setIsShuffled(true);
    setRetrying(false);
    focusRef.current = "question";
    try {
      window.history.replaceState(null, "", `${window.location.pathname}?shuffle=true`);
    } catch {
      // ignore
    }
  }

  function resubmit() {
    if (lastInputRef.current) void send(lastInputRef.current);
  }

  return (
    <div ref={topRef} className="scroll-mt-20">
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>

      {finished ? (
        <QuizResults
          topic={topic}
          items={items}
          answers={answers}
          durationSec={durationSec}
          submit={submit}
          loggedIn={Boolean(user)}
          retrying={retrying}
          onRetry={() => void retry()}
          onResubmit={resubmit}
          headingRef={resultsRef}
        />
      ) : current ? (
        <div className="space-y-4">
          <div className="flex items-end gap-4">
            <div className="min-w-0 flex-1">
              <QuizProgress items={items} answers={answers} index={index} />
            </div>
            {isShuffled && (
              <Badge icon={<Shuffle aria-hidden />} className="shrink-0">
                Shuffled
              </Badge>
            )}
          </div>
          <motion.div
            key={`${round}-${index}`}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <QuizQuestionCard
              item={current}
              index={index}
              total={items.length}
              selected={selected}
              onSelect={choose}
              onSkip={() => choose(-1)}
              onContinue={advance}
              headingRef={headingRef}
              continueRef={continueRef}
            />
          </motion.div>
        </div>
      ) : null}
    </div>
  );
}
