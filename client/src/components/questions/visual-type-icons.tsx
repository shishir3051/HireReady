import type { VisualType } from "@/lib/types";
import { VISUAL_TYPE_LABELS } from "@/lib/constants";
import { VISUAL_TYPE_ICONS } from "@/lib/icons";
import { cn } from "@/lib/utils";

/** Row of small icons describing the visual walkthroughs a question has. */
export function VisualTypeIcons({ types, className }: { types: VisualType[]; className?: string }) {
  const unique = Array.from(new Set(types));
  if (unique.length === 0) return null;
  const label = `Visuals: ${unique.map((t) => VISUAL_TYPE_LABELS[t]).join(", ")}`;
  return (
    <span className={cn("inline-flex items-center gap-1 text-muted", className)} role="img" aria-label={label} title={label}>
      {unique.map((t) => {
        const Icon = VISUAL_TYPE_ICONS[t];
        return (
          <span key={t} className="grid size-6 place-items-center rounded-md bg-surface-2">
            <Icon className="size-3.5" aria-hidden />
          </span>
        );
      })}
    </span>
  );
}
