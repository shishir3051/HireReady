import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

/** Titled dashboard panel with an optional "view all" link. */
export function DashboardCard({
  id,
  title,
  icon,
  description,
  href,
  hrefLabel = "View all",
  action,
  className,
  bodyClassName,
  children,
}: {
  id: string;
  title: ReactNode;
  icon?: ReactNode;
  description?: ReactNode;
  href?: string;
  hrefLabel?: string;
  action?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className={cn("min-w-0", className)}>
      <Card className="flex h-full flex-col">
        <div className="flex items-start justify-between gap-3 px-4 pb-2 pt-4 sm:px-5">
          <div className="min-w-0">
            <h2 id={id} className="flex items-center gap-2 font-semibold tracking-tight [&_svg]:size-4 [&_svg]:text-brand">
              {icon}
              {title}
            </h2>
            {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
          </div>
          {action}
          {href && (
            <Link
              href={href}
              className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-brand hover:underline"
            >
              {hrefLabel}
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          )}
        </div>
        <div className={cn("flex-1 px-4 pb-4 sm:px-5", bodyClassName)}>{children}</div>
      </Card>
    </section>
  );
}

/** Stat tile: label, big value, optional sub line and footer (meter). */
export function StatTile({
  icon,
  label,
  value,
  sub,
  children,
  href,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  children?: ReactNode;
  href?: string;
}) {
  // Must be rendered inside a <dl>.
  return (
    <div className="group relative rounded-xl border border-border bg-surface p-4 shadow-xs transition-[border-color,box-shadow] duration-200 hover:border-brand/30">
      <dt className="flex items-center gap-1.5 text-xs font-medium text-muted [&_svg]:size-4 [&_svg]:text-brand">
        {icon}
        {label}
      </dt>
      <dd className="mt-2">
        <span className="block text-2xl font-semibold tabular-nums tracking-tight sm:text-3xl">{value}</span>
        {sub && <span className="mt-0.5 block text-xs text-muted">{sub}</span>}
        {children && <div className="mt-3">{children}</div>}
        {href && (
          <Link
            href={href}
            className="absolute inset-0 rounded-xl outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <span className="sr-only">{label} details</span>
          </Link>
        )}
      </dd>
    </div>
  );
}
