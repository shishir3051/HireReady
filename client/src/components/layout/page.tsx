import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Centered page width with responsive gutters that scale for ultrawide and big screens. */
export function Container({
  className,
  size = "default",
  ...props
}: ComponentProps<"div"> & { size?: "default" | "narrow" | "wide" | "full" }) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 2xl:px-20",
        size === "narrow"
          ? "max-w-3xl"
          : size === "wide"
          ? "max-w-7xl xl:max-w-[100rem] 2xl:max-w-[110rem]"
          : size === "full"
          ? "max-w-none"
          : "max-w-6xl xl:max-w-[92rem] 2xl:max-w-[104rem]",
        className,
      )}
      {...props}
    />
  );
}

export interface PageHeaderProps {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
  children?: ReactNode;
}

/** Standard page title block. */
export function PageHeader({ eyebrow, title, description, actions, className, children }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-3 pb-5 pt-6 sm:pt-8 md:flex-row md:items-end md:justify-between", className)}>
      <div className="min-w-0 max-w-3xl xl:max-w-4xl 2xl:max-w-5xl space-y-2">
        {eyebrow && <div className="text-sm font-medium text-brand">{eyebrow}</div>}
        <h1 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl xl:text-4xl">{title}</h1>
        {description && <p className="text-pretty text-sm leading-relaxed text-muted sm:text-base xl:text-lg">{description}</p>}
        {children}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export interface Crumb {
  href?: string;
  label: string;
}

export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={cn("text-sm", className)}>
      <ol className="flex min-w-0 flex-wrap items-center gap-1 text-muted">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${item.label}-${i}`} className="flex min-w-0 items-center gap-1">
              {item.href && !last ? (
                <Link href={item.href} className="truncate transition-colors hover:text-foreground">
                  {item.label}
                </Link>
              ) : (
                <span className={cn("truncate", last && "text-foreground")} aria-current={last ? "page" : undefined}>
                  {item.label}
                </span>
              )}
              {!last && <ChevronRight className="size-3.5 shrink-0" aria-hidden />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** Section heading with optional description and right-aligned actions. */
export function SectionHeading({
  id,
  title,
  description,
  actions,
  icon,
  className,
  as: As = "h2",
}: {
  id?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  icon?: ReactNode;
  className?: string;
  as?: "h2" | "h3";
}) {
  return (
    <div className={cn("mb-3 flex flex-wrap items-end justify-between gap-3", className)}>
      <div className="min-w-0 space-y-1">
        <As id={id} className="flex scroll-mt-20 items-center gap-2 text-base font-semibold tracking-tight sm:text-lg">
          {icon && <span className="text-brand [&_svg]:size-5">{icon}</span>}
          {title}
        </As>
        {description && <p className="text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
