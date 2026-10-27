"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  BarChart3,
  Bookmark,
  CircleCheck,
  Flame,
  LayoutGrid,
  LogIn,
  Map as MapIcon,
  Mic,
  Play,
  RotateCcw,
  ServerCrash,
  Target,
  Trophy,
} from "lucide-react";
import type { ProgressStats, Roadmap, User } from "@/lib/types";
import { api, getErrorMessage } from "@/lib/api";
import { useApiQuery } from "@/lib/hooks";
import { formatNumber } from "@/lib/utils";
import { useAuth, useProgress, useProgressStats } from "@/components/providers";
import { PageHeader } from "@/components/layout/page";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ActivityHeatmap } from "./activity-heatmap";
import { DashboardCard, StatTile } from "./dashboard-card";
import { BookmarkList, ContinueList, NextRoadmapDay, RecentMocks, RecentQuizzes } from "./dashboard-lists";
import { DashboardSkeleton } from "./dashboard-skeleton";
import { DifficultyBreakdown, TopicBreakdown } from "./progress-breakdowns";
import type { QuestionIndex } from "./question-index";

export interface DashboardViewProps {
  questionIndex: QuestionIndex;
  roadmap: Roadmap | null;
}

const LOGIN_HREF = "/login?next=%2Fdashboard";

/** /dashboard — requires login (redirects to /login?next=/dashboard). */
export function DashboardView(props: DashboardViewProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace(LOGIN_HREF);
  }, [loading, user, router]);

  if (loading) return <DashboardSkeleton />;
  if (!user) {
    return (
      <div className="py-10">
        <EmptyState
          icon={LogIn}
          title="Log in to see your dashboard"
          description="Your solved questions, streak, quiz scores and mock interviews live here. Taking you to the log-in page…"
          action={
            <ButtonLink href={LOGIN_HREF} size="sm">
              Log in
            </ButtonLink>
          }
        />
      </div>
    );
  }
  return <DashboardContent user={user} {...props} />;
}

function greeting(stats: ProgressStats) {
  const { current } = stats.streak;
  if (stats.totals.solved === 0 && stats.quiz.attempts === 0) return "Let's get your first question solved. Small steps every day add up fast.";
  if (current >= 7) return `${current}-day streak — that's real momentum. Keep it alive today.`;
  if (current >= 2) return `You're on a ${current}-day streak. One more question keeps it going.`;
  if (current === 1) return "You practiced today. Come back tomorrow to start a streak.";
  return "Pick up where you left off — even 20 minutes today counts.";
}

