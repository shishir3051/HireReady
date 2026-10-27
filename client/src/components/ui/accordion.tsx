"use client";

import { useId, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** Bordered list wrapper for AccordionItems. */
export function Accordion({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface", className)}>
      {children}
    </div>
  );
}

export interface AccordionItemProps {
  title: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  /** controlled */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** element rendered before the title (icon, number) */
  leading?: ReactNode;
  headingLevel?: 3 | 4;
  className?: string;
}

export function AccordionItem({
  title,
  children,
  defaultOpen = false,
  open: controlled,
  onOpenChange,
  leading,
  headingLevel = 3,
  className,
}: AccordionItemProps) {
  const [inner, setInner] = useState(defaultOpen);
  const open = controlled ?? inner;
  const id = useId();
  const Heading = headingLevel === 3 ? "h3" : "h4";

  function toggle() {
    const next = !open;
    if (controlled === undefined) setInner(next);
    onOpenChange?.(next);
  }

  return (
    <div className={className}>
      <Heading className="m-0">
        <button
          type="button"
          id={`${id}-trigger`}
          aria-expanded={open}
          aria-controls={`${id}-panel`}
          onClick={toggle}
          className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-surface-2/60 sm:px-5"
        >
          {leading}
          <span className="min-w-0 flex-1">{title}</span>
          <ChevronDown
            className={cn("size-4 shrink-0 text-muted transition-transform duration-200", open && "rotate-180")}
            aria-hidden
          />
        </button>
      </Heading>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={`${id}-panel`}
            role="region"
            aria-labelledby={`${id}-trigger`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 text-sm leading-relaxed text-muted sm:px-5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
