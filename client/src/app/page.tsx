import Link from "next/link";
import { cookies } from "next/headers";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  ChartColumn,
  Code,
  Lightbulb,
  ListChecks,
  MessageSquareQuote,
  Mic,
  Route,
  Sparkles,
  Target,
  TriangleAlert,
  UserPlus,
  Waypoints,
} from "lucide-react";
import type { Category, PlatformStats, Roadmap } from "@/lib/types";
import { api, orFallback } from "@/lib/api";
import { CATEGORY_DESCRIPTIONS, CATEGORY_LABELS, CATEGORY_ORDER, LANG_COOKIE } from "@/lib/constants";
import { CATEGORY_ICONS } from "@/lib/icons";
import { TWO_SUM_JS, TWO_SUM_SUMMARY, TWO_SUM_VISUAL } from "@/lib/demo-content";
import { cn, formatNumber } from "@/lib/utils";
import { getDictionary, type Dictionary } from "@/i18n/dictionary";
import { VisualWalkthrough } from "@/components/visualizers";
import { Container } from "@/components/layout/page";
import { ButtonLink } from "@/components/ui/button";
import { Badge, DifficultyBadge, KindBadge } from "@/components/ui/badge";
import { HeroPreview } from "@/components/landing/hero-preview";
import { TopicIcon } from "@/components/topics/topic-icon";

export const revalidate = 60;

/** Topic slugs shown as chips per category (fixed in docs/ARCHITECTURE.md). */
const CATEGORY_TOPICS: Record<Category, { slug: string; title: string }[]> = {
  dsa: [
    { slug: "big-o", title: "Big-O" },
    { slug: "arrays-hashing", title: "Arrays & Hashing" },
    { slug: "two-pointers", title: "Two Pointers" },
    { slug: "sliding-window", title: "Sliding Window" },
    { slug: "stack-queue", title: "Stack & Queue" },
    { slug: "binary-search", title: "Binary Search" },
    { slug: "linked-list", title: "Linked List" },
    { slug: "sorting", title: "Sorting" },
    { slug: "recursion-backtracking", title: "Recursion & Backtracking" },
    { slug: "trees", title: "Trees & BST" },
    { slug: "heap", title: "Heap" },
    { slug: "graphs", title: "Graphs" },
    { slug: "dynamic-programming", title: "Dynamic Programming" },
    { slug: "greedy-intervals", title: "Greedy & Intervals" },
    { slug: "math-bits", title: "Math & Bits" },
  ],
  "cs-fundamentals": [
    { slug: "oop", title: "OOP" },
    { slug: "dbms", title: "DBMS" },
    { slug: "sql", title: "SQL" },
    { slug: "operating-systems", title: "Operating Systems" },
    { slug: "computer-networks", title: "Networks" },
  ],
  web: [
    { slug: "javascript", title: "JavaScript" },
    { slug: "react-nextjs", title: "React & Next.js" },
    { slug: "nodejs-express", title: "Node & Express" },
    { slug: "java-spring", title: "Java & Spring" },
  ],
  engineering: [
    { slug: "system-design", title: "System Design" },
    { slug: "git", title: "Git" },
  ],
  career: [{ slug: "behavioral", title: "Behavioral & HR" }],
};

const TOPIC_COUNT: Record<Category, number> = { dsa: 15, "cs-fundamentals": 6, web: 5, engineering: 2, career: 1 };

const ANATOMY = [
  { icon: MessageSquareQuote, title: "Say this first", text: "The 1–2 sentence answer you open with, so you never freeze." },
  { icon: Lightbulb, title: "Progressive hints", text: "Vaguest first. Unlock one at a time when you're stuck." },
  { icon: Waypoints, title: "Visual walkthrough", text: "Step through the algorithm and watch every variable change, synced to the code." },
  { icon: Route, title: "Brute force → optimal", text: "The path interviewers want to hear, with time and space for each step." },
  { icon: Code, title: "JavaScript, Python & Java", text: "Idiomatic, tested solutions with line numbers and one-click copy." },
  { icon: TriangleAlert, title: "Pitfalls & follow-ups", text: "The mistakes that cost offers, and what they'll ask next." },
];

const FALLBACK_WEEKS = [
  { week: 1, title: "Foundations", items: ["Big-O", "Arrays & hashing", "Two pointers", "Sliding window", "Stack & queue"] },
  { week: 2, title: "Core data structures", items: ["Binary search", "Linked lists", "Trees & BST", "Heaps", "Graphs"] },
  { week: 3, title: "DP + CS fundamentals", items: ["Dynamic programming", "Greedy", "OOP & SOLID", "DBMS & SQL", "OS & networks"] },
  { week: 4, title: "Web, design & mocks", items: ["JavaScript & React", "Node & REST", "System design", "Behavioral", "Mock interviews"] },
];

