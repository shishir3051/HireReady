"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { LANG_COOKIE, DEFAULT_LANG, type AppLang } from "@/lib/constants";
import { getDictionary, type Dictionary } from "./dictionary";
import { en } from "./en";

export type { Dictionary, AppLang };
export { getDictionary };

interface LanguageContextValue {
  lang: AppLang;
  t: Dictionary;
  setLang: (lang: AppLang) => void;
  toggleLang: () => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function writeLangCookie(lang: AppLang) {
  if (typeof document === "undefined") return;
  document.cookie = `${LANG_COOKIE}=${lang}; path=/; max-age=31536000; SameSite=Lax`;
  document.documentElement.lang = lang;
}

export function LanguageProvider({
  children,
  initialLang = DEFAULT_LANG,
}: {
  children: ReactNode;
  initialLang?: AppLang;
}) {
  const router = useRouter();
  const [lang, setLangState] = useState<AppLang>(initialLang);

  const setLang = useCallback(
    (newLang: AppLang) => {
      setLangState(newLang);
      writeLangCookie(newLang);
      router.refresh();
    },
    [router],
  );

  useEffect(() => {
    // Keep documentElement in sync
    document.documentElement.lang = lang;

    // Sync from URL or cookie on mount if different
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const qLang = params.get("lang");
      if ((qLang === "bn" || qLang === "en") && qLang !== lang) {
        setLang(qLang);
        return;
      }
      const match = document.cookie.match(/(?:^|; )hr-lang=([^;]+)/);
      const cLang = match?.[1] as AppLang;
      if ((cLang === "bn" || cLang === "en") && cLang !== lang) {
        setLangState(cLang);
      }
    }
  }, [lang, setLang]);

  const toggleLang = useCallback(() => {
    setLang(lang === "bn" ? "en" : "bn");
  }, [lang, setLang]);

  const t = useMemo(() => getDictionary(lang), [lang]);

  const value = useMemo(
    () => ({
      lang,
      t,
      setLang,
      toggleLang,
    }),
    [lang, t, setLang, toggleLang],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    // fallback outside provider
    return {
      lang: DEFAULT_LANG,
      t: en,
      setLang: () => {},
      toggleLang: () => {},
    };
  }
  return ctx;
}

export function useT(): Dictionary {
  return useLanguage().t;
}

