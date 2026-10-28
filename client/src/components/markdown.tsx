import Link from "next/link";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { CodeBlock } from "@/components/code-block";

interface HastNode {
  type: string;
  tagName?: string;
  value?: string;
  properties?: { className?: unknown };
  children?: HastNode[];
}

function hastText(node: HastNode | undefined): string {
  if (!node) return "";
  if (node.type === "text") return node.value ?? "";
  return (node.children ?? []).map(hastText).join("");
}

/** Drop react-markdown's `node` prop so it is not forwarded to the DOM. */
function clean<P extends { node?: unknown }>(props: P): Omit<P, "node"> {
  const { node, ...rest } = props;
  void node;
  return rest;
}

const components: Components = {
  h1: (p) => {
    const { className, ...props } = clean(p);
    return <h2 className={cn("mt-6 scroll-mt-20 text-xl font-semibold tracking-tight first:mt-0", className)} {...props} />;
  },
  h2: (p) => {
    const { className, ...props } = clean(p);
    return <h3 className={cn("mt-5 scroll-mt-20 text-lg font-semibold tracking-tight first:mt-0", className)} {...props} />;
  },
  h3: (p) => {
    const { className, ...props } = clean(p);
    return <h4 className={cn("mt-4 scroll-mt-20 text-base font-semibold first:mt-0", className)} {...props} />;
  },
  h4: (p) => {
    const { className, ...props } = clean(p);
    return (
      <h5 className={cn("mt-3 text-sm font-semibold uppercase tracking-wide text-muted first:mt-0", className)} {...props} />
    );
  },
  p: (p) => {
    const { className, ...props } = clean(p);
    return <p className={cn("my-3 first:mt-0 last:mb-0", className)} {...props} />;
  },
  a: (p) => {
    const { href = "", className, children, ...props } = clean(p);
    const cls = cn(
      "font-medium text-brand underline decoration-brand/30 underline-offset-2 hover:decoration-brand",
      className,
    );
    if (href.startsWith("/") && !href.startsWith("//")) {
      return (
        <Link href={href} className={cls}>
          {children}
        </Link>
      );
    }
    const external = /^https?:\/\//.test(href);
    return (
      <a href={href} className={cls} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})} {...props}>
        {children}
      </a>
    );
  },
  ul: (p) => {
    const { className, ...props } = clean(p);
    return <ul className={cn("my-3 list-disc space-y-1.5 pl-5 marker:text-muted first:mt-0 last:mb-0", className)} {...props} />;
  },
  ol: (p) => {
    const { className, ...props } = clean(p);
    return (
      <ol className={cn("my-3 list-decimal space-y-1.5 pl-5 marker:text-muted first:mt-0 last:mb-0", className)} {...props} />
    );
  },
  li: (p) => {
    const { className, ...props } = clean(p);
    return <li className={cn("pl-1 [&>ol]:my-1.5 [&>ul]:my-1.5", className)} {...props} />;
  },
  blockquote: (p) => {
    const { className, ...props } = clean(p);
    return (
      <blockquote
        className={cn("my-3 rounded-r-lg border-l-2 border-brand/50 bg-brand-soft/40 py-2 pl-4 pr-3 text-foreground/90", className)}
        {...props}
      />
    );
  },
  hr: (p) => {
    const { className, ...props } = clean(p);
    return <hr className={cn("my-4 border-border", className)} {...props} />;
  },
  strong: (p) => {
    const { className, ...props } = clean(p);
    return <strong className={cn("font-bold text-foreground", className)} {...props} />;
  },
  table: (p) => {
    const { className, ...props } = clean(p);
    return (
      <div className="my-3 overflow-x-auto rounded-lg border border-border">
        <table className={cn("w-full border-collapse text-left text-sm", className)} {...props} />
      </div>
    );
  },
  thead: (p) => {
    const { className, ...props } = clean(p);
    return <thead className={cn("bg-surface-2", className)} {...props} />;
  },
  th: (p) => {
    const { className, ...props } = clean(p);
    return <th className={cn("whitespace-nowrap border-b border-border px-3 py-2 font-semibold", className)} {...props} />;
  },
  td: (p) => {
    const { className, ...props } = clean(p);
    return <td className={cn("border-b border-border px-3 py-2 align-top", className)} {...props} />;
  },
  img: (p) => {
    const { alt = "", className, ...props } = clean(p);
    return (
      // eslint-disable-next-line @next/next/no-img-element -- markdown images have unknown dimensions
      <img alt={alt} loading="lazy" className={cn("my-3 max-w-full rounded-lg border border-border", className)} {...props} />
    );
  },
  // Inline code only — fenced blocks are rendered by `pre` below.
  code: (p) => {
    const { className, ...props } = clean(p);
    return (
      <code
        className={cn(
          "rounded-md border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[0.85em] text-foreground [overflow-wrap:anywhere]",
          className,
        )}
        {...props}
      />
    );
  },
  pre: ({ node }) => {
    const codeEl = (node as HastNode | undefined)?.children?.find((c) => c.type === "element" && c.tagName === "code");
    const classes = codeEl?.properties?.className;
    const list = Array.isArray(classes) ? classes.map(String) : typeof classes === "string" ? classes.split(" ") : [];
    const language = list.find((c) => c.startsWith("language-"))?.slice("language-".length);
    return <CodeBlock code={hastText(codeEl)} language={language} className="my-3" />;
  },
};

