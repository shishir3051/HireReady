import { Suspense } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUp,
  ChartColumn,
  Layers,
  ListChecks,
  Mic,
  Route,
  Target,
  type LucideIcon,
} from "lucide-react";
import { api, orFallback } from "@/lib/api";
import { CATEGORY_ORDER, CATEGORY_SHORT_LABELS } from "@/lib/constants";
import { CATEGORY_ICONS } from "@/lib/icons";
import { formatNumber } from "@/lib/utils";
import { ButtonLink } from "@/components/ui/button";
import { Kbd, ModKey } from "@/components/ui/kbd";
import { TopicIcon } from "@/components/topics/topic-icon";
import { Logo } from "./logo";

const YEAR = new Date().getFullYear();

type FooterLink = { href: string; label: string; icon?: LucideIcon; topic?: string };

const COLUMNS: { title: string; links: FooterLink[] }[] = [
  {
    title: "Learn",
    links: [
      { href: "/topics", label: "Topics", icon: Layers },
      { href: "/questions", label: "Question bank", icon: ListChecks },
      { href: "/roadmap", label: "30-day roadmap", icon: Route },
    ],
  },
  {
    title: "Practice",
    links: [
      { href: "/quiz", label: "Quizzes", icon: Target },
      { href: "/mock-interview", label: "Mock interview", icon: Mic },
      { href: "/dashboard", label: "Dashboard", icon: ChartColumn },
    ],
  },
  {
    title: "Categories",
    links: CATEGORY_ORDER.map((c) => ({ href: `/topics#${c}`, label: CATEGORY_SHORT_LABELS[c], icon: CATEGORY_ICONS[c] })),
  },
  {
    title: "Popular topics",
    links: [
      { href: "/topics/arrays-hashing", label: "Arrays & Hashing", topic: "arrays-hashing" },
      { href: "/topics/dynamic-programming", label: "Dynamic Programming", topic: "dynamic-programming" },
      { href: "/topics/sql", label: "SQL", topic: "sql" },
      { href: "/topics/system-design", label: "System Design", topic: "system-design" },
      { href: "/topics/behavioral", label: "Behavioral & HR", topic: "behavioral" },
    ],
  },
];

async function FooterStats() {
  const stats = await orFallback(api.stats({ revalidate: 300 }));
  if (!stats) return null;
  const items = [
    { label: "topics", value: stats.topics },
    { label: "questions", value: stats.questions },
    { label: "visuals", value: stats.visuals },
  ];
  return (
    <dl className="flex flex-wrap gap-1.5">
      {items.map((s) => (
        <div key={s.label} className="inline-flex items-baseline gap-1 rounded-full border border-border bg-surface px-2.5 py-1 text-xs">
          {/* dt must precede dd in a <dl>; order-* puts the number first visually */}
          <dt className="order-2 text-muted">{s.label}</dt>
          <dd className="order-1 font-semibold tabular-nums text-foreground">{formatNumber(s.value)}</dd>
        </div>
      ))}
    </dl>
  );
}

export function SiteFooter() {
  return (
    <footer className="relative mt-auto overflow-hidden border-t border-border bg-surface/70">
      {/* brand hairline + soft glow along the top edge */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent, var(--brand) 25%, color-mix(in oklch, var(--viz-info) 70%, transparent) 60%, transparent)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 -top-40 size-96 rounded-full opacity-50 blur-3xl"
        style={{ background: "radial-gradient(circle, var(--brand-soft), transparent 70%)" }}
      />

      <div className="relative mx-auto grid w-full max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-12 lg:gap-6 lg:px-8">
        <div className="max-w-sm space-y-3 lg:col-span-4">
          <Logo />
          <p className="text-sm leading-relaxed text-muted">
            Interview prep for new-grad and junior engineers: model answers you can say out loud, and a step-by-step
            visual for every solution.
          </p>
          <Suspense fallback={null}>
            <FooterStats />
          </Suspense>
          <ButtonLink href="/roadmap" size="sm" rightIcon={<ArrowRight aria-hidden />} className="mt-1">
            Start the 30-day roadmap
          </ButtonLink>
        </div>

        <nav aria-label="Footer" className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-4 lg:col-span-8">
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground/90">{col.title}</h2>
              <ul className="mt-3 space-y-1">
                {col.links.map(({ href, label, icon: Icon, topic }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="group -mx-1.5 flex items-center gap-2 rounded-md px-1.5 py-1 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
                    >
                      <span className="text-muted/80 transition-colors group-hover:text-brand [&_svg]:size-3.5">
                        {topic ? <TopicIcon slug={topic} /> : Icon ? <Icon aria-hidden /> : null}
                      </span>
                      <span className="truncate">{label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      <div className="relative border-t border-border">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-3.5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>
            © {YEAR} HireReady · Built for new-grad and junior engineers.
          </p>
          <div className="flex items-center gap-4">
            <p className="hidden items-center gap-1.5 sm:flex">
              Press <ModKey /> <Kbd>K</Kbd> to search
            </p>
            <a href="#main" className="inline-flex items-center gap-1 font-medium transition-colors hover:text-foreground">
              Back to top <ArrowUp className="size-3.5" aria-hidden />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
