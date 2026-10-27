"use client";

import type { ReactNode } from "react";
import { Highlight } from "prism-react-renderer";
import { Prism, prismLanguage, tokenTheme } from "@/lib/prism";
import { cn } from "@/lib/utils";
import { CopyButton } from "@/components/ui/copy-button";

export interface CodeBlockProps {
  code: string;
  /** snippet / fence language ("javascript", "py", "sql", …); unknown → plain text */
  language?: string;
  showLineNumbers?: boolean;
  /** 1-based lines to emphasise */
  highlightLines?: number[];
  /** header label (defaults to the language); pass `false` to hide the header bar */
  title?: ReactNode | false;
  /** extra controls rendered in the header (left of the copy button) */
  headerSlot?: ReactNode;
  copyable?: boolean;
  /** accessible label of the copy button */
  copyLabel?: string;
  className?: string;
  /** max height of the scroll area, e.g. "28rem" */
  maxHeight?: string;
}

/** Syntax-highlighted code with token colours, optional line numbers and a copy button. */
export function CodeBlock({
  code,
  language,
  showLineNumbers = false,
  highlightLines,
  title,
  headerSlot,
  copyable = true,
  copyLabel,
  className,
  maxHeight,
}: CodeBlockProps) {
  const lang = prismLanguage(language);
  const source = code.replace(/\n$/, "");
  const header = title !== false;
  const label = title ?? (language && language !== "text" ? language : "code");

  return (
    <div className={cn("group/code relative overflow-hidden rounded-xl border border-border bg-surface-2/60", className)}>
      {header && (
        <div className="flex min-h-9 items-center justify-between gap-2 border-b border-border bg-surface-2/80 px-3">
          <div className="min-w-0 truncate font-mono text-xs text-muted">{label}</div>
          <div className="flex shrink-0 items-center gap-1">
            {headerSlot}
            {copyable && (
              <CopyButton text={source} label={copyLabel ?? (typeof label === "string" ? `Copy ${label} code` : "Copy code")} showText />
            )}
          </div>
        </div>
      )}
      {!header && copyable && (
        <CopyButton
          text={source}
          label={copyLabel ?? "Copy code"}
          className="absolute right-2 top-2 z-10 bg-surface/80 opacity-0 backdrop-blur transition-opacity focus-visible:opacity-100 group-hover/code:opacity-100 max-sm:opacity-100"
        />
      )}
      <Highlight prism={Prism} theme={tokenTheme} code={source} language={lang}>
        {({ className: hlClass, style, tokens, getLineProps, getTokenProps }) => (
          <pre
            className={cn(hlClass, "overflow-x-auto py-3 font-mono text-[13px] leading-6")}
            style={{ ...style, maxHeight }}
            tabIndex={0}
          >
            <code className="block min-w-max">
              {tokens.map((line, i) => {
                const lineNo = i + 1;
                const emphasised = highlightLines?.includes(lineNo);
                const { className: lineClass, ...lineProps } = getLineProps({ line });
                return (
                  <span
                    key={i}
                    {...lineProps}
                    className={cn(
                      lineClass,
                      "flex px-4",
                      emphasised && "border-l-2 border-brand bg-brand-soft/70 pl-[14px]",
                    )}
                  >
                    {showLineNumbers && (
                      <span
                        aria-hidden
                        className="mr-4 inline-block w-6 shrink-0 select-none text-right tabular-nums text-muted/60"
                      >
                        {lineNo}
                      </span>
                    )}
                    <span className="whitespace-pre">
                      {line.map((token, key) => (
                        <span key={key} {...getTokenProps({ token })} />
                      ))}
                    </span>
                  </span>
                );
              })}
            </code>
          </pre>
        )}
      </Highlight>
    </div>
  );
}
