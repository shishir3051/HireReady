"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Bookmark, LayoutDashboard, LogIn, LogOut, Map as MapIcon, Target } from "lucide-react";
import { cn, initials } from "@/lib/utils";
import { useAuth } from "@/components/providers/auth-provider";
import { useProgress } from "@/components/providers/progress-provider";
import { useToast } from "@/components/ui/toast";
import { ButtonLink } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-semibold text-brand ring-1 ring-brand/20",
        className,
      )}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

/** "Log in" button when logged out, avatar dropdown when logged in. */
export function UserMenu() {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  if (loading) return <Skeleton className="size-8 rounded-full" />;
  if (!user) {
    const next = pathname && pathname !== "/" && !pathname.startsWith("/login") && !pathname.startsWith("/register") ? `?next=${encodeURIComponent(pathname)}` : "";
    return (
      <ButtonLink href={`/login${next}`} size="sm" variant="primary" leftIcon={<LogIn aria-hidden />}>
        Log in
      </ButtonLink>
    );
  }
  return <UserDropdown name={user.name} email={user.email} />;
}

function UserDropdown({ name, email }: { name: string; email: string }) {
  const { logout } = useAuth();
  const { counts } = useProgress();
  const { toast } = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    function onPointer(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    const first = menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]');
    first?.focus();
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function onMenuKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]'));
    const index = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      items[(index + 1) % items.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      items[(index - 1 + items.length) % items.length]?.focus();
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  }

  async function onLogout() {
    setOpen(false);
    await logout();
    toast({ title: "You're logged out", description: "See you at the next practice session." });
    router.push("/");
  }

  const itemClass =
    "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm text-foreground/90 outline-none transition-colors hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-none [&_svg]:size-4 [&_svg]:text-muted";

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Account menu for ${name}`}
        onClick={() => setOpen((o) => !o)}
        className="grid place-items-center rounded-full transition-transform hover:scale-105"
      >
        <Avatar name={name} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label="Account"
            onKeyDown={onMenuKeyDown}
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-full z-50 mt-2 w-64 origin-top-right rounded-xl border border-border bg-surface p-1.5 shadow-xl"
          >
            <div className="flex items-center gap-3 px-2.5 pb-3 pt-2">
              <Avatar name={name} className="size-9" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{name}</p>
                <p className="truncate text-xs text-muted">{email}</p>
              </div>
            </div>
            <div className="mx-1 mb-1.5 grid grid-cols-3 gap-1 rounded-lg bg-surface-2 p-2 text-center" aria-hidden>
              <Stat label="Solved" value={counts.solved} />
              <Stat label="Tried" value={counts.attempted} />
              <Stat label="Saved" value={counts.bookmarked} />
            </div>
            <div className="border-t border-border pt-1.5">
              <Link href="/dashboard" role="menuitem" tabIndex={-1} className={itemClass} onClick={() => setOpen(false)}>
                <LayoutDashboard aria-hidden /> Dashboard
              </Link>
              <Link
                href="/questions?status=bookmarked"
                role="menuitem"
                tabIndex={-1}
                className={itemClass}
                onClick={() => setOpen(false)}
              >
                <Bookmark aria-hidden /> Bookmarked questions
              </Link>
              <Link href="/roadmap" role="menuitem" tabIndex={-1} className={itemClass} onClick={() => setOpen(false)}>
                <MapIcon aria-hidden /> My roadmap
              </Link>
              <Link href="/quiz" role="menuitem" tabIndex={-1} className={itemClass} onClick={() => setOpen(false)}>
                <Target aria-hidden /> Quizzes
              </Link>
            </div>
            <div className="mt-1.5 border-t border-border pt-1.5">
              <button type="button" role="menuitem" tabIndex={-1} className={itemClass} onClick={onLogout}>
                <LogOut aria-hidden /> Log out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-sm font-semibold tabular-nums">{value}</p>
      <p className="text-[11px] text-muted">{label}</p>
    </div>
  );
}
