"use client";

import { useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Check, CircleAlert, LoaderCircle, LogIn, NotebookPen } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProgress } from "@/components/providers/progress-provider";
import { ButtonLink } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toneText } from "@/components/ui/badge";

const MAX_NOTES = 5000;
const SAVE_DELAY = 900;

const CONFIDENCE_LABELS = ["", "Lost", "Shaky", "Okay", "Good", "Nailed it"] as const;

/** Personal notes (debounced autosave) and a 1–5 confidence rating for a question. */
export function QuestionNotes({ slug }: { slug: string }) {
  const { ready, isLoggedIn, getProgress } = useProgress();
  const pathname = usePathname();

  if (!ready) {
    return (
      <div className="space-y-3 rounded-xl border border-border bg-surface p-4" aria-busy>
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="flex flex-col items-start gap-4 rounded-xl border border-dashed border-border bg-surface/60 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand">
            <NotebookPen className="size-5" aria-hidden />
          </span>
          <div>
            <p className="font-medium">Keep your own notes and rate your confidence</p>
            <p className="mt-0.5 text-sm text-muted">
              Write your 30-second answer in your own words — it is saved to your account.
            </p>
          </div>
        </div>
        <ButtonLink href={`/login?next=${encodeURIComponent(pathname || "/")}`} size="sm" leftIcon={<LogIn aria-hidden />}>
          Log in to take notes
        </ButtonLink>
      </div>
    );
  }

  const progress = getProgress(slug);
  return <NotesEditor key={slug} slug={slug} initialNotes={progress?.notes ?? ""} confidence={progress?.confidence ?? null} />;
}

type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

function NotesEditor({ slug, initialNotes, confidence }: { slug: string; initialNotes: string; confidence: number | null }) {
  const { update } = useProgress();
  const [text, setText] = useState(initialNotes);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(initialNotes);
  const saved = useRef(initialNotes);
  const updateRef = useRef(update);
  const id = useId();

  useEffect(() => {
    updateRef.current = update;
  });

  async function save() {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const value = latest.current;
    if (value === saved.current) {
      setSaveState("idle");
      return;
    }
    setSaveState("saving");
    const result = await updateRef.current(slug, { notes: value });
    if (result) {
      saved.current = value;
      setSaveState(latest.current === value ? "saved" : "dirty");
    } else {
      setSaveState("error");
    }
  }

  // Flush unsaved notes when leaving the page.
  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
      if (latest.current !== saved.current) void updateRef.current(slug, { notes: latest.current });
    };
  }, [slug]);

  function onChange(value: string) {
    const v = value.slice(0, MAX_NOTES);
    setText(v);
    latest.current = v;
    setSaveState("dirty");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void save(), SAVE_DELAY);
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="space-y-2 p-4">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor={id} className="text-sm font-medium">
            Your notes
          </label>
          <SaveIndicator state={saveState} />
        </div>
        <textarea
          id={id}
          value={text}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => {
            if (latest.current !== saved.current) void save();
          }}
          rows={6}
          maxLength={MAX_NOTES}
          placeholder={"Write the answer in your own words.\n- What would you say first?\n- Which edge cases would you mention?"}
          aria-describedby={`${id}-count`}
          className="min-h-36 w-full resize-y rounded-lg border border-border bg-background/60 px-3 py-2.5 font-mono text-[13px] leading-relaxed outline-none transition-[border-color,box-shadow] placeholder:font-sans placeholder:text-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25"
        />
        <p id={`${id}-count`} className="text-right text-xs tabular-nums text-muted">
          {text.length.toLocaleString("en-US")} / {MAX_NOTES.toLocaleString("en-US")}
        </p>
      </div>
      <ConfidencePicker slug={slug} value={confidence} />
    </div>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  const content =
    state === "saving" ? (
      <>
        <LoaderCircle className="size-3.5 animate-spin" aria-hidden /> Saving…
      </>
    ) : state === "saved" ? (
      <>
        <Check className="size-3.5" aria-hidden style={toneText("success")} /> Saved
      </>
    ) : state === "dirty" ? (
      <>Unsaved changes</>
    ) : state === "error" ? (
      <>
        <CircleAlert className="size-3.5" aria-hidden style={toneText("danger")} /> Not saved — will retry when you type
      </>
    ) : null;
  return (
    <span role="status" className="inline-flex items-center gap-1.5 text-xs text-muted">
      {content}
    </span>
  );
}

function ConfidencePicker({ slug, value }: { slug: string; value: number | null }) {
  const { getProgress, update } = useProgress();
  const current = getProgress(slug)?.confidence ?? value;
  return (
    <div className="flex flex-col gap-3 border-t border-border bg-surface-2/40 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm font-medium" id={`confidence-${slug}`}>
        How confident are you?
        {current ? <span className="ml-2 font-normal text-muted">{CONFIDENCE_LABELS[current]}</span> : null}
      </p>
      <div role="radiogroup" aria-labelledby={`confidence-${slug}`} className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => {
          const on = current === n;
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={`${n} — ${CONFIDENCE_LABELS[n]}`}
              title={on ? "Click again to clear" : CONFIDENCE_LABELS[n]}
              onClick={() => void update(slug, { confidence: on ? null : n })}
              className={cn(
                "grid size-9 place-items-center rounded-lg border text-sm font-semibold tabular-nums transition-colors",
                on
                  ? "border-transparent bg-brand text-brand-foreground"
                  : current && n < current
                    ? "border-brand/30 bg-brand-soft text-brand"
                    : "border-border bg-surface text-muted hover:border-brand/40 hover:text-foreground",
              )}
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}
