"use client";

import type { Visual } from "@/lib/types";
import { ArrayCanvas } from "./ArrayCanvas";
import { ComparisonTable } from "./ComparisonTable";
import { DiagramCanvas } from "./DiagramCanvas";
import { GraphCanvas } from "./GraphCanvas";
import { GridCanvas } from "./GridCanvas";
import { LinkedListCanvas } from "./LinkedListCanvas";
import { StateCanvas } from "./StateCanvas";
import { TableCanvas } from "./TableCanvas";
import { TimelineCanvas } from "./TimelineCanvas";
import { TreeCanvas } from "./TreeCanvas";
import { EmptyCanvas } from "./common";

/** Draws one step (or frame) of any visual type. */
export function StepCanvas({ visual, index, variant = "full" }: { visual: Visual; index: number; variant?: "full" | "thumb" }) {
  switch (visual?.type) {
    case "array":
      return <ArrayCanvas visual={visual} index={index} variant={variant} />;
    case "grid":
      return <GridCanvas visual={visual} index={index} variant={variant} />;
    case "linked-list":
      return <LinkedListCanvas visual={visual} index={index} variant={variant} />;
    case "tree":
      return <TreeCanvas visual={visual} index={index} variant={variant} />;
    case "graph":
      return <GraphCanvas visual={visual} index={index} variant={variant} />;
    case "table":
      return <TableCanvas visual={visual} index={index} variant={variant} />;
    case "state":
      return <StateCanvas visual={visual} index={index} variant={variant} />;
    case "timeline":
      return <TimelineCanvas visual={visual} index={index} variant={variant} />;
    case "diagram":
      return <DiagramCanvas visual={visual} index={index} variant={variant} />;
    case "comparison":
      return <ComparisonTable visual={visual} />;
    default:
      return <EmptyCanvas>unsupported visual type “{String((visual as { type?: unknown })?.type)}”</EmptyCanvas>;
  }
}
