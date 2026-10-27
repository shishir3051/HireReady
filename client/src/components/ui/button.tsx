import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "soft" | "danger" | "link";
export type ButtonSize = "xs" | "sm" | "md" | "lg" | "icon" | "icon-sm";

const base =
  "inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-[background-color,border-color,color,box-shadow,transform] duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg]:shrink-0";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-brand text-brand-foreground shadow-sm shadow-brand/20 hover:bg-brand/90",
  secondary: "bg-surface-2 text-foreground hover:bg-border/70",
  outline: "border border-border bg-surface text-foreground shadow-xs hover:border-brand/40 hover:bg-surface-2",
  ghost: "text-foreground hover:bg-surface-2",
  soft: "bg-brand-soft text-brand hover:bg-brand-soft/70",
  danger: "bg-viz-danger text-brand-foreground shadow-sm hover:bg-viz-danger/90",
  link: "h-auto px-0 text-brand underline-offset-4 hover:underline active:translate-y-0",
};

const sizes: Record<ButtonSize, string> = {
  xs: "h-7 px-2.5 text-xs [&_svg]:size-3.5",
  sm: "h-8 px-3 text-sm [&_svg]:size-4",
  md: "h-9 px-4 text-sm [&_svg]:size-4",
  lg: "h-11 px-5 text-base [&_svg]:size-5",
  icon: "size-9 [&_svg]:size-5",
  "icon-sm": "size-8 [&_svg]:size-4",
};

/** Class names for anything that should look like a button (links, labels). */
export function buttonVariants({
  variant = "primary",
  size = "md",
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) {
  return cn(base, variants[variant], variant === "link" ? "" : sizes[size], className);
}

export interface ButtonProps extends ComponentProps<"button"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** shows a spinner, disables the button and sets aria-busy */
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export function Button({
  variant,
  size,
  loading = false,
  leftIcon,
  rightIcon,
  className,
  disabled,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonVariants({ variant, size, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <LoaderCircle className="animate-spin" aria-hidden /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  );
}

export interface ButtonLinkProps extends ComponentProps<typeof Link> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

/** A next/link styled as a button. */
export function ButtonLink({ variant, size, leftIcon, rightIcon, className, children, ...props }: ButtonLinkProps) {
  return (
    <Link className={buttonVariants({ variant, size, className })} {...props}>
      {leftIcon}
      {children}
      {rightIcon}
    </Link>
  );
}