export function sanitizeMarkdown(raw: string): string {
  if (!raw || typeof raw !== "string") return raw;

  let text = raw;

  // 1. Pair-based bold fixing:
  // - Strips internal whitespace: "** sliding window **" -> "**sliding window**"
  // - Ensures outer space between words and "**": "শব্দ**বোল্ড**শব্দ" -> "শব্দ **বোল্ড** শব্দ"
  // - Preserves punctuation attached outside: "(**বোল্ড**)" -> "(**বোল্ড**)"
  text = text.replace(
    /(^|[^\s*([{<`"']?)(\*\*)\s*([^*\n]+?)\s*(\*\*)([^\s*.,;:!?")\]}>`"']?|$)/g,
    (match, before, _open, inner, _close, after) => {
      const trimmed = inner.trim();
      if (!trimmed) return match;
      const prefix = before ? `${before} ` : "";
      const suffix = after ? ` ${after}` : "";
      return `${prefix}**${trimmed}**${suffix}`;
    },
  );

  // 2. Ensure headings have newlines before them if collapsed:
  // e.g. "কিছু টেক্সট। ## শিরোনাম" -> "কিছু টেক্সট।\n\n## শিরোনাম"
  text = text.replace(/([^\n])\s*(#{1,6}\s+)/g, "$1\n\n$2");

  // Fix lonely '#' lines: "#\n\n# শিরোনাম" -> "# শিরোনাম"
  text = text.replace(/^#\s*\n+/gm, "");

  // 3. Ensure bullet items are on their own lines:
  // e.g. "হুক। - **ইভেন্ট লুপ**" -> "হুক।\n- **ইভেন্ট লুপ**"
  text = text.replace(/([^\n])\s+-\s+/g, "$1\n- ");

  // 4. Ensure numbered lists are on their own lines:
  // e.g. "বলুন। 3. **একটি ইউটিলিটি..." -> "বলুন।\n\n3. **একটি ইউটিলিটি..."
  text = text.replace(/([^\n])\s+(\d+\.\s+)/g, "$1\n\n$2");

  // 5. Clean up table rows collapsed into one line:
  text = text.replace(/\|\s*\|\s*([-:]{2,})/g, "|\n| $1");
  text = text.replace(/\|\s*\|\s*([A-Za-z0-9\u0980-\u09FF`])/g, "|\n| $1");

  // Clean up excessive newlines
  text = text.replace(/\n{3,}/g, "\n\n");

  return text.trim();
}

export interface MarkdownProps {
  children: string;
  className?: string;
  /** "sm" for dense UI (cards, accordions), "base" for reading */
  size?: "sm" | "base";
}

/**
 * GitHub-flavoured markdown rendered with design tokens. Works in server and client components.
 * Fenced code is highlighted (CodeBlock) with a copy button. Raw HTML is not rendered.
 */
export function Markdown({ children, className, size = "base" }: MarkdownProps) {
  const content = sanitizeMarkdown(children);

  return (
    <div
      className={cn(
        "min-w-0 break-words text-foreground/90 [&_tr:last-child>td]:border-b-0",
        size === "base" ? "text-[15px] leading-[1.65]" : "text-sm leading-6",
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
