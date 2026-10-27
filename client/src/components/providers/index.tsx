"use client";

import type { ReactNode } from "react";
import { MotionConfig } from "motion/react";
import { ToastProvider } from "@/components/ui/toast";
import { CommandPaletteProvider } from "@/components/command-palette";
import { ThemeProvider } from "./theme-provider";
import { AuthProvider } from "./auth-provider";
import { ProgressProvider } from "./progress-provider";

export { useTheme, type ThemePreference, type ResolvedTheme } from "./theme-provider";
export { useAuth, type AuthContextValue } from "./auth-provider";
export { useProgress, useProgressStats, type ProgressContextValue } from "./progress-provider";
export { useCommandPalette } from "@/components/command-palette";
export { useToast } from "@/components/ui/toast";

/** All app-wide client providers, in dependency order. Rendered once by the root layout. */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <ProgressProvider>
              <CommandPaletteProvider>{children}</CommandPaletteProvider>
            </ProgressProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </MotionConfig>
  );
}
