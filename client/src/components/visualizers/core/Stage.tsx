"use client";

import { useCallback, useMemo, type KeyboardEvent } from "react";
import { motion } from "motion/react";
import { Keyboard } from "lucide-react";
import type { Visual } from "@/lib/types";
import { useT } from "@/i18n";
import { useStepPlayer } from "../lib/hooks";
import { useNarration } from "../lib/narration";
import { stepCount, stepMeta, typeMeta, usedColors, visualFeatures } from "../lib/steps";
import { cn, plainText } from "../lib/utils";
import { T_FAST } from "../lib/motion";
import { StepCanvas } from "../renderers";
import { CodePane } from "./CodePane";
import { Controls } from "./Controls";
import { VisualErrorBoundary } from "./ErrorBoundary";
import { Legend } from "./Legend";
import { InlineMarkdown } from "./Markdown";
import { PanelCard } from "./Panels";
import { VarsBox } from "./VarsBox";

/**
 * Grid layouts (container queries on the stage):
 * narrow → stacked; wide → canvas | side (vars + panels) | code, with the note and controls underneath.
 */
const LAYOUT = {
  sideCode:
    "grid-cols-1 [grid-template-areas:'canvas'_'side'_'note'_'ctrl'_'code'] @3xl:grid-cols-[minmax(0,1fr)_minmax(17rem,22rem)] @3xl:[grid-template-areas:'canvas_code'_'side_code'_'note_note'_'ctrl_ctrl'] @3xl:[grid-template-rows:1fr_auto_auto_auto] @6xl:[grid-template-rows:none] @6xl:grid-cols-[minmax(0,1fr)_15rem_minmax(18rem,24rem)] @6xl:[grid-template-areas:'canvas_side_code'_'note_note_note'_'ctrl_ctrl_ctrl']",
  side: "grid-cols-1 [grid-template-areas:'canvas'_'side'_'note'_'ctrl'] @2xl:grid-cols-[minmax(0,1fr)_15rem] @2xl:[grid-template-areas:'canvas_side'_'note_note'_'ctrl_ctrl']",
  code: "grid-cols-1 [grid-template-areas:'canvas'_'note'_'ctrl'_'code'] @3xl:grid-cols-[minmax(0,1fr)_minmax(17rem,22rem)] @3xl:[grid-template-areas:'canvas_code'_'note_note'_'ctrl_ctrl']",
  none: "grid-cols-1 [grid-template-areas:'canvas'_'note'_'ctrl']",
} as const;

export function StageHeader({ visual, className }: { visual: Visual; className?: string }) {
  const { icon: Icon, label } = typeMeta(visual?.type);
  const colors = useMemo(() => usedColors(visual), [visual]);
  return (
    <header className={cn("flex flex-wrap items-start justify-between gap-x-4 gap-y-1.5", className)}>
      <div className="flex min-w-0 items-start gap-2.5">
        <span
          aria-hidden
          className="mt-px inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand"
        >
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold leading-snug tracking-tight text-foreground">
            <span className="sr-only">{label}: </span>
            {visual?.title || label}
          </h3>
          {visual?.caption ? <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{visual.caption}</p> : null}
        </div>
      </div>
      <Legend colors={colors} className="pt-1" />
    </header>
  );
}

