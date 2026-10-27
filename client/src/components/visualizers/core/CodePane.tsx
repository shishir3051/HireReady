"use client";

import { useEffect, useRef } from "react";
import { Highlight, themes } from "prism-react-renderer";
import { useReducedMotion } from "motion/react";
import { FileCode } from "lucide-react";
import { useIsDark } from "../lib/hooks";
import { cn } from "../lib/utils";

/**
 * Read-only highlighted code with an active line that is scrolled into view
 * *inside the pane* (never scrolls the page).
 */
export function CodePane({
  code,
  activeLine,
  language = "javascript",
  fileName = "solution.js",
  className,
  maxHeightClass = "max-h-80",
}: {
  code: string;
  /** 1-based */
  activeLine?: number;
  language?: string;
  fileName?: string;
  className?: string;
  maxHeightClass?: string;
}) {
  const dark = useIsDark();
  const reduced = useReducedMotion();
  const scroller = useRef<HTMLDivElement>(null);
  const source = String(code ?? "").replace(/\r\n?/g, "\n").replace(/\n+$/, "");
  const lineCount = source.split("\n").length;
  const valid = activeLine !== undefined && activeLine >= 1 && activeLine <= lineCount;

  useEffect(() => {
    const box = scroller.current;
    if (!box || !valid) return;
    const el = box.querySelector<HTMLElement>(`[data-line="${activeLine}"]`);
    if (!el) return;
    const top = el.offsetTop - box.clientHeight / 2 + el.offsetHeight / 2;
    box.scrollTo({ top: Math.max(0, top), behavior: reduced ? "auto" : "smooth" });
  }, [activeLine, valid, reduced, source]);

  return (
    <section
      aria-label="Synced solution code"
      className={cn("flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-surface-2/60", className)}
    >
      <header className="flex items-center justify-between gap-2 border-b border-border px-3 py-1">
        <span className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-muted">
          <FileCode aria-hidden className="size-3.5 shrink-0" />
          <span className="truncate font-mono">{fileName}</span>
        </span>
        <span className="font-mono text-[11px] text-muted" aria-live="off">
          {valid ? `line ${activeLine}` : activeLine !== undefined ? `line ${activeLine} (out of range)` : "—"}
        </span>
      </header>
      <Highlight code={source} language={language} theme={dark ? themes.oneDark : themes.oneLight}>
        {({ tokens, getLineProps, getTokenProps }) => (
          <div ref={scroller} className={cn("relative overflow-auto overscroll-contain py-1.5", maxHeightClass)}>
            <pre className="min-w-max font-mono text-[12.5px] leading-[1.6]">
              {tokens.map((line, i) => {
                const n = i + 1;
                const active = valid && n === activeLine;
                const lineProps = getLineProps({ line });
                return (
                  <div
                    key={i}
                    data-line={n}
                    {...lineProps}
                    style={undefined}
                    aria-current={active ? "step" : undefined}
                    className={cn(
                      "relative flex pr-4 transition-colors duration-200",
                      active ? "bg-brand-soft" : "bg-transparent",
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "absolute inset-y-0 left-0 w-0.5 transition-colors duration-200",
                        active ? "bg-brand" : "bg-transparent",
                      )}
                    />
                    <span
                      aria-hidden
                      className={cn(
                        "w-10 shrink-0 select-none pr-3 text-right tabular-nums",
                        active ? "font-semibold text-brand" : "text-muted/70",
                      )}
                    >
                      {n}
                    </span>
                    <span className="whitespace-pre">
                      {line.map((token, key) => {
                        const tp = getTokenProps({ token });
                        return <span key={key} className={tp.className} style={tp.style}>{tp.children}</span>;
                      })}
                    </span>
                  </div>
                );
              })}
            </pre>
          </div>
        )}
      </Highlight>
    </section>
  );
}
