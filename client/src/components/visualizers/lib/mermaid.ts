"use client";

/**
 * Lazy Mermaid loader. `import("mermaid")` keeps the (large) library out of the main bundle;
 * it is fetched the first time a diagram is rendered or parsed.
 */
import type { Mermaid } from "mermaid";
import { errorMessage } from "./utils";

let loader: Promise<Mermaid> | null = null;
let seq = 0;

export function loadMermaid(): Promise<Mermaid> {
  if (!loader) {
    loader = import("mermaid")
      .then((mod) => {
        const m = mod.default;
        m.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: "default",
          suppressErrorRendering: true,
          fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        });
        return m;
      })
      .catch((err: unknown) => {
        loader = null;
        throw err;
      });
  }
  return loader;
}

const BOM = String.fromCharCode(0xfeff);

/** Author text with a BOM / CRLF / leading blank lines removed. */
export function normalizeSource(source: string): string {
  let s = String(source ?? "");
  if (s.startsWith(BOM)) s = s.slice(1);
  return s.replace(/\r\n?/g, "\n").trimStart();
}

/**
 * Theme is passed per render through front-matter config (mermaid.initialize runs only once).
 * Authors never write front-matter (CONTENT_GUIDE forbids %%{init}%%), so we always own it.
 */
export function withTheme(source: string, dark: boolean): string {
  const body = normalizeSource(source);
  if (body.startsWith("---")) return body;
  return `---\nconfig:\n  theme: ${dark ? "dark" : "default"}\n---\n${body}`;
}

function cleanup(id: string) {
  if (typeof document === "undefined") return;
  for (const el of [document.getElementById(id), document.getElementById(`d${id}`), document.getElementById(`i${id}`)]) {
    el?.remove();
  }
}

export class MermaidError extends Error {}

/** Parses then renders; throws MermaidError with a readable message on failure. */
export async function renderMermaid(source: string, dark: boolean): Promise<string> {
  const m = await loadMermaid();
  seq += 1;
  const id = `hr-mermaid-${seq}`;
  try {
    // parse the author's text as-is so error line numbers match the content file
    await m.parse(normalizeSource(source));
    const { svg } = await m.render(id, withTheme(source, dark));
    return svg;
  } catch (err) {
    throw new MermaidError(errorMessage(err));
  } finally {
    cleanup(id);
  }
}

/** Parse only (used by /dev/content-check). Resolves to null when valid, or the error message. */
export async function parseMermaid(source: string): Promise<string | null> {
  const m = await loadMermaid();
  try {
    await m.parse(normalizeSource(source));
    return null;
  } catch (err) {
    return errorMessage(err);
  }
}
