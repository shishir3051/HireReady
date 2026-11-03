"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Visual } from "@/lib/types";

/** One request per question, shared by every player on the page; a failed request is retried next time. */
const cache = new Map<string, Promise<Visual[] | null>>();

function englishVisuals(slug: string): Promise<Visual[] | null> {
  let pending = cache.get(slug);
  if (!pending) {
    pending = api.questions
      .get(slug, { lang: "en" })
      .then((d) => d.question.visuals ?? null)
      .catch(() => {
        cache.delete(slug);
        return null;
      });
    cache.set(slug, pending);
  }
  return pending;
}

/**
 * The English version of a question's walkthroughs, loaded only while `wanted`: on a Bangla page whose learner listens
 * in English (for example because the device has no Bangla voice), narration reads these English notes instead.
 */
export function useEnglishVisuals(slug: string | undefined, wanted: boolean): Visual[] | undefined {
  const [loaded, setLoaded] = useState<{ slug: string; visuals: Visual[] } | null>(null);

  useEffect(() => {
    if (!slug || !wanted) return;
    let alive = true;
    englishVisuals(slug).then((visuals) => {
      if (alive && visuals) setLoaded({ slug, visuals });
    });
    return () => {
      alive = false;
    };
  }, [slug, wanted]);

  return loaded && loaded.slug === slug ? loaded.visuals : undefined;
}
