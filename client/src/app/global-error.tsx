"use client";

import { useEffect } from "react";
import "./globals.css";
import { themeInitScript } from "@/lib/init-scripts";

/** Replaces the root layout when it crashes — must render its own <html>/<body>. */
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>Something went wrong · HireReady</title>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="grid min-h-dvh place-items-center bg-background p-6 font-sans text-foreground antialiased">
        <main className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 text-center shadow-xl">
          <p className="font-mono text-sm font-medium text-brand">HireReady</p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">Something went wrong</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            An unexpected error stopped the app from loading. Try again — if it keeps happening, reload the page.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => retry()}
              className="inline-flex h-9 items-center rounded-lg bg-brand px-4 text-sm font-medium text-brand-foreground hover:bg-brand/90"
            >
              Try again
            </button>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- full reload is intended here */}
            <a
              href="/"
              className="inline-flex h-9 items-center rounded-lg border border-border px-4 text-sm font-medium hover:bg-surface-2"
            >
              Reload home
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
