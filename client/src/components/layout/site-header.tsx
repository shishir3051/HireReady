"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { LogIn, Menu, Search, UserPlus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCommandPalette } from "@/components/command-palette";
import { useAuth, useT } from "@/components/providers";
import { ButtonLink } from "@/components/ui/button";
import { Kbd, ModKey } from "@/components/ui/kbd";
import { LanguageToggle } from "./language-toggle";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";
import { Avatar, UserMenu } from "./user-menu";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const t = useT();
  const pathname = usePathname() ?? "/";
  const { setOpen: setPaletteOpen } = useCommandPalette();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const mobileId = useId();

  const navLinks = [
    { href: "/topics", label: t.nav.topics },
    { href: "/questions", label: t.nav.questions },
    { href: "/quiz", label: t.nav.quiz },
    { href: "/mock-interview", label: t.nav.mockInterview },
    { href: "/roadmap", label: t.nav.roadmap },
    { href: "/dashboard", label: t.nav.dashboard },
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    const raf = requestAnimationFrame(onScroll);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full border-b transition-[background-color,border-color,box-shadow] duration-200",
        scrolled || mobileOpen
          ? "border-border bg-background/85 shadow-xs backdrop-blur-lg"
          : "border-transparent bg-background/60 backdrop-blur-sm",
      )}
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2.5 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:shadow-lg"
      >
        Skip to content
      </a>
      <div className="mx-auto flex h-14 w-full max-w-7xl xl:max-w-[100rem] 2xl:max-w-[110rem] items-center gap-3 px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 2xl:px-20">
        <Logo className="mr-2 shrink-0" />

        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-0.5">
            {navLinks.map((link) => {
              const active = isActive(pathname, link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative inline-flex h-9 items-center rounded-lg px-3 text-sm font-medium transition-colors",
                      active ? "font-semibold text-brand" : "text-muted hover:bg-surface-2 hover:text-foreground",
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="nav-active"
                        className="absolute inset-0 rounded-lg bg-brand-soft"
                        transition={{ type: "spring", bounce: 0.15, duration: 0.35 }}
                        aria-hidden
                      />
                    )}
                    <span className="relative">{link.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="hidden h-9 items-center gap-2 rounded-lg border border-border bg-surface pl-3 pr-1.5 text-sm text-muted shadow-xs transition-colors hover:border-brand/40 hover:text-foreground sm:inline-flex"
            aria-label={t.common.search}
            aria-keyshortcuts="Control+K Meta+K"
          >
            <Search className="size-4" aria-hidden />
            <span className="w-28 text-left xl:w-36">{t.common.search}…</span>
            <span className="flex items-center gap-0.5" aria-hidden>
              <ModKey />
              <Kbd>K</Kbd>
            </span>
          </button>
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="grid size-9 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-foreground sm:hidden"
            aria-label={t.common.search}
          >
            <Search className="size-[18px]" aria-hidden />
          </button>
          <LanguageToggle />
          <ThemeToggle />
          <div className="hidden sm:block">
            <UserMenu />
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            aria-expanded={mobileOpen}
            aria-controls={mobileId}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            className="grid size-9 place-items-center rounded-lg text-foreground transition-colors hover:bg-surface-2 lg:hidden"
          >
            {mobileOpen ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {mobileOpen && (
          <MobileNav
            id={mobileId}
            pathname={pathname}
            onNavigate={() => setMobileOpen(false)}
            navLinks={navLinks}
          />
        )}
      </AnimatePresence>
    </header>
  );
}

function MobileNav({
  id,
  pathname,
  onNavigate,
  navLinks,
}: {
  id: string;
  pathname: string;
  onNavigate: () => void;
  navLinks: { href: string; label: string }[];
}) {
  const t = useT();
  const { user, loading, logout } = useAuth();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onNavigate();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onNavigate]);

  return (
    <motion.div
      id={id}
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="overflow-hidden border-t border-border lg:hidden"
    >
      <nav aria-label="Mobile" className="mx-auto max-h-[calc(100dvh-3.5rem)] max-w-7xl xl:max-w-[100rem] 2xl:max-w-[110rem] overflow-y-auto px-4 pb-4 pt-2 sm:px-6 lg:px-12 xl:px-16 2xl:px-20">
        <div className="mb-2 flex items-center justify-between border-b border-border pb-2 sm:hidden">
          <span className="text-xs font-medium text-muted">{t.nav.language}:</span>
          <LanguageToggle />
        </div>
        <ul className="grid gap-1 sm:grid-cols-2">
          {navLinks.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-11 items-center rounded-lg px-3 text-base font-medium transition-colors",
                    active ? "bg-brand-soft text-brand" : "text-foreground hover:bg-surface-2",
                  )}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="mt-3 border-t border-border pt-3 sm:hidden">
          {loading ? null : user ? (
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar name={user.name} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{user.name}</p>
                  <p className="truncate text-xs text-muted">{user.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={async () => {
                  onNavigate();
                  await logout();
                }}
                className="h-9 shrink-0 rounded-lg border border-border px-3 text-sm font-medium hover:bg-surface-2"
              >
                {t.nav.logout}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <ButtonLink href="/login" variant="outline" onClick={onNavigate} leftIcon={<LogIn aria-hidden />}>
                {t.nav.login}
              </ButtonLink>
              <ButtonLink href="/register" onClick={onNavigate} leftIcon={<UserPlus aria-hidden />}>
                {t.nav.register}
              </ButtonLink>
            </div>
          )}
        </div>
      </nav>
    </motion.div>
  );
}
