"use client";

import type { StateVisual } from "@/lib/types";
import { PanelCard } from "../core/Panels";
import { asArray, clamp } from "../lib/utils";
import { EmptyCanvas, type CanvasProps } from "./common";

/** Only panels (event loop, LRU cache, scheduler queues): a responsive grid of large panels. */
export function StateCanvas({ visual, index }: CanvasProps<StateVisual>) {
  const steps = asArray(visual?.steps);
  const step = steps[clamp(index, 0, steps.length - 1)];
  const panels = asArray(step?.panels).filter(Boolean);
  if (panels.length === 0) return <EmptyCanvas>no panels in this step</EmptyCanvas>;
  return (
    <div className="grid w-full gap-3 @lg:grid-cols-2 @4xl:grid-cols-[repeat(auto-fit,minmax(13rem,1fr))]">
      {panels.map((p, i) => (
        <PanelCard key={`${i}-${p.kind}-${p.title}`} panel={p} size="lg" />
      ))}
    </div>
  );
}
