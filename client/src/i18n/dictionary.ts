import { en, type Dictionary } from "./en";
import { bn } from "./bn";
import type { AppLang } from "@/lib/constants";

export type { Dictionary, AppLang };

export function getDictionary(lang?: string | null): Dictionary {
  return lang === "bn" ? bn : en;
}

