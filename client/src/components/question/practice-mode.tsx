"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { Eye, EyeOff, GraduationCap, Lock } from "lucide-react";
import { STORAGE_KEYS } from "@/lib/constants";
import { createLocalStore, useIsClient } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n";

// On by default: answers stay hidden until the student tries first. Only an explicit "false" turns it off,
// matching the boot script in lib/init-scripts.ts.
const parsePractice = (raw: string) => (raw === "false" ? false : raw === "true" ? true : undefined);
const practiceStore = createLocalStore<boolean>(STORAGE_KEYS.practiceMode, true, parsePractice, String);

function setHtmlFlag(on: boolean) {
  if (on) document.documentElement.setAttribute("data-practice", "on");
  else document.documentElement.removeAttribute("data-practice");
}

interface PracticeModeValue {
  /** practice mode preference (persisted, site-wide) */
  enabled: boolean;
  setEnabled: (on: boolean) => void;
  /** the answer was revealed on this page */
  revealed: boolean;
  reveal: () => void;
  /** answer sections are currently hidden */
  hidden: boolean;
}

const PracticeModeContext = createContext<PracticeModeValue | null>(null);

/** Per-question-page practice state. Remounts (and re-hides) for every question. */
export function PracticeModeProvider({ children }: { children: ReactNode }) {
  const enabled = practiceStore.useValue();
  const [revealed, setRevealed] = useState(false);

  const setEnabled = useCallback((on: boolean) => {
    practiceStore.set(on);
    setHtmlFlag(on);
    if (on) setRevealed(false);
  }, []);
  const reveal = useCallback(() => setRevealed(true), []);

  const value = useMemo(
    () => ({ enabled, setEnabled, revealed, reveal, hidden: enabled && !revealed }),
    [enabled, setEnabled, revealed, reveal],
  );
  return <PracticeModeContext.Provider value={value}>{children}</PracticeModeContext.Provider>;
}

export function usePracticeMode(): PracticeModeValue {
  const ctx = useContext(PracticeModeContext);
  if (!ctx) throw new Error("usePracticeMode must be used inside <PracticeModeProvider>");
  return ctx;
}

/** Switch in the question header. */
export function PracticeModeToggle({ className }: { className?: string }) {
  const { enabled, setEnabled } = usePracticeMode();
  const isClient = useIsClient();
  const t = useT();
  // Until hydration React only knows the default (on); the boot script's <html data-practice> flag knows the
  // stored choice, so CSS draws the switch from it and someone who turned practice mode off never sees it "on".
  const track = isClient ? (enabled ? "bg-brand" : "bg-border") : "bg-border [html[data-practice=on]_&]:bg-brand";
  const knob = isClient ? (enabled ? "ml-[18px]" : "ml-0.5") : "ml-0.5 [html[data-practice=on]_&]:ml-[18px]";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={isClient ? enabled : undefined} // unknown until hydration; don't announce a guess
      onClick={() => setEnabled(!enabled)}
      title={t.question.practiceModeTitle}
      className={cn(
        "inline-flex h-9 items-center gap-2.5 rounded-lg border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-surface-2",
        className,
      )}
    >
      <GraduationCap className="size-4 text-muted" aria-hidden />
      {t.question.practiceMode}
      <span
        aria-hidden
        className={cn("relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors", track)}
      >
        <motion.span
          layout
          transition={{ type: "spring", bounce: 0.2, duration: 0.25 }}
          className={cn("size-4 rounded-full bg-surface shadow-sm", knob)}
        />
      </span>
    </button>
  );
}

/**
 * Hides its children while practice mode is on and the answer is not revealed.
 * Before hydration a CSS rule keyed on <html data-practice="on"> (set by the boot script) does the hiding,
 * so the answer never flashes on a hard load.
 */
export function PracticeGate({
  children,
  sectionCount,
  className,
}: {
  children: ReactNode;
  sectionCount?: number;
  /** classes for the wrapper around the gated sections (e.g. vertical spacing) */
  className?: string;
}) {
  const { hidden, reveal, setEnabled } = usePracticeMode();
  const isClient = useIsClient();
  const t = useT();

  const card = (
    <div
      id="answer"
      className="relative scroll-mt-20 overflow-hidden rounded-2xl border border-dashed border-brand/40 bg-brand-soft/30 px-5 py-8 text-center"
    >
      <span className="mx-auto grid size-12 place-items-center rounded-full bg-surface text-brand shadow-sm">
        <Lock className="size-5" aria-hidden />
      </span>
      <h2 className="mt-4 text-lg font-semibold">{t.question.answerHidden}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">
        {t.question.answerHiddenDesc}
        {sectionCount ? ` ${t.question.sectionsCount.replace("{count}", String(sectionCount))}` : ""}.
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <Button onClick={reveal} leftIcon={<Eye aria-hidden />}>
          {t.question.revealAnswer}
        </Button>
        <Button variant="ghost" onClick={() => setEnabled(false)} leftIcon={<EyeOff aria-hidden />}>
          {t.question.turnOffPractice}
        </Button>
      </div>
    </div>
  );

  // SSR + hydration pass: CSS decides from the boot-script flag. Afterwards React state decides.
  // Children stay mounted (just hidden) so revealing never re-initialises the walkthrough.
  return (
    <>
      {(!isClient || hidden) && <div className={isClient ? undefined : "hidden [html[data-practice=on]_&]:block"}>{card}</div>}
      <div className={cn(className, isClient ? hidden && "hidden" : "[html[data-practice=on]_&]:hidden")}>{children}</div>
    </>
  );
}
