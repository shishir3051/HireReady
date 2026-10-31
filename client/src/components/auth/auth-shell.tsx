import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { BookmarkCheck, ChartColumn, NotebookPen, Route } from "lucide-react";
import { api, orFallback } from "@/lib/api";
import { cn, formatNumber } from "@/lib/utils";
import { Container } from "@/components/layout/page";
import { LogoMark } from "@/components/layout/logo";

type Mode = "login" | "register";

const PERKS = [
  { icon: BookmarkCheck, title: "Solved & bookmarked questions", text: "Pick up exactly where you left off." },
  { icon: NotebookPen, title: "Private notes on every question", text: "Write your own 30-second answer." },
  { icon: Route, title: "30-day roadmap progress", text: "Tick off each day and keep a streak." },
  { icon: ChartColumn, title: "Dashboard of weak spots", text: "Quiz scores and mock interviews together." },
];

// The brand panel uses fixed colours (not theme tokens) so it reads the same in light and dark mode.
const PANEL_STYLE: CSSProperties = {
  background:
    "radial-gradient(120% 80% at 0% 0%, rgba(62, 207, 142, 0.24) 0%, transparent 60%), radial-gradient(90% 70% at 100% 100%, rgba(255, 161, 22, 0.14) 0%, transparent 55%), linear-gradient(160deg, #14171a 0%, #0b0d0e 100%)",
};
// LogoMark draws with --brand / --brand-foreground; style it on the dark obsidian panel.
const INVERTED_MARK = { "--brand": "#3ecf8e", "--brand-foreground": "#09130e" } as CSSProperties;

/** Split auth card: brand panel (desktop) + form panel with a Log in / Sign up switch (omitted when `mode` is not set). */
export async function AuthShell({
  mode,
  next = "/dashboard",
  title,
  subtitle,
  children,
}: {
  mode?: Mode;
  next?: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const stats = await orFallback(api.stats({ revalidate: 300 }));
  const query = next !== "/dashboard" ? `?next=${encodeURIComponent(next)}` : "";

  return (
    // Fills the first screen under the 3.5rem header so the whole card is visible without scrolling.
    <Container size="wide" className="flex min-h-[calc(100dvh-3.5rem)] flex-1 items-center justify-center py-3 sm:py-5">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-border bg-surface shadow-xl shadow-brand/5 lg:grid-cols-2">
        <aside
          aria-label="Why create an account"
          className="relative hidden flex-col overflow-hidden p-7 text-white lg:flex"
          style={PANEL_STYLE}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:radial-gradient(white_1px,transparent_1px)] [background-size:20px_20px] [mask-image:linear-gradient(to_bottom,black,transparent_75%)]"
          />

          <Link href="/" className="relative inline-flex items-center gap-2 self-start rounded-lg font-semibold tracking-tight">
            <span style={INVERTED_MARK}>
              <LogoMark />
            </span>
            <span className="text-lg">HireReady</span>
          </Link>

          <div className="relative mt-7">
            <h2 className="text-balance text-[1.7rem] font-semibold leading-tight tracking-tight">
              Crack your first software engineering interview.
            </h2>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/75">
              Model answers you can say out loud, and a step-by-step visual for every solution.
            </p>
          </div>

          {stats && (
            <dl className="relative mt-5 grid grid-cols-3 gap-2">
              {[
                { label: "topics", value: stats.topics },
                { label: "questions", value: stats.questions },
                { label: "visuals", value: stats.visuals },
              ].map((s) => (
                <div key={s.label} className="rounded-xl bg-white/10 px-3 py-2 ring-1 ring-white/15 backdrop-blur-sm">
                  <dt className="sr-only">{s.label}</dt>
                  <dd className="text-lg font-semibold tabular-nums">{formatNumber(s.value)}</dd>
                  <p aria-hidden className="text-xs text-white/70">
                    {s.label}
                  </p>
                </div>
              ))}
            </dl>
          )}

          <ul className="relative mt-auto grid grid-cols-2 gap-x-4 gap-y-3 pt-6">
            {PERKS.map(({ icon: Icon, title: perk, text }) => (
              <li key={perk} className="flex items-start gap-2.5">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/12 ring-1 ring-white/15">
                  <Icon className="size-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-medium leading-snug">{perk}</p>
                  <p className="mt-0.5 text-xs leading-snug text-white/70">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </aside>

        <div className="flex flex-col justify-center px-5 py-5 sm:px-10">
          <div className="mx-auto w-full max-w-sm">
            <Link href="/" className="mb-5 inline-flex items-center gap-2 font-semibold tracking-tight lg:hidden">
              <LogoMark className="size-7" />
              <span>
                Hire<span className="text-brand">Ready</span>
              </span>
            </Link>

            {mode && (
              <nav aria-label="Account" className="mb-3 grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1 text-sm font-medium">
                {(
                  [
                    { key: "login", href: `/login${query}`, label: "Log in" },
                    { key: "register", href: `/register${query}`, label: "Sign up" },
                  ] as const
                ).map((tab) => {
                  const active = tab.key === mode;
                  return (
                    <Link
                      key={tab.key}
                      href={tab.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "rounded-lg px-3 py-1.5 text-center transition-colors",
                        active ? "bg-surface text-foreground shadow-sm ring-1 ring-border" : "text-muted hover:text-foreground",
                    )}
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </nav>
            )}

            <div className="mb-4 space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
              <p className="text-sm text-muted">{subtitle}</p>
            </div>

            {children}
          </div>
        </div>
      </div>
    </Container>
  );
}
