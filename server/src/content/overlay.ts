import fs from 'node:fs';
import path from 'node:path';
import type { Request } from 'express';
import type {
  ApiQuestion,
  ApiRoadmap,
  DifficultyT,
  QuestionDetailResponse,
  QuestionSummary,
  QuizResponse,
  TopicDetailResponse,
  TopicSummary,
  VisualTypeT,
} from '../types/api';

/** Server package root, found by walking up so this works from both src/ (tsx) and dist/ (tsc). */
function findServerRoot(): string {
  let dir = __dirname;
  while (!fs.existsSync(path.join(dir, 'package.json'))) {
    const parent = path.dirname(dir);
    if (parent === dir) throw new Error('server package.json not found');
    dir = parent;
  }
  return dir;
}

export const CONTENT_BN_DIR = path.join(findServerRoot(), 'src', 'data', 'content-bn');

export interface VisualOverlay {
  title?: string;
  caption?: string;
  steps?: { note?: string }[];
  frames?: { note?: string }[];
}

export interface QuestionOverlay {
  title?: string;
  prompt?: string;
  examples?: { explanation?: string }[];
  hints?: string[];
  approaches?: { idea?: string }[];
  solution?: {
    summary?: string;
    explanation?: string;
    keyPoints?: string[];
  };
  visuals?: VisualOverlay[];
  pitfalls?: string[];
  followUps?: { question?: string; answer?: string }[];
}

export interface QuizQuestionOverlay {
  question?: string;
  options?: string[];
  explanation?: string;
}

export interface TopicOverlay {
  topic?: {
    title?: string;
    summary?: string;
    overview?: string;
    cheatsheet?: { title: string; points: string[] }[];
    patterns?: { name: string; whenToUse: string }[];
  };
  questions?: Record<string, QuestionOverlay>;
  quiz?: Record<string, QuizQuestionOverlay>;
}

const overlayCache = new Map<string, TopicOverlay | null>();

/** Load or get cached Bangla overlay for a given topic slug. */
export function getBanglaOverlay(topicSlug: string): TopicOverlay | null {
  const cached = overlayCache.get(topicSlug);
  if (cached) {
    return cached;
  }

  const filePath = path.join(CONTENT_BN_DIR, `${topicSlug}.json`);
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as TopicOverlay;
    overlayCache.set(topicSlug, parsed);
    return parsed;
  } catch (err) {
    console.error(`Failed to parse Bangla overlay for "${topicSlug}":`, err);
    return null;
  }
}

/** Clear overlay cache (useful in dev/watch mode). */
export function clearOverlayCache(): void {
  overlayCache.clear();
}

/** Detects language ('en' | 'bn') from request query, cookies, or Accept-Language header. */
export function getRequestLang(req: Request): 'en' | 'bn' {
  const q = req.query?.lang;
  if (q === 'bn' || q === 'en') return q;

  const cookie = req.cookies?.['hr-lang'];
  if (cookie === 'bn' || cookie === 'en') return cookie;

  const accept = req.headers?.['accept-language'];
  if (typeof accept === 'string' && accept.toLowerCase().includes('bn')) {
    return 'bn';
  }

  return 'en';
}

/** Merge Bangla overlay into an ApiQuestion if lang is 'bn'. */
export function applyQuestionOverlay(q: ApiQuestion, lang?: string): ApiQuestion {
  if (lang !== 'bn') return q;
  const overlay = getBanglaOverlay(q.topic);
  const qOverlay = overlay?.questions?.[q.slug];
  if (!qOverlay) return q;

  return {
    ...q,
    title: qOverlay.title ?? q.title,
    prompt: qOverlay.prompt ?? q.prompt,
    examples: q.examples?.map((ex, idx) => ({
      ...ex,
      explanation: qOverlay.examples?.[idx]?.explanation ?? ex.explanation,
    })),
    hints: qOverlay.hints ?? q.hints,
    approaches: q.approaches?.map((app, idx) => ({
      ...app,
      idea: qOverlay.approaches?.[idx]?.idea ?? app.idea,
    })),
    solution: {
      ...q.solution,
      summary: qOverlay.solution?.summary ?? q.solution.summary,
      explanation: qOverlay.solution?.explanation ?? q.solution.explanation,
      keyPoints: qOverlay.solution?.keyPoints ?? q.solution.keyPoints,
    },
    visuals: q.visuals.map((vis, vIdx) => {
      const vOver = qOverlay.visuals?.[vIdx];
      if (!vOver) return vis;
      const base = {
        ...vis,
        title: vOver.title ?? vis.title,
        caption: vOver.caption ?? vis.caption,
      };

      if (vis.type === 'diagram') {
        return {
          ...base,
          frames: vis.frames.map((fr, fIdx) => ({
            ...fr,
            note: vOver.frames?.[fIdx]?.note ?? vOver.steps?.[fIdx]?.note ?? fr.note,
          })),
        };
      }

      if (vis.type === 'comparison') {
        return base;
      }

      return {
        ...base,
        steps: vis.steps.map((st, sIdx) => ({
          ...st,
          note: vOver.steps?.[sIdx]?.note ?? st.note,
        })),
      };
    }) as ApiQuestion['visuals'],
    pitfalls: qOverlay.pitfalls ?? q.pitfalls,
    followUps: q.followUps?.map((f, idx) => ({
      ...f,
      question: qOverlay.followUps?.[idx]?.question ?? f.question,
      answer: qOverlay.followUps?.[idx]?.answer ?? f.answer,
    })),
  };
}

