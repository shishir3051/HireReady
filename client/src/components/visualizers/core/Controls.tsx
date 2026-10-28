"use client";

import { Pause, Play, RotateCcw, StepBack, StepForward, Volume2, VolumeOff } from "lucide-react";
import { useT } from "@/i18n";
import { SPEEDS, type StepPlayer } from "../lib/hooks";
import { cn } from "../lib/utils";

interface NarrationToggle {
  on: boolean;
  supported: boolean;
  toggle: () => void;
}

const iconBtn =
  "inline-flex size-9 items-center justify-center rounded-lg border border-border bg-surface text-foreground shadow-xs transition-[background-color,border-color,color,opacity,transform] duration-200 hover:bg-surface-2 active:scale-95 disabled:pointer-events-none disabled:opacity-40 motion-reduce:active:scale-100";

/** prev / play-pause / next / restart, narrate, speed, scrubber and "Step 3 / 9". */
export function Controls({
  player,
  label,
  narration,
  className,
}: {
  player: StepPlayer;
  label: string;
  narration?: NarrationToggle;
  className?: string;
}) {
  const t = useT();
  const { index, count, playing, speed } = player;
  const pct = count <= 1 ? 100 : (index / (count - 1)) * 100;
  const showTicks = count > 1 && count <= 40;
  return (
    <div
      role="group"
      aria-label={`${label} player controls`}
      className={cn("flex flex-wrap items-center gap-x-3 gap-y-1.5", className)}
    >
      <div className="flex items-center gap-1.5">
        <button type="button" className={iconBtn} onClick={player.restart} disabled={player.atStart} aria-label={t.visualPlayer.restart} title={t.visualPlayer.restart}>
          <RotateCcw aria-hidden className="size-4" />
        </button>
        <button type="button" className={iconBtn} onClick={player.prev} disabled={player.atStart} aria-label={t.visualPlayer.prev} title={`${t.visualPlayer.prev} (←)`}>
          <StepBack aria-hidden className="size-4" />
        </button>
        <button
          type="button"
          onClick={player.toggle}
          disabled={count <= 1}
          aria-label={playing ? t.visualPlayer.pause : player.atEnd ? t.visualPlayer.restart : t.visualPlayer.play}
          title={playing ? `${t.visualPlayer.pause} (space)` : `${t.visualPlayer.play} (space)`}
          className={cn(
            iconBtn,
            "w-11 border-transparent bg-brand text-brand-foreground hover:bg-brand/90",
          )}
        >
          {playing ? <Pause aria-hidden className="size-4" /> : <Play aria-hidden className="size-4 translate-x-px" />}
        </button>
        <button type="button" className={iconBtn} onClick={player.next} disabled={player.atEnd} aria-label={t.visualPlayer.next} title={`${t.visualPlayer.next} (→)`}>
          <StepForward aria-hidden className="size-4" />
        </button>
        {narration?.supported && (
          <button
            type="button"
            onClick={narration.toggle}
            aria-pressed={narration.on}
            aria-label={t.visualPlayer.narrate}
            title={narration.on ? `${t.visualPlayer.narrating} (N)` : `${t.visualPlayer.narrate} (N)`}
            className={cn(
              iconBtn,
              "w-auto gap-1.5 px-2.5 text-xs font-medium",
              narration.on && "border-brand/40 bg-brand-soft text-brand hover:bg-brand-soft",
            )}
          >
            {narration.on ? <Volume2 aria-hidden className="size-4" /> : <VolumeOff aria-hidden className="size-4" />}
            <span className="hidden @md:inline">{t.visualPlayer.narrate}</span>
          </button>
        )}
      </div>

      <span className="ml-auto font-mono text-xs tabular-nums text-muted @lg:ml-1" aria-hidden>
        {t.visualPlayer.step} <span className="font-semibold text-foreground">{index + 1}</span> {t.visualPlayer.of} {count}
      </span>

      <div className="flex min-w-0 basis-full items-center gap-3 @lg:basis-0 @lg:flex-1">
        <div className="group relative h-6 min-w-0 flex-1">
          <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-full bg-surface-2 ring-1 ring-inset ring-border">
            <div
              className="h-full rounded-full bg-brand transition-[width] duration-250 ease-out motion-reduce:transition-none"
              style={{ width: `${pct}%` }}
            />
          </div>
          {showTicks && (
            <div aria-hidden className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2">
              {Array.from({ length: count }, (_, i) => (
                <span
                  key={i}
                  className={cn(
                    "absolute top-1/2 size-1 -translate-x-1/2 -translate-y-1/2 rounded-full",
                    i <= index ? "bg-brand-foreground/70" : "bg-muted/40",
                  )}
                  style={{ left: `${(i / (count - 1)) * 100}%` }}
                />
              ))}
            </div>
          )}
          <div
            aria-hidden
            className="pointer-events-none absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-brand bg-surface shadow-sm transition-[left] duration-250 ease-out group-has-[:focus-visible]:ring-2 group-has-[:focus-visible]:ring-ring motion-reduce:transition-none"
            style={{ left: `${pct}%` }}
          />
          <input
            type="range"
            min={1}
            max={Math.max(1, count)}
            step={1}
            value={index + 1}
            disabled={count <= 1}
            onChange={(e) => {
              player.pause();
              player.go(Number(e.currentTarget.value) - 1);
            }}
            aria-label="Step"
            aria-valuetext={`Step ${index + 1} of ${count}`}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0 outline-none disabled:cursor-default"
          />
        </div>

      <div role="radiogroup" aria-label="Playback speed" className="flex shrink-0 items-center rounded-lg border border-border bg-surface-2 p-0.5">
        {SPEEDS.map((s) => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={speed === s}
            onClick={() => player.setSpeed(s)}
            className={cn(
              "h-7 rounded-md px-2 font-mono text-[11px] font-medium transition-colors duration-200",
              speed === s ? "bg-surface text-foreground shadow-xs ring-1 ring-border" : "text-muted hover:text-foreground",
            )}
          >
            {s}x
          </button>
        ))}
      </div>
      </div>
    </div>
  );
}
