"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { VisualThumbnail, VisualWalkthrough } from "@/components/visualizers";
import { FIXTURES, type Fixture } from "./fixtures";

const GROUPS: Fixture["group"][] = ["Example questions", "Algorithms", "Concepts", "Edge cases"];

function subscribe(cb: () => void) {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => mo.disconnect();
}

/** Dev-only theme flip (not persisted; the app's theme provider owns the real toggle). */
function ThemeFlip() {
  const dark = useSyncExternalStore(
    subscribe,
    () => document.documentElement.classList.contains("dark"),
    () => false,
  );
  return (
    <button
      type="button"
      onClick={() => document.documentElement.classList.toggle("dark")}
      className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-sm font-medium shadow-xs transition-colors hover:bg-surface-2"
    >
      {dark ? <Sun aria-hidden className="size-4" /> : <Moon aria-hidden className="size-4" />}
      {dark ? "Light" : "Dark"}
    </button>
  );
}

export function VisualGallery() {
  const allVisuals = FIXTURES.flatMap((f) => f.visuals.map((v, i) => ({ fixture: f, v, i })));
  const types = new Set(allVisuals.map((x) => x.v.type));
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand">Dev</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Visualizer gallery</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            {FIXTURES.length} fixtures · {allVisuals.length} visuals · {types.size} / 10 visual types. Hand-written data covering every
            renderer plus awkward-but-valid edge cases.
          </p>
        </div>
        <ThemeFlip />
      </header>

      <nav aria-label="Fixtures" className="mt-6 flex flex-wrap gap-1.5">
        {FIXTURES.map((f) => (
          <a
            key={f.id}
            href={`#${f.id}`}
            className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs text-muted transition-colors hover:text-foreground"
          >
            {f.group === "Edge cases" ? `edge: ${f.title}` : f.title}
          </a>
        ))}
      </nav>

      <section aria-labelledby="thumbs" className="mt-8">
        <h2 id="thumbs" className="text-sm font-semibold uppercase tracking-wider text-muted">
          Thumbnails
        </h2>
        <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {allVisuals.map(({ fixture, v, i }) => (
            <li key={`${fixture.id}-${i}`} className="min-w-0">
              <a href={`#${fixture.id}`} className="group block">
                <VisualThumbnail visual={v} className="transition-colors group-hover:border-brand/50" />
                <p className="mt-1 truncate text-[11px] text-muted" title={v.title}>
                  <span className="font-mono">{v.type}</span> · {v.title}
                </p>
              </a>
            </li>
          ))}
        </ul>
      </section>

      {GROUPS.map((g) => (
        <section key={g} className="mt-12" aria-labelledby={`g-${g}`}>
          <h2 id={`g-${g}`} className="border-b border-border pb-2 text-lg font-semibold tracking-tight">
            {g}
          </h2>
          <div className="mt-6 flex flex-col gap-10">
            {FIXTURES.filter((f) => f.group === g).map((f) => (
              <article key={f.id} id={f.id} className="scroll-mt-6">
                <h3 className="text-base font-semibold">{f.title}</h3>
                {f.description ? <p className="mt-0.5 text-sm text-muted">{f.description}</p> : null}
                <VisualWalkthrough visuals={f.visuals} code={f.code} className="mt-3" />
              </article>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
