import Link from "next/link";
import { cn } from "@/lib/utils";

/** HireReady mark: a stylised check inside a rounded tile, drawn with tokens. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8", className)} aria-hidden>
      <rect x="1" y="1" width="30" height="30" rx="9" fill="var(--brand)" />
      <path
        d="M9 16.5l4.2 4.2L23 11"
        fill="none"
        stroke="var(--brand-foreground)"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="23" cy="11" r="2.1" fill="var(--viz-warning)" />
    </svg>
  );
}

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link
      href={href}
      className={cn("group inline-flex items-center gap-2 rounded-lg font-semibold tracking-tight", className)}
      aria-label="HireReady home"
    >
      <LogoMark className="transition-transform duration-300 group-hover:-rotate-6" />
      <span className="text-lg">
        Hire<span className="text-brand">Ready</span>
      </span>
    </Link>
  );
}
