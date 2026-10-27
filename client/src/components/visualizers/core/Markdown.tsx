"use client";

import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "../lib/utils";

const ALLOWED = ["p", "strong", "em", "code", "del", "a", "br", "ul", "ol", "li", "span"];

const components: Components = {
  p: ({ children }) => <p className="[&:not(:first-child)]:mt-1.5">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  code: ({ children }) => (
    <code className="rounded-md border border-border bg-surface-2 px-1 py-px font-mono text-[0.86em] text-foreground">
      {children}
    </code>
  ),
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noreferrer noopener" className="text-brand underline underline-offset-2">
      {children}
    </a>
  ),
  ul: ({ children }) => <ul className="ml-4 list-disc">{children}</ul>,
  ol: ({ children }) => <ol className="ml-4 list-decimal">{children}</ol>,
};

/** Small markdown renderer for step notes / table cells (inline code, bold, italics, links). */
export function InlineMarkdown({ text, className }: { text: string; className?: string }) {
  if (!text) return null;
  return (
    <div className={cn("min-w-0 break-words", className)}>
      <Markdown remarkPlugins={[remarkGfm]} components={components} allowedElements={ALLOWED} unwrapDisallowed>
        {text}
      </Markdown>
    </div>
  );
}
