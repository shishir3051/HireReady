"use client";

import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/providers/theme-provider";

/** Light/dark switch. Icons swap via CSS `dark:` so the first paint is always correct. */
export function ThemeToggle({ className }: { className?: string }) {
  const { toggleTheme } = useTheme();
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle dark mode"
      title="Toggle dark mode"
      className={cn(
        "relative grid size-9 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-foreground",
        className,
      )}
    >
      <Sun className="size-[18px] transition-transform duration-300 dark:hidden" aria-hidden />
      <Moon className="hidden size-[18px] transition-transform duration-300 dark:block" aria-hidden />
    </button>
  );
}
