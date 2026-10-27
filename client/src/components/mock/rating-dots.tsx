import { cn } from "@/lib/utils";
import { RATING_LABELS, ratingTone } from "./constants";

/** Five small dots filled up to `rating` (1–5); accepts averages (rounded for the fill). */
export function RatingDots({ rating, className, showLabel = false }: { rating: number; className?: string; showLabel?: boolean }) {
  const filled = Math.round(rating);
  const color = `var(--viz-${ratingTone(rating)})`;
  const label = Number.isInteger(rating) ? `${rating} of 5 – ${RATING_LABELS[rating] ?? ""}` : `${rating.toFixed(1)} of 5`;
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="inline-flex gap-0.5" role="img" aria-label={`Self-rating ${label}`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <span
            key={n}
            className="size-2 rounded-full bg-surface-2 ring-1 ring-inset ring-border"
            style={n <= filled ? { backgroundColor: color, boxShadow: "none" } : undefined}
          />
        ))}
      </span>
      {showLabel && (
        <span className="text-xs font-medium tabular-nums text-muted">
          {Number.isInteger(rating) ? RATING_LABELS[rating] : `${rating.toFixed(1)}/5`}
        </span>
      )}
    </span>
  );
}