function roadmapWeeks(roadmap: Roadmap | null) {
  if (!roadmap || roadmap.days.length === 0) return { weeks: FALLBACK_WEEKS, days: 30, hours: null as number | null };
  const byWeek = new Map<number, Roadmap["days"]>();
  for (const d of roadmap.days) byWeek.set(d.week, [...(byWeek.get(d.week) ?? []), d]);
  const weeks = Array.from(byWeek.entries())
    .sort((a, b) => a[0] - b[0])
    .slice(0, 5)
    .map(([week, days]) => ({
      week,
      title: FALLBACK_WEEKS[week - 1]?.title ?? `Week ${week}`,
      items: days
        .sort((a, b) => a.day - b.day)
        .slice(0, 5)
        .map((d) => d.title),
    }));
  const hours = roadmap.days.reduce((s, d) => s + d.estimatedHours, 0);
  return { weeks, days: roadmap.days.length, hours };
}

export default async function HomePage() {
  const cookieStore = await cookies();
  const lang = cookieStore.get(LANG_COOKIE)?.value;
  const t = getDictionary(lang);
  const [stats, roadmap] = await Promise.all([orFallback(api.stats()), orFallback(api.roadmap.get())]);
  const plan = roadmapWeeks(roadmap);

  return (
    <div className="flex flex-col">
      <Hero stats={stats} t={t} />
      <Categories stats={stats} t={t} />
      <HowItWorks t={t} />
      <RoadmapTeaser weeks={plan.weeks} days={plan.days} hours={plan.hours} t={t} />
      <PracticeModes t={t} />
      <FinalCta t={t} />
    </div>
  );
}

// ---------------------------------------------------------------- hero

