import type { ColorKey, Panel, Scalar, Visual, VisualType } from "@/lib/types";
import {
  ArrowRightLeft,
  Columns3,
  ChartGantt,
  Grid3x3,
  Layers,
  Link2,
  type LucideIcon,
  Network,
  Rows3,
  Table2,
  Workflow,
  ListTree,
} from "lucide-react";
import { isColorKey } from "./colors";
import { asArray } from "./utils";

export interface StepMeta {
  note: string;
  vars?: Record<string, Scalar>;
  panels: Panel[];
  codeLine?: number;
}

/** Number of player steps: diagram frames, or steps; comparison has none (static). */
export function stepCount(v: Visual): number {
  switch (v.type) {
    case "comparison":
      return 0;
    case "diagram":
      return asArray(v.frames).length;
    default:
      return asArray((v as { steps?: unknown[] }).steps).length;
  }
}

export function stepMeta(v: Visual, i: number): StepMeta {
  if (v.type === "comparison") return { note: "", panels: [] };
  if (v.type === "diagram") {
    const f = asArray(v.frames)[i];
    return { note: f?.note ?? "", panels: [] };
  }
  const s = asArray(v.steps as { note?: string; vars?: Record<string, Scalar>; panels?: Panel[]; codeLine?: number }[])[i];
  if (!s) return { note: "", panels: [] };
  const vars = s.vars && typeof s.vars === "object" && !Array.isArray(s.vars) ? s.vars : undefined;
  return {
    note: typeof s.note === "string" ? s.note : "",
    vars,
    panels: asArray(s.panels),
    codeLine: typeof s.codeLine === "number" && Number.isFinite(s.codeLine) ? s.codeLine : undefined,
  };
}

/** Whether any step carries vars / side panels / a codeLine (used to keep the layout stable across steps). */
export function visualFeatures(v: Visual): { vars: boolean; panels: boolean; codeLine: boolean } {
  const n = stepCount(v);
  let vars = false;
  let panels = false;
  let codeLine = false;
  for (let i = 0; i < n; i++) {
    const m = stepMeta(v, i);
    if (m.vars && Object.keys(m.vars).length > 0) vars = true;
    if (m.panels.length > 0 && v.type !== "state") panels = true;
    if (m.codeLine !== undefined) codeLine = true;
  }
  return { vars, panels, codeLine };
}

/** Semantic colors that the visual's data explicitly uses (pointer colors are identity, not semantics). */
export function usedColors(v: Visual): ColorKey[] {
  const set = new Set<ColorKey>();
  const add = (c: unknown) => {
    if (isColorKey(c)) set.add(c);
  };
  switch (v.type) {
    case "array":
      for (const s of asArray(v.steps))
        for (const r of asArray(s?.arrays)) {
          for (const h of asArray(r?.highlights)) add(h?.color);
          for (const g of asArray(r?.ranges)) add(g?.color ?? "info");
        }
      break;
    case "grid":
      for (const s of asArray(v.steps)) for (const h of asArray(s?.highlights)) add(h?.color);
      break;
    case "linked-list":
    case "tree":
      for (const s of asArray(v.steps as { highlights?: { color: ColorKey }[] }[])) for (const h of asArray(s?.highlights)) add(h?.color);
      break;
    case "graph":
      for (const s of asArray(v.steps)) {
        for (const h of asArray(s?.nodeHighlights)) add(h?.color);
        for (const h of asArray(s?.edgeHighlights)) add(h?.color);
      }
      break;
    case "table":
      for (const s of asArray(v.steps))
        for (const t of asArray(s?.tables)) for (const h of asArray(t?.highlightRows)) add(h?.color);
      break;
    case "timeline":
      for (const s of asArray(v.steps)) for (const g of asArray(s?.segments)) add(g?.color);
      break;
    default:
      break;
  }
  const order: ColorKey[] = ["primary", "warning", "info", "success", "danger", "muted"];
  return order.filter((c) => set.has(c));
}

export const TYPE_META: Record<VisualType, { label: string; icon: LucideIcon }> = {
  array: { label: "Array", icon: Columns3 },
  grid: { label: "Grid", icon: Grid3x3 },
  "linked-list": { label: "Linked list", icon: Link2 },
  tree: { label: "Tree", icon: ListTree },
  graph: { label: "Graph", icon: Network },
  table: { label: "Table", icon: Table2 },
  state: { label: "State", icon: Layers },
  timeline: { label: "Timeline", icon: ChartGantt },
  diagram: { label: "Diagram", icon: Workflow },
  comparison: { label: "Comparison", icon: ArrowRightLeft },
};

export function typeMeta(t: string): { label: string; icon: LucideIcon } {
  return (TYPE_META as Record<string, { label: string; icon: LucideIcon }>)[t] ?? { label: String(t), icon: Rows3 };
}
