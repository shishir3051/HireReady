"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { MessageSquareQuote, Play, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsClient } from "@/lib/storage";

const NUMS = [3, 8, 4, 1, 6];
const TARGET = 10;
// i = 0..4, the answer is found at i = 4 (need 4, seen at index 2)
const STEPS = NUMS.length;

/** Animated mini trace of Two Sum for the hero (decorative; the real player is further down the page). */
export function HeroPreview() {
  // Only honour reduced motion after hydration so server and client render the same first frame.
  const isClient = useIsClient();
  const prefersReduced = useReducedMotion();
  const reduce = isClient && prefersReduced === true;
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setTick((t) => (t + 1) % (STEPS + 2)), 1300);
    return () => clearInterval(id);
  }, [reduce]);

  const i = reduce ? STEPS - 1 : Math.min(tick, STEPS - 1);
  const found = i === STEPS - 1;
  const need = TARGET - NUMS[i]!;
  const seen = NUMS.slice(0, found ? i : i + 1).map((v, idx) => ({ v, idx }));

  return (
    <div className="relative mx-auto w-full max-w-md" aria-hidden>
      <div
        className="absolute -inset-6 -z-10 rounded-[2rem] opacity-80 blur-2xl"
        style={{
          background:
            "radial-gradient(60% 60% at 30% 20%, var(--brand-soft), transparent), radial-gradient(50% 50% at 90% 90%, color-mix(in oklch, var(--viz-info) 18%, transparent), transparent)",
        }}
      />
      {/* back cards */}
      <div className="absolute inset-x-6 -top-4 h-full rotate-[-3deg] rounded-2xl border border-border bg-surface/70 shadow-sm" />
      <div className="absolute inset-x-3 -top-2 h-full rotate-[1.5deg] rounded-2xl border border-border bg-surface/80 shadow-sm" />

      <div className="relative overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl shadow-brand/10">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="text-xs text-muted">Arrays &amp; Hashing · Easy</p>
            <p className="font-semibold">Two Sum</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand">
            <Play className="size-3" /> Step {i + 1}/{STEPS}
          </span>
        </div>

        <div className="space-y-4 p-4">
          {/* array */}
          <div>
            <p className="mb-2 font-mono text-[11px] text-muted">
              nums · target = {TARGET}
            </p>
            <div className="flex gap-1.5">
              {NUMS.map((n, idx) => {
                const current = idx === i;
                const answer = found && (idx === 2 || idx === 4);
                const visited = idx < i && !answer;
                return (
                  <div key={idx} className="flex flex-1 flex-col items-center gap-1">
                    <motion.div
                      layout
                      className={cn(
                        "grid h-11 w-full place-items-center rounded-lg border font-mono text-sm font-semibold transition-colors duration-300",
                        !current && !answer && !visited && "border-border bg-surface-2/60",
                      )}
                      style={
                        answer
                          ? { borderColor: "var(--viz-success)", backgroundColor: "color-mix(in oklch, var(--viz-success) 18%, transparent)" }
                          : current
                            ? { borderColor: "var(--viz-primary)", backgroundColor: "color-mix(in oklch, var(--viz-primary) 16%, transparent)" }
                            : visited
                              ? { borderColor: "color-mix(in oklch, var(--viz-info) 50%, var(--border))", backgroundColor: "color-mix(in oklch, var(--viz-info) 8%, transparent)" }
                              : undefined
                      }
                    >
                      {n}
                    </motion.div>
                    <span className="font-mono text-[10px] text-muted">{idx}</span>
                    <div className="h-4">
                      {current && (
                        <motion.span
                          layoutId="hero-pointer"
                          className="block font-mono text-[11px] font-bold"
                          style={{ color: "var(--viz-primary)" }}
                        >
                          ↑ i
                        </motion.span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* vars + map */}
          <div className="grid grid-cols-[auto_1fr] gap-3">
            <div className="rounded-lg border border-border bg-surface-2/50 px-3 py-2 font-mono text-xs">
              <p>
                <span className="text-muted">need</span> = {need}
              </p>
              <p className="mt-0.5">
                <span className="text-muted">i</span> = {i}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-surface-2/50 px-3 py-2">
              <p className="font-mono text-[11px] text-muted">seen (value → index)</p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                <AnimatePresence initial={false}>
                  {seen.map(({ v, idx }) => (
                    <motion.span
                      key={v}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="rounded border px-1.5 py-0.5 font-mono text-[11px]"
                      style={
                        found && v === need
                          ? { borderColor: "var(--viz-success)", color: "color-mix(in oklch, var(--viz-success) 75%, var(--foreground))" }
                          : { borderColor: "var(--border)" }
                      }
                    >
                      {v}→{idx}
                    </motion.span>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* note */}
          <div className="min-h-[3.25rem] rounded-lg bg-brand-soft/50 px-3 py-2.5 text-sm">
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={i}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
              >
                {found ? (
                  <>
                    <Sparkles className="mr-1 inline size-3.5 text-brand" />
                    need = 4 is in <code className="font-mono">seen</code> at index 2 → return <b>[2, 4]</b>
                  </>
                ) : (
                  <>
                    need = {TARGET} − {NUMS[i]} = {need}, not seen yet → store {NUMS[i]} → {i}
                  </>
                )}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>

        <div className="flex items-start gap-2.5 border-t border-border bg-surface-2/40 px-4 py-3 text-sm">
          <MessageSquareQuote className="mt-0.5 size-4 shrink-0 text-brand" />
          <p className="text-foreground/85">
            <span className="font-semibold text-foreground">Say this first:</span> one pass with a hash map from value to
            index; check each number&apos;s complement before storing it.
          </p>
        </div>
      </div>
    </div>
  );
}