/** Merge Bangla overlay into a QuestionDetailResponse. */
export function applyQuestionDetailOverlay(
  detail: QuestionDetailResponse,
  lang?: string,
): QuestionDetailResponse {
  if (lang !== 'bn') return detail;
  const overlay = getBanglaOverlay(detail.question.topic);
  const tOver = overlay?.topic;

  return {
    ...detail,
    question: applyQuestionOverlay(detail.question, lang),
    topic: {
      ...detail.topic,
      title: tOver?.title ?? detail.topic.title,
    },
    prev: detail.prev
      ? {
          slug: detail.prev.slug,
          title: overlay?.questions?.[detail.prev.slug]?.title ?? detail.prev.title,
        }
      : null,
    next: detail.next
      ? {
          slug: detail.next.slug,
          title: overlay?.questions?.[detail.next.slug]?.title ?? detail.next.title,
        }
      : null,
  };
}

/** Merge Bangla overlay into a QuestionSummary. */
export function applyQuestionSummaryOverlay(
  summary: QuestionSummary,
  lang?: string,
): QuestionSummary {
  if (lang !== 'bn') return summary;
  const overlay = getBanglaOverlay(summary.topic);
  const qOver = overlay?.questions?.[summary.slug];
  const tOver = overlay?.topic;

  return {
    ...summary,
    title: qOver?.title ?? summary.title,
    topicTitle: tOver?.title ?? summary.topicTitle,
    summary: qOver?.solution?.summary ?? summary.summary,
  };
}

/** Merge Bangla overlay into a TopicSummary. */
export function applyTopicSummaryOverlay(t: TopicSummary, lang?: string): TopicSummary {
  if (lang !== 'bn') return t;
  const overlay = getBanglaOverlay(t.slug);
  if (!overlay?.topic) return t;

  return {
    ...t,
    title: overlay.topic.title ?? t.title,
    summary: overlay.topic.summary ?? t.summary,
  };
}

/** Merge Bangla overlay into a TopicDetailResponse. */
export function applyTopicDetailOverlay(
  detail: TopicDetailResponse,
  lang?: string,
): TopicDetailResponse {
  if (lang !== 'bn') return detail;
  const overlay = getBanglaOverlay(detail.topic.slug);
  const tOver = overlay?.topic;

  return {
    ...detail,
    topic: {
      ...detail.topic,
      title: tOver?.title ?? detail.topic.title,
      summary: tOver?.summary ?? detail.topic.summary,
      overview: tOver?.overview ?? detail.topic.overview,
      cheatsheet: detail.topic.cheatsheet?.map((cs, idx) => ({
        ...cs,
        title: tOver?.cheatsheet?.[idx]?.title ?? cs.title,
        points: tOver?.cheatsheet?.[idx]?.points ?? cs.points,
      })),
      patterns: detail.topic.patterns?.map((pat, idx) => ({
        ...pat,
        name: tOver?.patterns?.[idx]?.name ?? pat.name,
        whenToUse: tOver?.patterns?.[idx]?.whenToUse ?? pat.whenToUse,
      })),
    },
    questions: detail.questions.map((q) => applyQuestionSummaryOverlay(q, lang)),
  };
}

/** Merge Bangla overlay into a QuizResponse. */
export function applyQuizOverlay(quiz: QuizResponse, lang?: string): QuizResponse {
  if (lang !== 'bn') return quiz;
  const overlay = getBanglaOverlay(quiz.topic.slug);
  if (!overlay) return quiz;

  return {
    ...quiz,
    topic: {
      ...quiz.topic,
      title: overlay.topic?.title ?? quiz.topic.title,
    },
    items: quiz.items.map((item) => {
      const qOver = overlay.quiz?.[item.id];
      if (!qOver) return item;
      return {
        ...item,
        question: qOver.question ?? item.question,
        options: qOver.options ?? item.options,
        explanation: qOver.explanation ?? item.explanation,
      };
    }),
  };
}

let cachedBnRoadmap: ApiRoadmap | null = null;

/** Merge Bangla overlay into an ApiRoadmap. */
export function applyRoadmapOverlay(rm: ApiRoadmap, lang?: string): ApiRoadmap {
  if (lang !== 'bn') return rm;
  if (!cachedBnRoadmap) {
    const bnPath = path.join(findServerRoot(), 'src', 'data', 'roadmap-bn.json');
    if (fs.existsSync(bnPath)) {
      try {
        cachedBnRoadmap = JSON.parse(fs.readFileSync(bnPath, 'utf8')) as ApiRoadmap;
      } catch (err) {
        console.error('Failed to load roadmap-bn.json:', err);
      }
    }
  }

  if (!cachedBnRoadmap) return rm;

  return {
    ...rm,
    title: cachedBnRoadmap.title ?? rm.title,
    description: cachedBnRoadmap.description ?? rm.description,
    days: rm.days.map((d: ApiRoadmap['days'][number], i: number) => {
      const bnDay = cachedBnRoadmap?.days?.[i];
      if (!bnDay) return d;
      return {
        ...d,
        title: bnDay.title ?? d.title,
        goals: bnDay.goals ?? d.goals,
      };
    }),
  };
}
