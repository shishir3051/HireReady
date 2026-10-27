import type { ComponentProps, ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const control =
  "w-full rounded-lg border border-border bg-surface text-sm text-foreground shadow-xs transition-[border-color,box-shadow] placeholder:text-muted/80 hover:border-muted/50 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-viz-danger aria-invalid:focus-visible:ring-viz-danger/25";

export interface InputProps extends ComponentProps<"input"> {
  invalid?: boolean;
  /** icon rendered inside the left edge */
  leftIcon?: ReactNode;
  /** content rendered inside the right edge (e.g. a Kbd or clear button) */
  rightSlot?: ReactNode;
  wrapperClassName?: string;
}

export function Input({ className, invalid, leftIcon, rightSlot, wrapperClassName, ...props }: InputProps) {
  const input = (
    <input
      aria-invalid={invalid || undefined}
      className={cn(control, "h-9 px-3", leftIcon && "pl-9", rightSlot && "pr-10", className)}
      {...props}
    />
  );
  if (!leftIcon && !rightSlot) return input;
  return (
    <div className={cn("relative", wrapperClassName)}>
      {leftIcon && (
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted [&_svg]:size-4">
          {leftIcon}
        </span>
      )}
      {input}
      {rightSlot && <span className="absolute inset-y-0 right-2 flex items-center">{rightSlot}</span>}
    </div>
  );
}

export interface TextareaProps extends ComponentProps<"textarea"> {
  invalid?: boolean;
}

export function Textarea({ className, invalid, ...props }: TextareaProps) {
  return (
    <textarea
      aria-invalid={invalid || undefined}
      className={cn(control, "min-h-24 resize-y px-3 py-2 leading-relaxed", className)}
      {...props}
    />
  );
}

export interface SelectProps extends ComponentProps<"select"> {
  invalid?: boolean;
  wrapperClassName?: string;
}

/** Native select (best on mobile) with token styling. */
export function Select({ className, wrapperClassName, invalid, children, ...props }: SelectProps) {
  return (
    <div className={cn("relative", wrapperClassName)}>
      <select
        aria-invalid={invalid || undefined}
        className={cn(control, "h-9 cursor-pointer appearance-none pl-3 pr-9", className)}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted"
        aria-hidden
      />
    </div>
  );
}

export interface CheckboxProps extends Omit<ComponentProps<"input">, "type"> {
  label?: ReactNode;
  description?: ReactNode;
}

/** Native checkbox with an optional clickable label. */
export function Checkbox({ label, description, className, id, ...props }: CheckboxProps) {
  const box = (
    <input
      type="checkbox"
      id={id}
      className={cn(
        "mt-0.5 size-4 shrink-0 cursor-pointer rounded border-border accent-brand disabled:cursor-not-allowed",
        !label && className,
      )}
      {...props}
    />
  );
  if (!label) return box;
  return (
    <label htmlFor={id} className={cn("flex cursor-pointer items-start gap-2.5 text-sm", className)}>
      {box}
      <span className="min-w-0">
        <span className="block leading-snug">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-muted">{description}</span>}
      </span>
    </label>
  );
}

export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label className={cn("text-sm font-medium leading-none", className)} {...props} />;
}

/** ids for wiring a control to its hint and error text */
export function fieldDescribedBy(id: string, opts: { hint?: unknown; error?: unknown }) {
  if (opts.error) return `${id}-error`;
  if (opts.hint) return `${id}-hint`;
  return undefined;
}

export interface FieldProps {
  /** id of the control inside */
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  /** content rendered at the right of the label row (e.g. "Forgot password?") */
  labelAside?: ReactNode;
  className?: string;
  children: ReactNode;
}

/**
 * Label + control + hint/error. Give the control `id={id}`, `invalid={!!error}` and
 * `aria-describedby={fieldDescribedBy(id, { hint, error })}`.
 */
export function Field({ id, label, hint, error, labelAside, className, children }: FieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        {labelAside}
      </div>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-xs font-medium" style={{ color: "var(--viz-danger)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
