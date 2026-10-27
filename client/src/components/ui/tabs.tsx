"use client";

import {
  createContext,
  useCallback,
  useContext,
  useId,
  useState,
  type ComponentProps,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface TabsContextValue {
  value: string;
  setValue: (v: string) => void;
  baseId: string;
  variant: "pills" | "underline";
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabs() {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("Tabs components must be used inside <Tabs>");
  return ctx;
}

const tabId = (base: string, v: string) => `${base}-tab-${v.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
const panelId = (base: string, v: string) => `${base}-panel-${v.replace(/[^a-zA-Z0-9_-]/g, "_")}`;

export interface TabsProps {
  /** controlled value */
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  variant?: "pills" | "underline";
  className?: string;
  children: ReactNode;
}

/**
 *   <Tabs defaultValue="js">
 *     <TabsList aria-label="Language"><TabsTrigger value="js">JS</TabsTrigger>…</TabsList>
 *     <TabsContent value="js">…</TabsContent>
 *   </Tabs>
 * Arrow keys / Home / End move between tabs (automatic activation).
 */
export function Tabs({ value, defaultValue, onValueChange, variant = "pills", className, children }: TabsProps) {
  const [inner, setInner] = useState(defaultValue ?? "");
  const baseId = useId();
  const current = value ?? inner;
  const setValue = useCallback(
    (v: string) => {
      if (value === undefined) setInner(v);
      onValueChange?.(v);
    },
    [value, onValueChange],
  );
  return (
    <TabsContext.Provider value={{ value: current, setValue, baseId, variant }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ className, children, ...props }: ComponentProps<"div">) {
  const { variant } = useTabs();

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const tabs = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]:not([disabled])'));
    const index = tabs.findIndex((t) => t === document.activeElement);
    if (index === -1) return;
    let next = index;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (index + 1) % tabs.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (index - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    else return;
    e.preventDefault();
    tabs[next]?.focus();
    tabs[next]?.click();
  }

  return (
    <div
      role="tablist"
      onKeyDown={onKeyDown}
      className={cn(
        "flex max-w-full items-center overflow-x-auto [scrollbar-width:none]",
        variant === "pills" ? "gap-1 rounded-lg bg-surface-2 p-1" : "gap-4 border-b border-border",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export interface TabsTriggerProps extends Omit<ComponentProps<"button">, "value"> {
  value: string;
}

export function TabsTrigger({ value, className, children, disabled, ...props }: TabsTriggerProps) {
  const { value: current, setValue, baseId, variant } = useTabs();
  const selected = current === value;
  return (
    <button
      type="button"
      role="tab"
      id={tabId(baseId, value)}
      aria-selected={selected}
      aria-controls={panelId(baseId, value)}
      tabIndex={selected ? 0 : -1}
      disabled={disabled}
      onClick={() => setValue(value)}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap text-sm font-medium transition-colors disabled:opacity-50 [&_svg]:size-4",
        variant === "pills"
          ? cn("h-8 rounded-md px-3", selected ? "text-foreground" : "text-muted hover:text-foreground")
          : cn("h-9 px-1", selected ? "text-foreground" : "text-muted hover:text-foreground"),
        className,
      )}
      {...props}
    >
      {selected && (
        <motion.span
          layoutId={`${baseId}-indicator`}
          aria-hidden
          transition={{ type: "spring", bounce: 0.15, duration: 0.35 }}
          className={cn(
            "absolute",
            variant === "pills"
              ? "inset-0 rounded-md border border-border bg-surface shadow-xs"
              : "inset-x-0 -bottom-px h-0.5 rounded-full bg-brand",
          )}
        />
      )}
      <span className="relative z-10 inline-flex items-center gap-1.5">{children}</span>
    </button>
  );
}

export interface TabsContentProps extends Omit<ComponentProps<"div">, "value"> {
  value: string;
  /** keep the panel mounted (hidden) when inactive */
  forceMount?: boolean;
}

export function TabsContent({ value, forceMount, className, children, ...props }: TabsContentProps) {
  const { value: current, baseId } = useTabs();
  const selected = current === value;
  if (!selected && !forceMount) return null;
  return (
    <div
      role="tabpanel"
      id={panelId(baseId, value)}
      aria-labelledby={tabId(baseId, value)}
      hidden={!selected}
      tabIndex={0}
      className={cn("focus-visible:outline-offset-4", className)}
      {...props}
    >
      {children}
    </div>
  );
}
