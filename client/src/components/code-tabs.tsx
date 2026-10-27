"use client";

import { useId, type KeyboardEvent } from "react";
import { motion } from "motion/react";
import type { CodeSnippet, Language } from "@/lib/types";
import { LANGUAGE_LABELS, STORAGE_KEYS } from "@/lib/constants";
import { createLocalStore, parseString, serializeString } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { CodeBlock } from "@/components/code-block";

/** Last chosen solution language, shared by every CodeTabs on the site and persisted in localStorage. */
export const codeLanguageStore = createLocalStore<string>(STORAGE_KEYS.codeLanguage, "", parseString, serializeString);

export interface CodeTabsProps {
  snippets: CodeSnippet[];
  showLineNumbers?: boolean;
  /** 1-based lines to emphasise in the javascript snippet (e.g. synced with a visual step) */
  highlightLines?: number[];
  className?: string;
  maxHeight?: string;
}

/**
 * Language tabs for solution snippets (JavaScript / Python / Java …) with copy + line numbers.
 * Remembers the chosen language across pages and visits.
 */
export function CodeTabs({ snippets, showLineNumbers = true, highlightLines, className, maxHeight }: CodeTabsProps) {
  const preferred = codeLanguageStore.useValue();
  const id = useId();
  if (snippets.length === 0) return null;
  const active = snippets.find((s) => s.language === preferred) ?? snippets[0]!;

  function select(lang: Language) {
    codeLanguageStore.set(lang);
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const index = snippets.findIndex((s) => s.language === active.language);
    let next = index;
    if (e.key === "ArrowRight") next = (index + 1) % snippets.length;
    else if (e.key === "ArrowLeft") next = (index - 1 + snippets.length) % snippets.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = snippets.length - 1;
    else return;
    e.preventDefault();
    const lang = snippets[next]!.language;
    select(lang);
    e.currentTarget.querySelector<HTMLButtonElement>(`[data-lang="${lang}"]`)?.focus();
  }

  const tabs =
    snippets.length > 1 ? (
      <div role="radiogroup" aria-label="Solution language" onKeyDown={onKeyDown} className="-ml-1 flex items-center gap-0.5">
        {snippets.map((s) => {
          const selected = s.language === active.language;
          return (
            <button
              key={s.language}
              type="button"
              role="radio"
              data-lang={s.language}
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => select(s.language)}
              className={cn(
                "relative h-7 rounded-md px-2.5 text-xs font-medium transition-colors",
                selected ? "text-foreground" : "text-muted hover:text-foreground",
              )}
            >
              {selected && (
                <motion.span
                  layoutId={`${id}-lang`}
                  aria-hidden
                  transition={{ type: "spring", bounce: 0.15, duration: 0.3 }}
                  className="absolute inset-0 rounded-md border border-border bg-surface shadow-xs"
                />
              )}
              <span className="relative">{LANGUAGE_LABELS[s.language] ?? s.language}</span>
            </button>
          );
        })}
      </div>
    ) : (
      <span className="font-mono text-xs text-muted">{LANGUAGE_LABELS[active.language] ?? active.language}</span>
    );

  return (
    <div className={className}>
      <CodeBlock
        code={active.code}
        language={active.language}
        showLineNumbers={showLineNumbers}
        highlightLines={active.language === "javascript" ? highlightLines : undefined}
        title={tabs}
        copyLabel={`Copy ${LANGUAGE_LABELS[active.language] ?? active.language} code`}
        maxHeight={maxHeight}
      />
    </div>
  );
}
