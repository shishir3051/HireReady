"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Loader2, Sparkles, TrendingUp } from "lucide-react";
import { api, getErrorMessage } from "@/lib/api";
import type { AiEvaluation, Question } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface MockAiEvaluatorProps {
  question: Question;
  notes: string;
  lang?: "en" | "bn";
  onApplyRating?: (rating: number) => void;
}

export function MockAiEvaluator({ question, notes, lang = "en", onApplyRating }: MockAiEvaluatorProps) {
  const [loading, setLoading] = useState(false);
  const [evaluation, setEvaluation] = useState<AiEvaluation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(true);

  const isBn = lang === "bn";

  async function handleEvaluate() {
    if (!notes || notes.trim().length < 5) {
      setError(
        isBn
          ? "মূল্যায়ন করার জন্য প্রথমে কিছু খসড়া নোট বা কোড লিখুন।"
          : "Please write some scratch notes or solution outline first.",
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.ai.evaluate({
        questionTitle: question.title,
        questionPrompt: question.prompt,
        questionKind: question.kind,
        modelAnswer: question.solution?.summary ?? "",
        userNotes: notes,
        lang,
      });
      setEvaluation(res.evaluation);
      setOpen(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  const verdictTones: Record<string, "success" | "brand" | "warning" | "danger" | "neutral"> = {
    "Strong Hire": "success",
    Hire: "success",
    "Lean Hire": "brand",
    "Lean No Hire": "warning",
    "No Hire": "danger",
  };

  return (
    <div className="mt-4 rounded-xl border border-brand/25 bg-surface/80 p-3 sm:p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-lg bg-brand-soft text-brand">
            <Sparkles className="size-4" aria-hidden />
          </span>
          <div>
            <h4 className="text-sm font-semibold tracking-tight">
              {isBn ? "Gemini AI উত্তর মূল্যায়ন" : "Gemini AI Answer Review"}
            </h4>
            <p className="text-xs text-muted">
              {isBn ? "আপনার খসড়া নোট ও কোডের ওপর তাৎক্ষণিক ফিডব্যাক" : "Instant feedback on your notes & logic"}
            </p>
          </div>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={handleEvaluate}
          disabled={loading}
          leftIcon={loading ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Sparkles className="size-3.5 text-brand" aria-hidden />}
        >
          {loading
            ? isBn
              ? "বিশ্লেষণ হচ্ছে…"
              : "Reviewing…"
            : evaluation
              ? isBn
                ? "পুনরায় মূল্যায়ন"
                : "Re-evaluate"
              : isBn
                ? "AI মূল্যায়ন নিন"
                : "Get AI Feedback"}
        </Button>
      </div>

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 p-2.5 text-xs text-danger">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      )}

      {evaluation && (
        <div className="mt-3.5 border-t border-border pt-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={verdictTones[evaluation.verdict] ?? "brand"} size="md">
                {evaluation.verdict} ({evaluation.rating}/5)
              </Badge>
              {onApplyRating && (
                <button
                  type="button"
                  onClick={() => onApplyRating(evaluation.rating)}
                  className="text-xs font-medium text-brand hover:underline"
                >
                  {isBn ? `রেটিং ${evaluation.rating}/5 নির্বাচন করুন` : `Apply ${evaluation.rating}/5 rating`}
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setOpen(!open)}
              className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground"
              aria-label={open ? "Collapse evaluation" : "Expand evaluation"}
            >
              {open ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
            </button>
          </div>

          {open && (
            <div className="mt-3 space-y-3 text-xs">
              <p className="leading-relaxed text-foreground font-medium">{evaluation.summary}</p>

              {evaluation.strengths.length > 0 && (
                <div>
                  <p className="mb-1.5 flex items-center gap-1 font-semibold text-success">
                    <CheckCircle2 className="size-3.5" /> {isBn ? "যা ভালো হয়েছে" : "Strengths"}
                  </p>
                  <ul className="list-inside list-disc space-y-1 text-muted">
                    {evaluation.strengths.map((s, i) => (
                      <li key={i} className="text-foreground/90">{s}</li>
                    ))}
                  </ul>
                </div>
              )}

              {evaluation.improvements.length > 0 && (
                <div>
                  <p className="mb-1.5 flex items-center gap-1 font-semibold text-warning">
                    <TrendingUp className="size-3.5" /> {isBn ? "উন্নতির সুযোগ" : "Areas to Improve"}
                  </p>
                  <ul className="list-inside list-disc space-y-1 text-muted">
                    {evaluation.improvements.map((imp, i) => (
                      <li key={i} className="text-foreground/90">{imp}</li>
                    ))}
                  </ul>
                </div>
              )}

              {evaluation.missingEdgeCases.length > 0 && (
                <div>
                  <p className="mb-1.5 flex items-center gap-1 font-semibold text-brand">
                    <AlertCircle className="size-3.5" /> {isBn ? "অনুপস্থিত এজ কেস বা সতর্কতা" : "Missing Edge Cases"}
                  </p>
                  <ul className="list-inside list-disc space-y-1 text-muted">
                    {evaluation.missingEdgeCases.map((ec, i) => (
                      <li key={i} className="text-foreground/90">{ec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

