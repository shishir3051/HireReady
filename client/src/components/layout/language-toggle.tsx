"use client";

import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/providers";

export function LanguageToggle({
  className,
  variant = "pill",
}: {
  className?: string;
  variant?: "pill" | "icon";
}) {
  const { lang, toggleLang } = useLanguage();
  const nextLang = lang === "bn" ? "English" : "বাংলা";

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={toggleLang}
        aria-label={`Switch language to ${nextLang}`}
        title={`Switch language to ${nextLang}`}
        className={cn(
          "relative inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-muted transition-colors hover:bg-surface-2 hover:text-foreground",
          className,
        )}
      >
        <Globe className="size-4" aria-hidden />
        <span>{lang === "bn" ? "EN" : "বাংলা"}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleLang}
      aria-label={`Switch language to ${nextLang}`}
      title={`Switch to ${nextLang}`}
      className={cn(
        "inline-flex h-8 shrink-0 items-center rounded-lg border border-border bg-surface-2/60 p-0.5 text-xs font-medium transition-colors hover:border-brand/40",
        className,
      )}
    >
      <span
        className={cn(
          "min-w-[28px] text-center rounded-[6px] px-2 py-0.5 transition-all duration-150",
          lang === "en" ? "bg-surface font-semibold text-foreground shadow-xs" : "text-muted hover:text-foreground",
        )}
      >
        EN
      </span>
      <span
        className={cn(
          "min-w-[36px] text-center rounded-[6px] px-2 py-0.5 transition-all duration-150",
          lang === "bn" ? "bg-surface font-semibold text-brand shadow-xs" : "text-muted hover:text-foreground",
        )}
      >
        বাংলা
      </span>
    </button>
  );
}

