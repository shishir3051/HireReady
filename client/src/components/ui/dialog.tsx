"use client";

import { useEffect, useId, useRef, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsClient } from "@/lib/storage";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** accessible title (rendered in the header unless `hideHeader`) */
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  /** element to focus when opened (defaults to the first focusable element) */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /** render title/description visually hidden and drop the default header (custom layouts like the command palette) */
  hideHeader?: boolean;
  /** vertical placement */
  position?: "center" | "top";
  className?: string;
}

/**
 * Modal dialog: portal, focus trap, Escape / backdrop to close, scroll lock, focus restore.
 *
 *   <Dialog open={open} onOpenChange={setOpen} title="Delete note?" footer={<Button>…</Button>}>…</Dialog>
 */
export function Dialog(props: DialogProps) {
  const isClient = useIsClient();
  if (!isClient) return null;
  return createPortal(
    <AnimatePresence>{props.open && <DialogPanel key="dialog" {...props} />}</AnimatePresence>,
    document.body,
  );
}

function DialogPanel({
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = "md",
  initialFocusRef,
  hideHeader,
  position = "center",
  className,
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();
  const reduce = useReducedMotion();
  const onOpenChangeRef = useRef(onOpenChange);
  useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  });

  // focus management + scroll lock
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const target = initialFocusRef?.current ?? panel?.querySelector<HTMLElement>(FOCUSABLE) ?? panel;
    target?.focus({ preventScroll: true });

    const { overflow, paddingRight } = document.body.style;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onOpenChangeRef.current(false);
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (e.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
      previouslyFocused?.focus?.({ preventScroll: true });
    };
  }, [initialFocusRef]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] flex justify-center overflow-y-auto p-4",
        position === "center" ? "items-center" : "items-start pt-[12vh]",
      )}
    >
      <motion.div
        aria-hidden
        className="fixed inset-0 bg-foreground/30 backdrop-blur-[2px] dark:bg-background/70"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={() => onOpenChange(false)}
      />
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, y: 4, scale: 0.98 }}
        transition={{ duration: 0.16, ease: "easeOut" }}
        className={cn(
          "relative z-10 flex max-h-[calc(100dvh-2rem)] w-full flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl outline-none",
          size === "sm" && "max-w-sm",
          size === "md" && "max-w-lg",
          size === "lg" && "max-w-2xl",
          size === "xl" && "max-w-4xl",
          className,
        )}
      >
        {hideHeader ? (
          <div className="sr-only">
            <h2 id={titleId}>{title}</h2>
            {description && <p id={descId}>{description}</p>}
          </div>
        ) : (
          <div className="flex items-start justify-between gap-4 border-b border-border px-4 py-3 sm:px-5">
            <div className="min-w-0 space-y-1">
              <h2 id={titleId} className="text-base font-semibold leading-snug">
                {title}
              </h2>
              {description && (
                <p id={descId} className="text-sm text-muted">
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="-mr-1 grid size-8 shrink-0 place-items-center rounded-md text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
              aria-label="Close dialog"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        )}
        {children !== undefined && (
          <div className={cn("min-h-0 flex-1 overflow-y-auto", !hideHeader && "px-4 py-4 sm:px-5")}>{children}</div>
        )}
        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border bg-surface-2/50 px-4 py-2.5 sm:px-5">
            {footer}
          </div>
        )}
      </motion.div>
    </div>
  );
}
