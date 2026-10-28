"use client";

import { useEffect, useOptimistic, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ListFilter, LoaderCircle, Search, X } from "lucide-react";
import type { Category, TopicSummary } from "@/lib/types";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  DIFFICULTIES,
  DIFFICULTY_LABELS,
  FREQUENCIES,
  FREQUENCY_LABELS,
  KINDS,
  KIND_LABELS,
  SORT_OPTIONS,
  STATUS_FILTERS,
  type QuestionSort,
  type StatusFilter,
} from "@/lib/constants";
import { activeFilterCount, questionsHref, type QuestionFilters as Filters } from "@/lib/question-filters";
import { cn } from "@/lib/utils";
import { ChipGroup } from "@/components/ui/chip-group";
import { MultiSelect } from "@/components/ui/multi-select";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TopicIcon } from "@/components/topics/topic-icon";
import { useLanguage } from "@/components/providers";
import { getDictionary, type Dictionary } from "@/i18n/dictionary";
import type { AppLang } from "@/lib/constants";

export interface QuestionFiltersProps {
  filters: Filters;
  topics: Pick<TopicSummary, "slug" | "title" | "category" | "order">[];
  /** results region — dimmed while a new URL is loading */
  children: ReactNode;
  dict?: Dictionary;
  lang?: AppLang;
}

/**
 * Search + filters for /questions. Every change updates the URL (router.replace, no scroll);
 * the server page re-renders the results passed as children.
 */
