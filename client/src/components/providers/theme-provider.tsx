"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from "react";
import { STORAGE_KEYS } from "@/lib/constants";
import { createLocalStore, useMediaQuery } from "@/lib/storage";
import { DARK_QUERY } from "@/lib/init-scripts";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const themeStore = createLocalStore<ThemePreference>(
  STORAGE_KEYS.theme,
  "system",
  (raw) => (raw === "light" || raw === "dark" || raw === "system" ? raw : undefined),
  (v) => v,
);

function resolve(pref: ThemePreference, systemDark: boolean): ResolvedTheme {
  return pref === "system" ? (systemDark ? "dark" : "light") : pref;
}

function applyTheme(theme: ResolvedTheme) {
  const root = document.documentElement;
  if (root.classList.contains("dark") === (theme === "dark")) return;
  // Avoid every element animating its colours during the switch.
  const style = document.createElement("style");
  style.textContent = "*,*::before,*::after{transition:none!important}";
  document.head.appendChild(style);
  root.classList.toggle("dark", theme === "dark");
  void window.getComputedStyle(root).opacity;
  requestAnimationFrame(() => style.remove());
}

export interface ThemeContextValue {
  /** stored preference ("system" during SSR) */
  theme: ThemePreference;
  /** effective theme ("light" during SSR — use CSS `dark:` variants for first-paint UI) */
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemePreference) => void;
  /** flip between light and dark */
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = themeStore.useValue();
  const systemDark = useMediaQuery(DARK_QUERY);
  const resolvedTheme = resolve(theme, systemDark);

  // Keep <html class="dark"> in sync with storage changes (this tab or others) and OS changes.
  useEffect(() => {
    const mql = window.matchMedia(DARK_QUERY);
    const sync = () => applyTheme(resolve(themeStore.get(), mql.matches));
    const unsubscribe = themeStore.subscribe(sync);
    mql.addEventListener("change", sync);
    return () => {
      unsubscribe();
      mql.removeEventListener("change", sync);
    };
  }, []);

  const setTheme = useCallback((next: ThemePreference) => themeStore.set(next), []);
  const toggleTheme = useCallback(() => {
    const current = resolve(themeStore.get(), window.matchMedia(DARK_QUERY).matches);
    themeStore.set(current === "dark" ? "light" : "dark");
  }, []);

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme, toggleTheme }),
    [theme, resolvedTheme, setTheme, toggleTheme],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
