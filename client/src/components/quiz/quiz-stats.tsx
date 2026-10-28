"use client";

import { createContext, useContext, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Award, LogIn, Target, Trophy } from "lucide-react";
import type { ProgressStats } from "@/lib/types";
import { useAuth, useProgressStats, useLanguage } from "@/components/providers";
import { ProgressRing } from "@/components/ui/progress-ring";
import { Skeleton } from "@/components/ui/skeleton";
import { toneText } from "@/components/ui/badge";
import { scoreTone } from "./score";

interface QuizStatsValue {
  loggedIn: boolean;
  loading: boolean;
  quiz: ProgressStats["quiz"] | null;
}

const QuizStatsContext = createContext<QuizStatsValue>({ loggedIn: false, loading: false, quiz: null });

/** Loads GET /api/progress/stats once for the /quiz page (best score per topic). */
export function QuizStatsProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { stats, loading } = useProgressStats();
  const value: QuizStatsValue = {
    loggedIn: Boolean(user),
    loading: authLoading || (Boolean(user) && loading && !stats),
    quiz: stats?.quiz ?? null,
  };
  return <QuizStatsContext.Provider value={value}>{children}</QuizStatsContext.Provider>;
}

/** Best score badge on a quiz topic card. Falls back to a "Start" hint when logged out or never attempted. */
export function QuizBestScore({ topic, title }: { topic: string; title: string }) {
  const { loggedIn, loading, quiz } = useContext(QuizStatsContext);
  const { lang } = useLanguage();
  if (loading) return <Skeleton className="h-9 w-32 rounded-lg" />;
  const best = loggedIn ? quiz?.bestByTopic.find((b) => b.topic === topic) : undefined;
  if (!best) {
    return (
      <span className="inline-flex h-9 items-center gap-1.5 text-sm font-medium text-brand">
        {loggedIn
          ? (lang === "bn" ? "এখনও চেষ্টা করা হয়নি" : "Not attempted yet")
          : (lang === "bn" ? "কুইজ শুরু করুন" : "Start quiz")}
        <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
      </span>
    );
  }
  const tone = scoreTone(best.bestPct);
  return (
    <div className="inline-flex items-center gap-2.5">
      <ProgressRing value={best.bestPct} size={36} thickness={4} tone={tone} decorative>
        <Trophy className="size-3.5" style={toneText(tone)} aria-hidden />
      </ProgressRing>
      <span className="text-sm leading-tight">
        <span className="block font-semibold tabular-nums" style={toneText(tone)}>
          {lang === "bn" ? `সেরা ${best.bestPct}%` : `Best ${best.bestPct}%`}
        </span>
        <span className="block text-xs text-muted">
          {lang === "bn" ? `${best.attempts} বার চেষ্টা` : `${best.attempts} ${best.attempts === 1 ? "attempt" : "attempts"}`}
        </span>
      </span>
      <span className="sr-only">
        Your best score on {title} is {best.bestPct}% over {best.attempts} attempts.
      </span>
    </div>
  );
}

/** Personal quiz summary shown under the /quiz header. */
export function QuizOverview() {
  const { loggedIn, loading, quiz } = useContext(QuizStatsContext);
  const { lang } = useLanguage();
  if (loading) return <Skeleton className="h-[72px] w-full max-w-xl rounded-xl" />;
  if (!loggedIn) {
    return (
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
        <LogIn className="size-4" aria-hidden />
        {lang === "bn" ? "অ্যাকাউন্ট ছাড়াও কুইজ দেওয়া যায়।" : "Quizzes work without an account."}
        <Link href="/login?next=%2Fquiz" className="font-medium text-brand hover:underline">
          {lang === "bn" ? "লগইন করুন" : "Log in"}
        </Link>
        {lang === "bn" ? "প্রতিটি টপিকের সেরা স্কোর সেভ রাখতে।" : "to keep your best score per topic."}
      </p>
    );
  }
  if (!quiz || quiz.attempts === 0) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted">
        <Target className="size-4 text-brand" aria-hidden />
        {lang === "bn"
          ? "নিচে একটি টপিক নির্বাচন করুন। আপনার স্কোর এখানে এবং আপনার ড্যাশবোর্ডে সংরক্ষিত হবে।"
          : "Pick a topic below. Your scores will show up here and on your dashboard."}
      </p>
    );
  }
  const best = [...quiz.bestByTopic].sort((a, b) => b.bestPct - a.bestPct)[0];
  const avgTone = scoreTone(quiz.avgPct);
  return (
    <dl className="grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-3">
      <div className="rounded-xl border border-border bg-surface px-4 py-3">
        <dt className="text-xs text-muted">{lang === "bn" ? "মোট কুইজ সম্পন্ন" : "Quizzes taken"}</dt>
        <dd className="mt-1 text-xl font-semibold tabular-nums tracking-tight">{quiz.attempts}</dd>
      </div>
      <div className="rounded-xl border border-border bg-surface px-4 py-3">
        <dt className="text-xs text-muted">{lang === "bn" ? "গড় স্কোর" : "Average score"}</dt>
        <dd className="mt-1 text-xl font-semibold tabular-nums tracking-tight" style={toneText(avgTone)}>
          {Math.round(quiz.avgPct)}%
        </dd>
      </div>
      {best && (
        <div className="col-span-2 rounded-xl border border-border bg-surface px-4 py-3 sm:col-span-1">
          <dt className="flex items-center gap-1 text-xs text-muted">
            <Award className="size-3.5" aria-hidden /> {lang === "bn" ? "সেরা পারফর্ম করা টপিক" : "Strongest topic"}
          </dt>
          <dd className="mt-1 truncate text-sm font-semibold">
            {best.title} <span className="tabular-nums text-muted">· {best.bestPct}%</span>
          </dd>
        </div>
      )}
    </dl>
  );
}
