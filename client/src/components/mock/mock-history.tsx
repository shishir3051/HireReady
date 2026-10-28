"use client";

import { useState } from "react";
import Link from "next/link";
import { Clock, Eye, History, LogIn, RotateCcw } from "lucide-react";
import type { MockSession } from "@/lib/types";
import { api, getErrorMessage } from "@/lib/api";
import { useApiQuery } from "@/lib/hooks";
import { DIFFICULTY_LABELS, KIND_LABELS } from "@/lib/constants";
import { KIND_ICONS } from "@/lib/icons";
import { formatDuration } from "@/lib/utils";
import { useAuth, useLanguage } from "@/components/providers";
import { Accordion, AccordionItem } from "@/components/ui/accordion";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RatingDots } from "./rating-dots";

const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export function formatSessionDate(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : dateFormat.format(d);
}

/** Past mock sessions (GET /api/mock-sessions) for the setup screen. `version` forces a reload after a save. */
export function MockHistory({ version = 0 }: { version?: number }) {
  const { user, loading: authLoading } = useAuth();
  const { lang } = useLanguage();
  const [showAll, setShowAll] = useState(false);
  const { data, loading, error, reload } = useApiQuery(
    user ? `mock-sessions:${user.id}:${version}` : null,
    (signal) => api.mockSessions.list({ signal }),
    { keepPrevious: true },
  );

  if (authLoading) return <Skeleton className="h-40 rounded-xl" />;

  if (!user) {
    return (
      <Card className="p-4">
        <p className="flex items-center gap-2 font-semibold">
          <History className="size-4 text-brand" aria-hidden /> {lang === "bn" ? "পূর্ববর্তী সেশনসমূহ" : "Your past sessions"}
        </p>
        <p className="mt-1.5 text-sm text-muted">
          {lang === "bn"
            ? "প্রতিটি মক ইন্টারভিউ সংরক্ষণ করতে এবং উন্নতির চিত্র দেখতে লগইন করুন।"
            : "Log in to save every mock interview and see how your self-ratings improve over time."}
        </p>
        <ButtonLink href="/login?next=%2Fmock-interview" size="sm" variant="outline" className="mt-3" leftIcon={<LogIn aria-hidden />}>
          {lang === "bn" ? "লগইন করুন" : "Log in"}
        </ButtonLink>
      </Card>
    );
  }

  const sessions = data?.items ?? [];
  const visible = showAll ? sessions : sessions.slice(0, 5);

  return (
    <section aria-labelledby="mock-history-title" className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 id="mock-history-title" className="flex items-center gap-2 font-semibold">
          <History className="size-4 text-brand" aria-hidden /> {lang === "bn" ? "পূর্ববর্তী সেশনসমূহ" : "Past sessions"}
        </h2>
        {sessions.length > 0 && <span className="text-xs text-muted tabular-nums">{sessions.length} {lang === "bn" ? "টি মোট" : "total"}</span>}
      </div>

      {loading && !data ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : error && !data ? (
        <Card className="p-4 text-sm">
          <p className="text-muted">{lang === "bn" ? "সেশন লোড করা সম্ভব হয়নি: " : "Couldn't load your sessions: "}{getErrorMessage(error)}</p>
          <Button size="xs" variant="outline" className="mt-3" onClick={reload} leftIcon={<RotateCcw aria-hidden />}>
            {lang === "bn" ? "পুনরায় চেষ্টা করুন" : "Retry"}
          </Button>
        </Card>
      ) : sessions.length === 0 ? (
        <Card className="border-dashed p-4 text-center text-sm text-muted">
          {lang === "bn" ? "এখনও কোনো সেশন সম্পন্ন করা হয়নি। প্রথম ইন্টারভিউ শেষ করলে এখানে তার বিবরণ দেখতে পাবেন।" : "No sessions yet. Your first one will show up here with a per-question breakdown."}
        </Card>
      ) : (
        <>
          <Accordion>
            {visible.map((s) => (
              <SessionItem key={s.id} session={s} />
            ))}
          </Accordion>
          {sessions.length > 5 && (
            <Button variant="ghost" size="sm" className="w-full" onClick={() => setShowAll((v) => !v)}>
              {showAll ? (lang === "bn" ? "কম দেখুন" : "Show fewer") : (lang === "bn" ? `সবগুলো (${sessions.length}টি) দেখুন` : `Show all ${sessions.length}`)}
            </Button>
          )}
        </>
      )}
    </section>
  );
}

function SessionItem({ session: s }: { session: MockSession }) {
  const kinds = s.config.kinds.length >= 5 ? "All types" : s.config.kinds.map((k) => KIND_LABELS[k]).join(", ");
  return (
    <AccordionItem
      title={
        <span className="flex flex-col gap-1">
          <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <span className="font-medium">{formatSessionDate(s.createdAt)}</span>
            <RatingDots rating={s.avgRating} showLabel />
          </span>
          <span className="flex flex-wrap items-center gap-x-2 text-xs font-normal text-muted">
            <span>{s.items.length} questions</span>
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3" aria-hidden />
              {formatDuration(s.durationSec)}
            </span>
            <span aria-hidden>·</span>
            <span>{s.config.difficulty === "mixed" ? "Mixed" : DIFFICULTY_LABELS[s.config.difficulty]}</span>
            <span aria-hidden className="hidden sm:inline">
              ·
            </span>
            <span className="hidden truncate sm:inline">{kinds}</span>
          </span>
        </span>
      }
    >
      <ol className="space-y-2 pb-1">
        {s.items.map((item, i) => {
          const Icon = KIND_ICONS[item.kind];
          return (
            <li key={`${item.slug}-${i}`} className="flex items-center gap-2.5 text-sm">
              <Icon className="size-4 shrink-0 text-muted" role="img" aria-label={KIND_LABELS[item.kind]} />
              <Link href={`/questions/${item.slug}`} className="min-w-0 flex-1 truncate hover:text-brand hover:underline">
                {item.title}
              </Link>
              {item.revealed && <Eye className="size-3.5 shrink-0 text-muted" role="img" aria-label="Answer revealed" />}
              <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted">{formatDuration(item.timeSpentSec)}</span>
              <RatingDots rating={item.selfRating} />
            </li>
          );
        })}
      </ol>
    </AccordionItem>
  );
}
