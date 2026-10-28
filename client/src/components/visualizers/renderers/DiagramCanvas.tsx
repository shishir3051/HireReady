"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { DiagramVisual } from "@/lib/types";
import { useIsDark } from "../lib/hooks";
import { renderMermaid } from "../lib/mermaid";
import { asArray, clamp, errorMessage } from "../lib/utils";
import { T } from "../lib/motion";
import { VisualErrorCard } from "../core/ErrorBoundary";
import { EmptyCanvas, type CanvasProps } from "./common";

interface Result {
  key: string;
  svg?: string;
  error?: string;
}

/** Rendered SVG strings by theme + source, so stepping back and forth is instant. */
const cache = new Map<string, Result>();

export function MermaidView({ source, className }: { source: string; className?: string }) {
  const dark = useIsDark();
  const key = `${dark ? "dark" : "light"}\u0000${source}`;
  const [result, setResult] = useState<Result | null>(null);
  // last successful render, kept on screen (dimmed) while the next frame renders
  const [shown, setShown] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    const hit = cache.get(key);
    const done = (r: Result) => {
      if (cancelled) return;
      setResult(r);
      if (r.svg) setShown(r);
    };
    if (hit) {
      queueMicrotask(() => done(hit));
    } else {
      renderMermaid(source, dark).then(
        (svg) => {
          const r = { key, svg };
          cache.set(key, r);
          done(r);
        },
        (err: unknown) => {
          const r = { key, error: errorMessage(err) };
          cache.set(key, r);
          done(r);
        },
      );
    }
    return () => {
      cancelled = true;
    };
  }, [key, source, dark]);

  const current = result && result.key === key ? result : null;
  if (current?.error) {
    return (
      <VisualErrorCard label="diagram" message={current.error} className={className}>
        <pre className="max-h-64 overflow-auto rounded-lg border border-border bg-surface py-2 font-mono text-[11px] leading-relaxed text-foreground">
          {source
            .replace(/\r\n?/g, "\n")
            .split("\n")
            .map((line, i) => (
              <div key={i} className="flex">
                <span aria-hidden className="w-8 shrink-0 select-none pr-2 text-right text-muted">
                  {i + 1}
                </span>
                <span className="whitespace-pre pr-3">{line}</span>
              </div>
            ))}
        </pre>
      </VisualErrorCard>
    );
  }
  const svg = current?.svg ?? shown?.svg;
  const loading = !current;
  return (
    <div className={className} aria-busy={loading}>
      {svg ? (
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={current?.key ?? shown?.key ?? "pending"}
            initial={{ opacity: 0 }}
            animate={{ opacity: loading ? 0.45 : 1 }}
            exit={{ opacity: 0 }}
            transition={T}
            className="hr-mermaid flex w-full justify-center overflow-x-auto [&_svg]:h-auto [&_svg]:max-w-full"
            // Mermaid output is sanitised by mermaid itself (securityLevel "strict").
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        </AnimatePresence>
      ) : (
        <div className="flex min-h-48 w-full animate-pulse items-center justify-center rounded-lg bg-surface-2/70 text-xs text-muted motion-off:animate-none">
          Rendering diagram…
        </div>
      )}
    </div>
  );
}

/** Mermaid diagram; each frame is one player step. */
export function DiagramCanvas({ visual, index }: CanvasProps<DiagramVisual>) {
  const frames = asArray(visual?.frames);
  const frame = frames[clamp(index, 0, frames.length - 1)];
  if (!frame || typeof frame.mermaid !== "string" || !frame.mermaid.trim()) return <EmptyCanvas>empty diagram</EmptyCanvas>;
  return <MermaidView source={frame.mermaid} className="w-full" />;
}
