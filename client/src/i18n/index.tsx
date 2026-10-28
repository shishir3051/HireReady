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

  // The server already rendered with the cookie's language (and src/proxy.ts turns `?lang=` links into that cookie),
  // so the client only keeps <html lang> in sync after a switch.
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

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

