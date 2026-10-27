"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CircleAlert, CircleCheck, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toneText } from "./badge";

export type ToastVariant = "default" | "success" | "error" | "info";

export interface ToastAction {
  label: string;
  /** navigate on click (closes the toast) */
  href?: string;
  onClick?: () => void;
}

export interface ToastOptions {
  title: ReactNode;
  description?: ReactNode;
  variant?: ToastVariant;
  action?: ToastAction;
  /** ms before auto-dismiss; 0 keeps it open. Default 4500 (6500 for errors). */
  duration?: number;
  /** replaces an existing toast with the same id instead of stacking */
  id?: string;
}

interface ToastRecord extends ToastOptions {
  id: string;
  variant: ToastVariant;
  duration: number;
}

export interface ToastApi {
  /** show a toast; returns its id */
  toast: (options: ToastOptions) => string;
  success: (title: ReactNode, description?: ReactNode) => string;
  error: (title: ReactNode, description?: ReactNode) => string;
  dismiss: (id?: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const MAX_TOASTS = 4;

/** Provides `useToast()` and renders the toast viewport (bottom-right, bottom-center on mobile). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id?: string) => {
    setToasts((list) => (id ? list.filter((t) => t.id !== id) : []));
  }, []);

  const toast = useCallback((options: ToastOptions) => {
    counter.current += 1;
    const id = options.id ?? `toast-${counter.current}`;
    const variant = options.variant ?? "default";
    const record: ToastRecord = {
      ...options,
      id,
      variant,
      duration: options.duration ?? (variant === "error" ? 6500 : 4500),
    };
    setToasts((list) => [...list.filter((t) => t.id !== id), record].slice(-MAX_TOASTS));
    return id;
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      toast,
      dismiss,
      success: (title, description) => toast({ title, description, variant: "success" }),
      error: (title, description) => toast({ title, description, variant: "error" }),
    }),
    [toast, dismiss],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        aria-relevant="additions"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[110] flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-0 sm:items-end"
      >
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

const ICONS = {
  default: null,
  success: CircleCheck,
  error: CircleAlert,
  info: Info,
} as const;

function ToastItem({ toast, onDismiss }: { toast: ToastRecord; onDismiss: (id: string) => void }) {
  const reduce = useReducedMotion();
  const [paused, setPaused] = useState(false);
  const Icon = ICONS[toast.variant];
  const { id, duration } = toast;

  useEffect(() => {
    if (!duration || paused) return;
    const t = setTimeout(() => onDismiss(id), duration);
    return () => clearTimeout(t);
  }, [id, duration, paused, onDismiss]);

  return (
    <motion.div
      layout={!reduce}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, x: 24, transition: { duration: 0.15 } }}
      transition={{ type: "spring", bounce: 0.2, duration: 0.35 }}
      role={toast.variant === "error" ? "alert" : "status"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={cn(
        "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-border bg-surface p-4 text-sm shadow-xl shadow-foreground/5",
      )}
    >
      {Icon && (
        <Icon
          className="mt-0.5 size-5 shrink-0"
          style={toneText(toast.variant === "success" ? "success" : toast.variant === "error" ? "danger" : "info")}
          aria-hidden
        />
      )}
      <div className="min-w-0 flex-1 space-y-1">
        <p className="font-medium leading-snug">{toast.title}</p>
        {toast.description && <p className="leading-relaxed text-muted">{toast.description}</p>}
        {toast.action && (
          <div className="pt-1">
            {toast.action.href ? (
              <Link
                href={toast.action.href}
                onClick={() => {
                  toast.action?.onClick?.();
                  onDismiss(id);
                }}
                className="text-sm font-semibold text-brand hover:underline"
              >
                {toast.action.label}
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => {
                  toast.action?.onClick?.();
                  onDismiss(id);
                }}
                className="text-sm font-semibold text-brand hover:underline"
              >
                {toast.action.label}
              </button>
            )}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(id)}
        className="-m-1 grid size-7 shrink-0 place-items-center rounded-md text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
        aria-label="Dismiss notification"
      >
        <X className="size-4" aria-hidden />
      </button>
    </motion.div>
  );
}