export function QuestionFilters({ filters, topics, children, dict: dictProp, lang: langProp }: QuestionFiltersProps) {
  const router = useRouter();
  const { lang: clientLang } = useLanguage();
  const lang = langProp ?? clientLang;
  const dict = dictProp ?? getDictionary(lang);
  const [pending, startTransition] = useTransition();
  // Controls reflect the requested filters immediately while the server renders the new results.
  const [view, setView] = useOptimistic(filters);
  const [text, setText] = useState(filters.q);
  const [urlQ, setUrlQ] = useState(filters.q);
  const [sentQ, setSentQ] = useState(filters.q);
  const [panelOpen, setPanelOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viewRef = useRef(view);
  useEffect(() => {
    viewRef.current = view;
  });
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  // The URL changed from outside (back button, palette "search all"): adopt its query text.
  if (filters.q !== urlQ) {
    setUrlQ(filters.q);
    if (filters.q !== sentQ) {
      setText(filters.q);
      setSentQ(filters.q);
    }
  }

  function navigate(patch: Partial<Filters>) {
    const next = { ...viewRef.current, page: 1, ...patch };
    viewRef.current = next;
    startTransition(() => {
      setView(next);
      router.replace(questionsHref(next), { scroll: false });
    });
  }

  function onSearchChange(value: string) {
    setText(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setSentQ(value.trim());
      navigate({ q: value.trim() });
    }, 300);
  }

  function clearAll() {
    if (timer.current) clearTimeout(timer.current);
    setText("");
    setSentQ("");
    navigate({ q: "", topic: [], difficulty: [], kind: [], frequency: [], status: "all" });
  }

  const topicOptions = CATEGORY_ORDER.flatMap((cat: Category) =>
    topics
      .filter((t) => t.category === cat)
      .sort((a, b) => a.order - b.order)
      .map((t) => ({
        value: t.slug,
        label: t.title,
        group: dict.categories.labels[cat] ?? CATEGORY_LABELS[cat],
        icon: <TopicIcon slug={t.slug} />,
      })),
  );

  const count = activeFilterCount(view);
  const facetCount = view.difficulty.length + view.kind.length + view.frequency.length;

  const facets = (
    <div className="grid gap-4 sm:grid-cols-3">
      <FacetGroup label={dict.questionsPage.facets.difficulty}>
        <ChipGroup
          label={dict.questionsPage.facets.difficulty}
          value={view.difficulty}
          onChange={(difficulty) => navigate({ difficulty })}
          options={DIFFICULTIES.map((d) => ({
            value: d,
            label: dict.question.difficulty[d] ?? DIFFICULTY_LABELS[d],
            tone: d,
          }))}
        />
      </FacetGroup>
      <FacetGroup label={dict.questionsPage.facets.type}>
        <ChipGroup
          label={dict.questionsPage.facets.type}
          value={view.kind}
          onChange={(kind) => navigate({ kind })}
          options={KINDS.map((k) => ({
            value: k,
            label: lang === "bn"
              ? (k === "coding" ? "কোডিং" : k === "concept" ? "কনসেপ্ট" : k === "sql" ? "SQL" : k === "design" ? "ডিজাইন" : "বিহেভিয়ারাল")
              : KIND_LABELS[k],
          }))}
        />
      </FacetGroup>
      <FacetGroup label={dict.questionsPage.facets.frequency}>
        <ChipGroup
          label={dict.questionsPage.facets.frequency}
          value={view.frequency}
          onChange={(frequency) => navigate({ frequency })}
          options={FREQUENCIES.map((f) => ({
            value: f,
            label: dict.question.frequency[f] ?? FREQUENCY_LABELS[f],
          }))}
        />
      </FacetGroup>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-2xl border border-border bg-surface p-3 shadow-xs sm:p-4">
        <div className="flex flex-col gap-2 md:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <input
              type="search"
              value={text}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={dict.questionsPage.searchPlaceholder}
              aria-label={dict.questionsPage.searchPlaceholder}
              className="h-9 w-full rounded-lg border border-border bg-surface pl-9 pr-9 text-sm shadow-xs outline-none transition-[border-color,box-shadow] placeholder:text-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25"
            />
            {pending && (
              <LoaderCircle
                className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted"
                aria-label="Loading results"
              />
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 md:flex">
            <MultiSelect
              label={dict.questionsPage.topics}
              className="md:w-56"
              options={topicOptions}
              value={view.topic}
              onChange={(topic) => navigate({ topic })}
              searchPlaceholder={dict.questionsPage.findTopic}
            />
            <Select
              aria-label="Sort questions"
              value={view.sort}
              onChange={(e) => navigate({ sort: e.target.value as QuestionSort })}
              wrapperClassName="md:w-44"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {dict.questionsPage.sortLabel.replace(
                    "{label}",
                    dict.questionsPage.sortOptions[o.value] ?? o.label,
                  )}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <SegmentedControl<StatusFilter>
            label="Progress status"
            size="sm"
            value={view.status}
            onChange={(status) => navigate({ status })}
            options={STATUS_FILTERS.map((s) => ({
              value: s.value,
              label: dict.questionsPage.status[s.value] ?? s.label,
            }))}
          />
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPanelOpen((o) => !o)}
              aria-expanded={panelOpen}
              leftIcon={<ListFilter aria-hidden />}
              className="lg:hidden"
            >
              {dict.questionsPage.facets.filters}
              {facetCount > 0 && (
                <span className="grid min-w-5 place-items-center rounded-full bg-brand px-1.5 text-[11px] font-semibold leading-5 text-brand-foreground">
                  {facetCount}
                </span>
              )}
            </Button>
            {count > 0 && (
              <Button variant="ghost" size="sm" onClick={clearAll} leftIcon={<X aria-hidden />}>
                {dict.questionsPage.facets.clearAll}
              </Button>
            )}
          </div>
        </div>

        <div className="hidden border-t border-border pt-4 lg:block">{facets}</div>
        <AnimatePresence initial={false}>
          {panelOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden lg:hidden"
            >
              <div className="border-t border-border pt-4">{facets}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div
        aria-busy={pending}
        className={cn("transition-opacity duration-200", pending && "pointer-events-none opacity-60")}
      >
        {children}
      </div>
    </div>
  );
}

function FacetGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wider text-muted">{label}</p>
      {children}
    </div>
  );
}
