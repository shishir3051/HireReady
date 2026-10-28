"use client";

import type { ReactNode } from "react";
import { MotionConfig } from "motion/react";
import { ToastProvider } from "@/components/ui/toast";
import { useMotionPreference } from "@/lib/motion-preference";
import { CommandPaletteProvider } from "@/components/command-palette";
import { LanguageProvider, useLanguage, useT, type AppLang } from "@/i18n";
import { ThemeProvider } from "./theme-provider";
import { AuthProvider } from "./auth-provider";
import { ProgressProvider } from "./progress-provider";

export { useTheme, type ThemePreference, type ResolvedTheme } from "./theme-provider";
export { useAuth, type AuthContextValue } from "./auth-provider";
export { useProgress, useProgressStats, type ProgressContextValue } from "./progress-provider";
export { useCommandPalette } from "@/components/command-palette";
export { useToast } from "@/components/ui/toast";
export { useLanguage, useT, type AppLang };

/** All app-wide client providers, in dependency order. Rendered once by the root layout. */
export function Providers({ children, initialLang }: { children: ReactNode; initialLang?: AppLang }) {
  // follows the OS "reduce motion" setting unless the learner chose animations on/off (see motion-preference.ts)
  const { reducedMotion } = useMotionPreference();
  return (
    <LanguageProvider initialLang={initialLang}>
      <MotionConfig reducedMotion={reducedMotion}>
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
    </LanguageProvider>
  );
}