/** One visual with its step player. */
export function VisualStage({
  visual,
  code,
  initialStep = 0,
  onStepChange,
  className,
}: {
  visual: Visual;
  code?: string;
  initialStep?: number;
  onStepChange?: (i: number) => void;
  className?: string;
}) {
  const t = useT();
  const count = stepCount(visual);
  const features = useMemo(() => visualFeatures(visual), [visual]);
  const narration = useNarration();
  const narrationText = useCallback(
    (i: number) => {
      const note = plainText(stepMeta(visual, i).note) || `Step ${i + 1}.`;
      return i === 0 && visual?.title ? `${visual.title}. ${note}` : note;
    },
    [visual],
  );
  const player = useStepPlayer(count, initialStep, onStepChange, { on: narration.on, text: narrationText });
  const { label } = typeMeta(visual?.type);

  if (visual?.type === "comparison") {
    return (
      <section aria-label={`${label}: ${visual.title}`} className={cn("flex flex-col gap-3 @container", className)}>
        <StageHeader visual={visual} />
        <StepCanvas visual={visual} index={0} />
      </section>
    );
  }

  const index = player.index;
  const meta = stepMeta(visual, index);
  const prevMeta = index > 0 ? stepMeta(visual, index - 1) : undefined;
  const codeText = typeof code === "string" && code.trim() ? code : undefined;
  const hasCode = !!codeText && features.codeLine;
  const hasSide = visual.type !== "diagram" && (features.vars || features.panels);
  const layout = hasSide && hasCode ? LAYOUT.sideCode : hasSide ? LAYOUT.side : hasCode ? LAYOUT.code : LAYOUT.none;
  const multi = count > 1;

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (!multi || e.altKey || e.ctrlKey || e.metaKey) return;
    const t = e.target as HTMLElement;
    const tag = t.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || t.isContentEditable) return;
    switch (e.key) {
      case "ArrowRight":
        e.preventDefault();
        player.next();
        break;
      case "ArrowLeft":
        e.preventDefault();
        player.prev();
        break;
      case " ":
      case "Spacebar":
        if (tag === "BUTTON" || tag === "A") return; // native activation
        e.preventDefault();
        player.toggle();
        break;
      case "Home":
        e.preventDefault();
        player.restart();
        break;
      case "End":
        e.preventDefault();
        player.go(count - 1);
        break;
      case "n":
      case "N":
        if (!narration.supported) return;
        e.preventDefault();
        narration.toggle();
        break;
    }
  };

  return (
    <section
      tabIndex={0}
      aria-label={`${label}: ${visual.title}`}
      aria-roledescription="visual walkthrough"
      onKeyDown={onKeyDown}
      className={cn("flex flex-col gap-3 rounded-xl outline-none @container focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-surface", className)}
    >
      <StageHeader visual={visual} />

      <div className={cn("grid gap-2.5 @3xl:gap-3", layout)}>
        <div
          className="relative flex min-w-0 flex-col rounded-xl border border-border bg-background/70 bg-[radial-gradient(var(--border)_1px,transparent_1px)] [background-size:18px_18px] p-2.5 [grid-area:canvas] @container @md:p-4"
        >
          <VisualErrorBoundary resetKey={index} label={`${label.toLowerCase()} step`}>
            {/* flex-1: the canvas takes any extra row height so its box lines up with the code pane */}
            <div className="flex min-h-32 w-full flex-1 items-center justify-center">
              <StepCanvas visual={visual} index={index} />
            </div>
          </VisualErrorBoundary>
        </div>

        {hasSide ? (
          <div className="grid min-w-0 content-start gap-2.5 [grid-area:side] [grid-template-columns:repeat(auto-fill,minmax(min(100%,12rem),1fr))]">
            {features.vars ? <VarsBox vars={meta.vars} prevVars={prevMeta?.vars} /> : null}
            {meta.panels.map((p, i) => (
              <VisualErrorBoundary key={`${i}-${p?.kind}-${p?.title}`} resetKey={index} label="panel">
                <PanelCard panel={p} />
              </VisualErrorBoundary>
            ))}
          </div>
        ) : null}

        {hasCode ? (
          <CodePane
            code={codeText!}
            activeLine={meta.codeLine}
            className="[grid-area:code]"
            maxHeightClass="max-h-64 @3xl:max-h-[26rem]"
          />
        ) : null}

        <div className="flex min-h-12 min-w-0 items-start gap-2.5 rounded-xl border border-border bg-surface-2/50 px-3 py-2 [grid-area:note]">
          {multi ? (
            <span className="mt-0.5 inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-brand px-1.5 font-mono text-[11px] font-semibold text-brand-foreground">
              {index + 1}
            </span>
          ) : null}
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            transition={T_FAST}
            className="min-w-0 flex-1 text-sm leading-relaxed text-foreground"
          >
            {meta.note ? <InlineMarkdown text={meta.note} /> : <span className="italic text-muted">{t.visualPlayer.noNote}</span>}
          </motion.div>
        </div>

        {multi ? (
          <div className="flex min-w-0 flex-col gap-1 [grid-area:ctrl]">
            <Controls player={player} label={visual.title || label} narration={narration} />
            <p className="hidden items-center gap-1.5 text-[11px] text-muted @2xl:flex">
              <Keyboard aria-hidden className="size-3.5" />
              {t.visualPlayer.keyboardHint}{narration.supported ? t.visualPlayer.keyboardHintNarrate : ""}.
            </p>
          </div>
        ) : null}
      </div>

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {multi ? `Step ${index + 1} of ${count}. ` : ""}
        {plainText(meta.note)}
      </p>
    </section>
  );
}