function DashboardContent({ user, questionIndex, roadmap }: DashboardViewProps & { user: User }) {
  const { stats, error, reload } = useProgressStats();
  const progress = useProgress();
  const quizzes = useApiQuery(`quiz-attempts:${user.id}`, (signal) => api.quiz.attempts({ signal }));
  const mocks = useApiQuery(`mock-sessions:${user.id}`, (signal) => api.mockSessions.list({ signal }));

  if (!stats) {
    if (error) {
      return (
        <div className="py-10">
          <EmptyState
            icon={ServerCrash}
            title="Your dashboard couldn't load"
            description={getErrorMessage(error)}
            action={
              <Button size="sm" variant="outline" onClick={reload} leftIcon={<RotateCcw aria-hidden />}>
                Try again
              </Button>
            }
          />
        </div>
      );
    }
    return <DashboardSkeleton />;
  }

  const firstName = user.name.trim().split(/\s+/)[0] || user.name;
  const list = Object.values(progress.progress);
  const byRecent = (a: { updatedAt: string }, b: { updatedAt: string }) => b.updatedAt.localeCompare(a.updatedAt);
  const continueItems = list.filter((p) => p.status === "attempted").sort(byRecent).slice(0, 5);
  const bookmarks = list.filter((p) => p.bookmarked).sort(byRecent);
  const topicTitles = Object.fromEntries(stats.byTopic.map((t) => [t.topic, t.title]));
  const { solved, attempted, questions } = stats.totals;
  const continueHref = continueItems[0] ? `/questions/${continueItems[0].slug}` : "/questions";

  return (
    <div className="pb-12">
      <PageHeader
        eyebrow="Dashboard"
        title={`Welcome back, ${firstName}`}
        description={greeting(stats)}
        actions={
          <>
            <ButtonLink href={continueHref} leftIcon={<Play aria-hidden />}>
              {continueItems[0] ? "Continue practicing" : "Practice questions"}
            </ButtonLink>
            <ButtonLink href="/mock-interview" variant="outline" leftIcon={<Mic aria-hidden />}>
              Mock interview
            </ButtonLink>
          </>
        }
      />

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatTile icon={<CircleCheck aria-hidden />} label="Solved" value={formatNumber(solved)} sub={`of ${formatNumber(questions)} · ${attempted} in progress`} href="/questions?status=solved">
          <ProgressBar value={solved} max={Math.max(1, questions)} label="Questions solved" size="xs" />
        </StatTile>
        <StatTile
          icon={<Flame aria-hidden />}
          label="Current streak"
          value={
            <>
              {stats.streak.current}
              <span className="ml-1 text-sm font-medium text-muted">{stats.streak.current === 1 ? "day" : "days"}</span>
            </>
          }
          sub={`Longest: ${stats.streak.longest} ${stats.streak.longest === 1 ? "day" : "days"}`}
        />
        <StatTile
          icon={<Target aria-hidden />}
          label="Quiz average"
          value={stats.quiz.attempts > 0 ? `${Math.round(stats.quiz.avgPct)}%` : "—"}
          sub={stats.quiz.attempts > 0 ? `${stats.quiz.attempts} ${stats.quiz.attempts === 1 ? "quiz" : "quizzes"} taken` : "No quizzes yet"}
          href="/quiz"
        />
        <StatTile
          icon={<Mic aria-hidden />}
          label="Mock interviews"
          value={formatNumber(stats.mock.sessions)}
          sub={
            stats.mock.sessions > 0
              ? `avg ${stats.mock.avgRating.toFixed(1)}/5 · ${formatNumber(Math.round(stats.mock.totalMinutes))} min`
              : "None yet"
          }
          href="/mock-interview"
        />
        <StatTile
          icon={<MapIcon aria-hidden />}
          label="Roadmap"
          value={
            stats.roadmap.totalDays > 0 ? (
              <>
                {stats.roadmap.completedDays}
                <span className="text-sm font-medium text-muted">/{stats.roadmap.totalDays}</span>
              </>
            ) : (
              "—"
            )
          }
          sub="days complete"
          href="/roadmap"
        >
          {stats.roadmap.totalDays > 0 && (
            <ProgressBar value={stats.roadmap.completedDays} max={stats.roadmap.totalDays} label="Roadmap days complete" size="xs" />
          )}
        </StatTile>
      </dl>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="min-w-0 space-y-4 lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <DashboardCard id="dash-continue" title="Continue where you left off" icon={<Play aria-hidden />}>
              <ContinueList items={continueItems} index={questionIndex} />
            </DashboardCard>
            <DashboardCard id="dash-roadmap" title="Next on your roadmap" icon={<MapIcon aria-hidden />} href="/roadmap" hrefLabel="Roadmap">
              <NextRoadmapDay
                roadmap={roadmap}
                topicTitles={topicTitles}
                doneDays={progress.roadmapDays}
                status={progress.status}
                onToggle={(d) => void progress.toggleRoadmapDay(d)}
              />
            </DashboardCard>
          </div>

          <DashboardCard
            id="dash-activity"
            title="Activity"
            icon={<Activity aria-hidden />}
            description="Questions, quizzes and mock interviews per day over the last 17 weeks (UTC)."
          >
            <ActivityHeatmap activity={stats.activity} />
          </DashboardCard>

          <DashboardCard id="dash-topics" title="Progress by topic" icon={<LayoutGrid aria-hidden />} href="/topics" hrefLabel="All topics">
            <TopicBreakdown byTopic={stats.byTopic} />
          </DashboardCard>
        </div>

        <div className="min-w-0 space-y-4">
          <DashboardCard id="dash-difficulty" title="Solved by difficulty" icon={<BarChart3 aria-hidden />}>
            <DifficultyBreakdown stats={stats} />
          </DashboardCard>

          <DashboardCard id="dash-quizzes" title="Recent quizzes" icon={<Trophy aria-hidden />} href="/quiz" hrefLabel="All quizzes">
            <RecentQuizzes items={quizzes.data?.items} loading={quizzes.loading} error={quizzes.error} />
          </DashboardCard>

          <DashboardCard id="dash-mocks" title="Mock interviews" icon={<Mic aria-hidden />} href="/mock-interview" hrefLabel="New session">
            <RecentMocks items={mocks.data?.items} loading={mocks.loading} error={mocks.error} />
          </DashboardCard>

          <DashboardCard
            id="dash-bookmarks"
            title={
              <>
                Bookmarks
                {bookmarks.length > 0 && <span className="text-sm font-normal tabular-nums text-muted">{bookmarks.length}</span>}
              </>
            }
            icon={<Bookmark aria-hidden />}
            href={bookmarks.length > 6 ? "/questions?status=bookmarked" : undefined}
          >
            <BookmarkList items={bookmarks.slice(0, 6)} index={questionIndex} status={progress.status} />
          </DashboardCard>
        </div>
      </div>
    </div>
  );
}
