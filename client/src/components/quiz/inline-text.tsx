import { Fragment } from "react";

/**
 * Plain text with `inline code` spans — safe inside buttons (no block elements),
 * used for quiz options where full Markdown would be overkill.
 */
export function InlineText({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.length > 2 && part.startsWith("`") && part.endsWith("`") ? (
          <code
            key={i}
            className="rounded bg-surface-2 px-1 py-0.5 font-mono text-[0.85em] text-foreground [overflow-wrap:anywhere]"
          >
            {part.slice(1, -1)}
          </code>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}