function Hero({ stats, t }: { stats: PlatformStats | null; t: Dictionary }) {
  const items = stats
    ? [
        { value: formatNumber(stats.topics), label: t.hero.statTopics },
        { value: formatNumber(stats.questions), label: t.hero.statQuestions },
        { value: formatNumber(stats.visuals), label: t.hero.statVisuals },
        { value: formatNumber(stats.quizQuestions), label: t.hero.statQuizzes },
      ]
    : [
        { value: "29", label: t.hero.statTopics },
        { value: "5", label: t.hero.statTracks },
        { value: "3", label: t.hero.statLanguages },
        { value: "30", label: t.hero.statPlan },
      ];

  return (
    <section className="relative overflow-hidden border-b border-border">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(to right, color-mix(in oklch, var(--border) 60%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklch, var(--border) 60%, transparent) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(ellipse 70% 60% at 50% 0%, black 30%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 0%, black 30%, transparent 75%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[28rem] w-[56rem] max-w-none -translate-x-1/2 rounded-full opacity-70 blur-3xl"
        style={{ background: "radial-gradient(closest-side, var(--brand-soft), transparent)" }}
      />
      <Container size="wide" className="relative grid items-center gap-8 py-10 sm:py-12 lg:grid-cols-[1.1fr_1fr] xl:grid-cols-[1.2fr_1fr] 2xl:grid-cols-[1.25fr_1fr] xl:gap-12 2xl:gap-16 lg:py-16 xl:py-20 2xl:py-24">
        <div className="max-w-2xl xl:max-w-3xl 2xl:max-w-4xl">
          <Link
            href="/roadmap"
            className="group inline-flex items-center gap-2 rounded-full border border-border bg-surface/80 py-1 pl-1 pr-3 text-xs font-medium text-muted shadow-xs backdrop-blur transition-colors hover:border-brand/40 hover:text-foreground"
          >
            <span className="rounded-full bg-brand px-2 py-0.5 text-[11px] font-semibold text-brand-foreground">{t.hero.tag}</span>
            {t.hero.tagAction}
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
          <h1 className="mt-5 text-balance text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl 2xl:text-6xl leading-[1.3] sm:leading-[1.25]">
            {t.hero.titleBefore}{" "}
            <span className="relative inline-block whitespace-nowrap text-brand pb-2">
              {t.hero.titleHighlight}
              <svg
                aria-hidden
                viewBox="0 0 120 12"
                preserveAspectRatio="none"
                className="absolute bottom-0 left-0 h-2 w-full"
              >
                <path d="M2 8 C 30 2, 60 2, 118 7" fill="none" stroke="var(--viz-warning)" strokeWidth="3.5" strokeLinecap="round" />
              </svg>
            </span>{" "}
            {t.hero.titleAfter}
          </h1>
          <p className="mt-4 max-w-xl xl:max-w-2xl 2xl:max-w-3xl text-pretty text-base leading-relaxed text-muted sm:text-lg">
            {t.hero.subtitle}
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/topics" size="lg" rightIcon={<ArrowRight aria-hidden />}>
              {t.hero.ctaPrimary}
            </ButtonLink>
            <ButtonLink href="/questions" size="lg" variant="outline" leftIcon={<ListChecks aria-hidden />}>
              {t.hero.ctaSecondary}
            </ButtonLink>
          </div>
          <dl className="mt-6 grid max-w-xl xl:max-w-2xl 2xl:max-w-3xl grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-4">
            {items.map((s) => (
              <div key={s.label} className="border-l-2 border-brand/30 pl-3">
                <dt className="sr-only">{s.label}</dt>
                <dd>
                  <span className="block text-2xl font-semibold tabular-nums tracking-tight">{s.value}</span>
                  <span className="block text-xs leading-snug text-muted">{s.label}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
        <HeroPreview />
      </Container>
    </section>
  );
}

// ---------------------------------------------------------------- categories

function Categories({ stats, t }: { stats: PlatformStats | null; t: Dictionary }) {
  return (
    <section aria-labelledby="tracks-heading" className="py-12 sm:py-14">
      <Container size="wide">
        <SectionIntro
          id="tracks-heading"
          eyebrow={t.categories.eyebrow}
          title={t.categories.title}
          text={t.categories.text}
        />
        <ul className="mt-8 grid gap-4 md:grid-cols-6 lg:gap-6">
          {CATEGORY_ORDER.map((cat, i) => {
            const Icon = CATEGORY_ICONS[cat];
            const count = stats?.byCategory?.[cat];
            return (
              <li key={cat} className={i === 0 ? "md:col-span-6 lg:col-span-3 lg:row-span-2" : "md:col-span-3"}>
                <Link
                  href={`/topics#${cat}`}
                  className={cn(
                    "group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface p-4 transition-[border-color,transform,box-shadow] sm:p-5 duration-200 hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lg hover:shadow-brand/5",
                    i === 0 && "lg:p-6",
                  )}
                >
                  {i === 0 && (
                    <div
                      aria-hidden
                      className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full opacity-60 blur-2xl"
                      style={{ background: "radial-gradient(closest-side, var(--brand-soft), transparent)" }}
                    />
                  )}
                  <div className="relative flex items-start justify-between gap-4">
                    <span className={cn("grid place-items-center rounded-xl bg-brand-soft text-brand", i === 0 ? "size-12" : "size-10")}>
                      <Icon className={i === 0 ? "size-6" : "size-5"} aria-hidden />
                    </span>
                    <span className="text-right text-xs text-muted">
                      <span className="block font-medium text-foreground">
                        {t.categories.topicCount.replace("{count}", String(TOPIC_COUNT[cat]))}
                      </span>
                      {typeof count === "number" && (
                        <span>{t.categories.questionCount.replace("{count}", formatNumber(count))}</span>
                      )}
                    </span>
                  </div>
                  <h3 className={cn("relative mt-4 font-semibold tracking-tight", i === 0 ? "text-2xl" : "text-lg")}>
                    {t.categories.labels[cat] || CATEGORY_LABELS[cat]}
                  </h3>
                  <p className="relative mt-2 text-sm leading-relaxed text-muted">
                    {t.categories.descriptions[cat] || CATEGORY_DESCRIPTIONS[cat]}
                  </p>
                  <ul className="relative mt-4 flex flex-wrap gap-1.5" aria-label={`${CATEGORY_LABELS[cat]} topics`}>
                    {CATEGORY_TOPICS[cat].map((item) => (
                      <li
                        key={item.slug}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2/60 px-2.5 py-1 text-xs text-foreground/80"
                      >
                        <TopicIcon slug={item.slug} className="size-3 text-muted" />
                        {item.title}
                      </li>
                    ))}
                  </ul>
                  <span className="relative mt-auto inline-flex items-center gap-1 pt-4 text-sm font-medium text-brand">
                    {t.categories.explore}
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}

// ---------------------------------------------------------------- how it works

function HowItWorks({ t }: { t: Dictionary }) {
  const anatomyItems = [
    { icon: MessageSquareQuote, title: t.howItWorks.anatomy.sayFirstTitle, text: t.howItWorks.anatomy.sayFirstText },
    { icon: Lightbulb, title: t.howItWorks.anatomy.hintsTitle, text: t.howItWorks.anatomy.hintsText },
    { icon: Waypoints, title: t.howItWorks.anatomy.visualTitle, text: t.howItWorks.anatomy.visualText },
    { icon: Route, title: t.howItWorks.anatomy.approachesTitle, text: t.howItWorks.anatomy.approachesText },
    { icon: Code, title: t.howItWorks.anatomy.codeTitle, text: t.howItWorks.anatomy.codeText },
    { icon: TriangleAlert, title: t.howItWorks.anatomy.pitfallsTitle, text: t.howItWorks.anatomy.pitfallsText },
  ];

  return (
    <section aria-labelledby="how-heading" className="border-y border-border bg-surface/50 py-12 sm:py-14">
      <Container size="wide">
        <SectionIntro
          id="how-heading"
          eyebrow={t.howItWorks.eyebrow}
          title={t.howItWorks.title}
          text={t.howItWorks.text}
        />
        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-8 xl:gap-12 items-start">
          <ol className="grid content-start gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {anatomyItems.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="flex gap-4 rounded-xl border border-transparent p-3 transition-colors hover:border-border hover:bg-surface">
                <span className="relative grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-surface text-brand shadow-xs">
                  <Icon className="size-5" aria-hidden />
                  <span className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-brand text-[10px] font-bold text-brand-foreground">
                    {i + 1}
                  </span>
                </span>
                <div>
                  <p className="font-medium">{title}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-muted">{text}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="min-w-0">
            <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-xl shadow-brand/5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface px-4 py-2.5 sm:px-5">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex gap-1.5" aria-hidden>
                    <span className="size-2.5 rounded-full bg-viz-danger/70" />
                    <span className="size-2.5 rounded-full bg-viz-warning/70" />
                    <span className="size-2.5 rounded-full bg-viz-success/70" />
                  </span>
                  <span className="ml-2 truncate text-sm font-semibold">Two Sum</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <DifficultyBadge difficulty="easy" />
                  <KindBadge kind="coding" />
                  <Badge tone="brand" icon={<Route aria-hidden />}>
                    Hash Map Complement
                  </Badge>
                </div>
              </div>
              <div className="space-y-4 p-3 sm:p-4">
                <div className="rounded-xl border border-brand/30 bg-brand-soft/40 px-4 py-3">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-brand">
                    <MessageSquareQuote className="size-3.5" aria-hidden /> {t.howItWorks.sayThisFirst}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed">{TWO_SUM_SUMMARY}</p>
                </div>
                <VisualWalkthrough visuals={[TWO_SUM_VISUAL]} code={TWO_SUM_JS} />
              </div>
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
              <Sparkles className="size-3.5 text-brand" aria-hidden /> {t.howItWorks.hint}
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}

// ---------------------------------------------------------------- roadmap

function RoadmapTeaser({
  weeks,
  days,
  hours,
  t,
}: {
  weeks: { week: number; title: string; items: string[] }[];
  days: number;
  hours: number | null;
  t: Dictionary;
}) {
  const hoursText = hours ? t.roadmapTeaser.textHours.replace("{hours}", formatNumber(Math.round(hours))) : "";
  const roadmapIntro = `${t.roadmapTeaser.textPrefix} ${days}${t.roadmapTeaser.textMiddle}${hoursText}${t.roadmapTeaser.textSuffix}`;

  return (
    <section aria-labelledby="roadmap-heading" className="py-12 sm:py-14">
      <Container size="wide">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <SectionIntro
            id="roadmap-heading"
            eyebrow={t.roadmapTeaser.eyebrow}
            title={t.roadmapTeaser.title}
            text={roadmapIntro}
            align="left"
          />
          <ButtonLink href="/roadmap" variant="outline" rightIcon={<ArrowRight aria-hidden />} className="self-start md:self-auto">
            {t.roadmapTeaser.cta}
          </ButtonLink>
        </div>
        <ol className="relative mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          <span
            aria-hidden
            className="pointer-events-none absolute left-0 right-0 top-[1.375rem] hidden h-px lg:block"
            style={{ background: "linear-gradient(90deg, var(--brand), color-mix(in oklch, var(--brand) 10%, transparent))" }}
          />
          {weeks.map((w) => (
            <li key={w.week} className="relative flex flex-col">
              <span className="relative z-10 grid size-11 place-items-center rounded-full border-4 border-background bg-brand text-sm font-bold text-brand-foreground">
                W{w.week}
              </span>
              <div className="mt-3 flex-1 rounded-2xl border border-border bg-surface p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted">
                  {t.roadmapTeaser.week.replace("{week}", String(w.week))}
                </p>
                <h3 className="mt-1 font-semibold">{w.title}</h3>
                <ul className="mt-3 space-y-1.5">
                  {w.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-foreground/80">
                      <CalendarDays className="mt-0.5 size-3.5 shrink-0 text-muted" aria-hidden />
                      <span className="min-w-0">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}

// ---------------------------------------------------------------- practice modes

function PracticeModes({ t }: { t: Dictionary }) {
  const modes = [
    {
      href: "/quiz",
      icon: Target,
      title: t.practiceModes.quiz.title,
      text: t.practiceModes.quiz.text,
    },
    {
      href: "/mock-interview",
      icon: Mic,
      title: t.practiceModes.mock.title,
      text: t.practiceModes.mock.text,
    },
    {
      href: "/dashboard",
      icon: ChartColumn,
      title: t.practiceModes.dashboard.title,
      text: t.practiceModes.dashboard.text,
    },
  ];
  return (
    <section aria-labelledby="practice-heading" className="border-t border-border bg-surface/50 py-12 sm:py-14">
      <Container size="wide">
        <SectionIntro
          id="practice-heading"
          eyebrow={t.practiceModes.eyebrow}
          title={t.practiceModes.title}
          text={t.practiceModes.text}
        />
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {modes.map(({ href, icon: Icon, title, text }) => (
            <li key={href}>
              <Link
                href={href}
                className="group flex h-full flex-col rounded-2xl border border-border bg-surface p-4 transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-brand/40 sm:p-5"
              >
                <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand">
                  <Icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
                <span className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-medium text-brand">
                  {t.practiceModes.open}
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

// ---------------------------------------------------------------- CTA

function FinalCta({ t }: { t: Dictionary }) {
  return (
    <section aria-labelledby="cta-heading" className="py-12 sm:py-14">
      <Container size="wide">
        <div
          className="relative overflow-hidden rounded-3xl px-6 py-10 text-center sm:px-12 sm:py-14 lg:py-16 xl:py-20"
          style={{
            background:
              "radial-gradient(80% 120% at 0% 0%, color-mix(in oklch, var(--brand) 85%, var(--viz-info)), var(--brand) 60%)",
          }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-25"
            style={{
              backgroundImage:
                "linear-gradient(to right, var(--brand-foreground) 1px, transparent 1px), linear-gradient(to bottom, var(--brand-foreground) 1px, transparent 1px)",
              backgroundSize: "36px 36px",
              maskImage: "radial-gradient(ellipse 60% 70% at 50% 100%, black, transparent)",
              WebkitMaskImage: "radial-gradient(ellipse 60% 70% at 50% 100%, black, transparent)",
            }}
          />
          <h2 id="cta-heading" className="relative mx-auto max-w-2xl xl:max-w-3xl 2xl:max-w-4xl text-balance text-2xl font-semibold tracking-tight text-brand-foreground sm:text-3xl xl:text-4xl">
            {t.finalCta.title}
          </h2>
          <p className="relative mx-auto mt-3 max-w-xl xl:max-w-2xl 2xl:max-w-3xl text-pretty text-brand-foreground/85 sm:text-base xl:text-lg">
            {t.finalCta.subtitle}
          </p>
          <div className="relative mt-5 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/register"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand-foreground px-5 text-base font-semibold text-brand shadow-lg transition-transform hover:-translate-y-0.5"
            >
              <UserPlus className="size-5" aria-hidden /> {t.finalCta.button}
            </Link>
            <Link
              href="/topics/arrays-hashing"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-brand-foreground/30 px-5 text-base font-medium text-brand-foreground transition-colors hover:bg-brand-foreground/10"
            >
              <BookOpen className="size-5" aria-hidden /> Arrays &amp; Hashing
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}

// ---------------------------------------------------------------- helpers

function SectionIntro({
  id,
  eyebrow,
  title,
  text,
  align = "center",
}: {
  id: string;
  eyebrow: string;
  title: string;
  text: string;
  align?: "center" | "left";
}) {
  return (
    <div className={cn("max-w-2xl xl:max-w-3xl 2xl:max-w-4xl", align === "center" && "mx-auto text-center")}>
      <p className="text-sm font-semibold text-brand">{eyebrow}</p>
      <h2 id={id} className="mt-2 text-balance text-2xl font-semibold tracking-tight sm:text-3xl xl:text-4xl">
        {title}
      </h2>
      <p className="mt-3 text-pretty text-sm leading-relaxed text-muted sm:text-base xl:text-lg">{text}</p>
    </div>
  );
}
