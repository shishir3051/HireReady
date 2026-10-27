"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Lightbulb, RotateCcw } from "lucide-react";
import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";

/** Progressive hints: reveal one at a time, vaguest first. */
export function Hints({ hints }: { hints: string[] }) {
  const [shown, setShown] = useState(0);
  if (hints.length === 0) return null;
  const done = shown >= hints.length;

  return (
    <div className="space-y-3">
      <ol className="space-y-3" aria-live="polite">
        <AnimatePresence initial={false}>
          {hints.slice(0, shown).map((hint, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex gap-3 rounded-xl border border-border bg-surface px-4 py-3"
            >
              <span
                className="grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold"
                style={{
                  backgroundColor: "color-mix(in oklch, var(--viz-warning) 18%, transparent)",
                  color: "color-mix(in oklch, var(--viz-warning) 60%, var(--foreground))",
                }}
                aria-hidden
              >
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="sr-only">Hint {i + 1}:</p>
                <Markdown size="sm">{hint}</Markdown>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ol>
      <div className="flex flex-wrap items-center gap-2">
        {!done && (
          <Button variant="outline" onClick={() => setShown((n) => n + 1)} leftIcon={<Lightbulb aria-hidden />}>
            {shown === 0 ? "Show the first hint" : `Show hint ${shown + 1} of ${hints.length}`}
          </Button>
        )}
        {shown > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setShown(0)} leftIcon={<RotateCcw aria-hidden />}>
            Hide hints
          </Button>
        )}
        <span className="text-xs text-muted">
          {done ? "All hints shown." : `${hints.length - shown} hint${hints.length - shown === 1 ? "" : "s"} left`}
        </span>
      </div>
    </div>
  );
}
