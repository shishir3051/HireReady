import type { CSSProperties, ComponentProps, ReactNode } from "react";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ColorKey, Difficulty, Frequency, QuestionKind } from "@/lib/types";
import { DIFFICULTY_LABELS, FREQUENCY_LABELS, KIND_LABELS } from "@/lib/constants";
import { KIND_ICONS } from "@/lib/icons";

/** Semantic tones backed by the design tokens in globals.css. */
export type Tone = ColorKey | "brand" | "neutral" | "easy" | "medium" | "hard";

const TONE_VARS: Record<Exclude<Tone, "neutral">, string> = {
  brand: "--brand",
  primary: "--viz-primary",
  success: "--viz-success",
  warning: "--viz-warning",
  danger: "--viz-danger",
  info: "--viz-info",
  muted: "--muted",
  easy: "--easy",
  medium: "--medium",
  hard: "--hard",
};

/**
 * Readable foreground/soft background for a tone in both themes. The text colour is mixed towards
 * --foreground so light tones (warning/medium) keep enough contrast on light surfaces.
 */
export function toneStyle(tone: Tone, opts: { solid?: boolean } = {}): CSSProperties {
  if (tone === "neutral") return {};
  const v = `var(${TONE_VARS[tone]})`;
  if (opts.solid) return { backgroundColor: v, color: "var(--brand-foreground)" };
  return {
    color: `color-mix(in oklch, ${v} 72%, var(--foreground))`,
    backgroundColor: `color-mix(in oklch, ${v} 13%, transparent)`,
    borderColor: `color-mix(in oklch, ${v} 32%, transparent)`,
  };
}

/** Text colour only (for icons and inline text). */
export function toneText(tone: Tone): CSSProperties {
  if (tone === "neutral") return {};
  return { color: `color-mix(in oklch, var(${TONE_VARS[tone]}) 78%, var(--foreground))` };
}

export interface BadgeProps extends ComponentProps<"span"> {
  tone?: Tone;
  variant?: "soft" | "outline" | "solid";
  size?: "sm" | "md";
  icon?: ReactNode;
}

export function Badge({
  tone = "neutral",
  variant = "soft",
  size = "sm",
  icon,
  className,
  style,
  children,
  ...props
}: BadgeProps) {
  const neutral = tone === "neutral";
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 whitespace-nowrap rounded-full border font-medium leading-none [&_svg]:size-3 [&_svg]:shrink-0",
        size === "sm" ? "h-6 px-2 text-xs" : "h-7 px-2.5 text-sm",
        neutral && variant === "soft" && "border-transparent bg-surface-2 text-muted",
        neutral && variant === "outline" && "border-border bg-transparent text-muted",
        neutral && variant === "solid" && "border-transparent bg-foreground text-background",
        !neutral && variant === "outline" && "bg-transparent",
        !neutral && variant === "solid" && "border-transparent",
        className,
      )}
      style={{
        ...(neutral ? {} : toneStyle(tone, { solid: variant === "solid" })),
        ...(variant === "outline" && !neutral ? { backgroundColor: "transparent" } : {}),
        ...style,
      }}
      {...props}
    >
      {icon}
      {children !== null && children !== undefined && children !== false && <span className="truncate">{children}</span>}
    </span>
  );
}

export function DifficultyBadge({ difficulty, className, size }: { difficulty: Difficulty; className?: string; size?: "sm" | "md" }) {
  return (
    <Badge tone={difficulty} size={size} className={className}>
      {DIFFICULTY_LABELS[difficulty]}
    </Badge>
  );
}

export function KindBadge({ kind, className, size }: { kind: QuestionKind; className?: string; size?: "sm" | "md" }) {
  const Icon = KIND_ICONS[kind];
  return (
    <Badge variant="outline" size={size} className={className} icon={<Icon aria-hidden />}>
      {KIND_LABELS[kind]}
    </Badge>
  );
}

const FREQUENCY_FLAMES: Record<Frequency, number> = { "very-high": 3, high: 2, medium: 1 };

export function FrequencyBadge({
  frequency,
  className,
  size,
  compact = false,
}: {
  frequency: Frequency;
  className?: string;
  size?: "sm" | "md";
  /** flames only, label in title/aria */
  compact?: boolean;
}) {
  const flames = FREQUENCY_FLAMES[frequency];
  const label = FREQUENCY_LABELS[frequency];
  return (
    <Badge
      tone={frequency === "very-high" ? "danger" : frequency === "high" ? "warning" : "neutral"}
      size={size}
      className={className}
      title={`Asked frequency: ${label}`}
      aria-label={compact ? `Asked frequency: ${label}` : undefined}
      icon={
        <span className="inline-flex -space-x-1" aria-hidden>
          {Array.from({ length: flames }, (_, i) => (
            <Flame key={i} />
          ))}
        </span>
      }
    >
      {compact ? null : label}
    </Badge>
  );
}

/** Small "#tag" chip. */
export function TagBadge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-md bg-surface-2 px-2 font-mono text-[11px] text-muted",
        className,
      )}
    >
      #{children}
    </span>
  );
}
