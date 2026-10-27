import { Prism, type PrismTheme } from "prism-react-renderer";

/**
 * prism-react-renderer ships a fixed set of grammars. Java and Bash (used by solutions and git/terminal
 * content) are not included, so we register compact versions here once.
 */
type Grammar = Parameters<typeof Prism.languages.extend>[1];

if (!Prism.languages.java) {
  const java: Grammar = {
    "class-name": /\b[A-Z][a-z]\w*\b/,
    keyword:
      /\b(?:abstract|assert|boolean|break|byte|case|catch|char|class|const|continue|default|do|double|else|enum|exports|extends|final|finally|float|for|goto|if|implements|import|instanceof|int|interface|long|module|native|new|non-sealed|null|package|permits|private|protected|public|record|return|sealed|short|static|strictfp|super|switch|synchronized|this|throw|throws|transient|try|var|void|volatile|while|yield)\b/,
    string: { pattern: /(^|[^\\])"(?:\\.|[^"\\\r\n])*"/, lookbehind: true, greedy: true },
    char: { pattern: /'(?:\\.|[^'\\\r\n]){1,6}'/, greedy: true },
    function: /\b\w+(?=\s*\()/,
    number:
      /\b0b[01][01_]*L?\b|\b0x[\da-f_]+L?\b|(?:\b\d[\d_]*(?:\.[\d_]*)?|\B\.\d[\d_]*)(?:e[+-]?\d[\d_]*)?[dfl]?/i,
    operator: { pattern: /(^|[^.])(?:<<=?|>>>?=?|->|--|\+\+|&&|\|\||::|[?:~]|[-+*/%&|^!=<>]=?)/m, lookbehind: true },
    constant: /\b[A-Z][A-Z_\d]+\b/,
  };
  Prism.languages.java = Prism.languages.extend("clike", java);
  Prism.languages.insertBefore("java", "keyword", {
    annotation: { pattern: /(^|[^.])@\w+(?:\s*\.\s*\w+)*/, lookbehind: true, alias: "punctuation" },
  });
}

if (!Prism.languages.bash) {
  Prism.languages.bash = {
    shebang: { pattern: /^#!\s*\/.*/, alias: "important" },
    comment: { pattern: /(^|[^"{\\$])#.*/, lookbehind: true },
    string: { pattern: /(["'])(?:\\[\s\S]|\$\([^)]+\)|`[^`]+`|(?!\1)[^\\`])*\1/, greedy: true },
    variable: /\$(?:\w+|[#?*!@$]|\{[^}]+\})/,
    function: {
      pattern:
        /(^|[\s;|&]|[<>]\()(?:git|npm|npx|node|pnpm|yarn|cd|ls|mkdir|rm|cp|mv|cat|echo|grep|curl|docker|kubectl|sudo|chmod|chown|export|source|touch|java|javac|mvn|gradle|python|pip|ssh|kill|ps|top|find|sed|awk|tar|head|tail|less|man|which|ping|nslookup|dig|netstat|lsof)(?=$|[)\s;|&])/,
      lookbehind: true,
    },
    keyword: {
      pattern: /(^|[\s;|&]|[<>]\()(?:case|do|done|elif|else|esac|fi|for|function|if|in|select|then|until|while)(?=$|[)\s;&|])/,
      lookbehind: true,
    },
    boolean: { pattern: /(^|[\s;|&]|[<>]\()(?:false|true)(?=$|[)\s;|&])/, lookbehind: true },
    parameter: { pattern: /(^|\s)--?[\w-]+/, lookbehind: true, alias: "variable" },
    operator: /\d?<>|>\||\+=|=[=~]?|!=?|<<[<-]?|[&\d]?>>|\d[<>]&?|[<>][&=]?|&[>&]?|\|[&|]?/,
    punctuation: /\$?\(\(?|\)\)?|\.\.|[{}[\];\\]/,
    number: { pattern: /(^|\s)(?:[1-9]\d*|0)(?:[.,]\d+)?\b/, lookbehind: true },
  };
  Prism.languages.sh = Prism.languages.bash;
  Prism.languages.shell = Prism.languages.bash;
  Prism.languages.zsh = Prism.languages.bash;
  Prism.languages.console = Prism.languages.bash;
}

export { Prism };

const ALIASES: Record<string, string> = {
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  node: "javascript",
  ts: "typescript",
  py: "python",
  sh: "bash",
  shell: "bash",
  zsh: "bash",
  console: "bash",
  terminal: "bash",
  yml: "yaml",
  html: "markup",
  xml: "markup",
  "c++": "cpp",
  plaintext: "text",
  txt: "text",
  mermaid: "text",
};

/** Map a fence/snippet language to a registered Prism grammar ("text" when unknown). */
export function prismLanguage(lang: string | undefined | null): string {
  if (!lang) return "text";
  const l = lang.toLowerCase();
  const resolved = ALIASES[l] ?? l;
  return Prism.languages[resolved] ? resolved : "text";
}

const mix = (token: string, pct = 82) => `color-mix(in oklch, var(${token}) ${pct}%, var(--foreground))`;

/** Prism theme driven by the design tokens, so code follows light/dark automatically. */
export const tokenTheme: PrismTheme = {
  plain: { color: "var(--foreground)", backgroundColor: "transparent" },
  styles: [
    { types: ["comment", "prolog", "doctype", "cdata"], style: { color: "var(--muted)", fontStyle: "italic" } },
    { types: ["punctuation"], style: { color: mix("--muted", 85) } },
    { types: ["operator"], style: { color: mix("--viz-info", 70) } },
    { types: ["keyword", "atrule", "important", "rule"], style: { color: mix("--brand", 88) } },
    { types: ["string", "char", "attr-value", "regex", "inserted", "template-string"], style: { color: mix("--viz-success", 70) } },
    { types: ["number", "boolean", "constant", "symbol", "unit"], style: { color: mix("--viz-warning", 62) } },
    { types: ["function", "function-variable", "method"], style: { color: mix("--viz-primary", 80) } },
    { types: ["class-name", "builtin", "maybe-class-name", "namespace"], style: { color: mix("--viz-info", 72) } },
    { types: ["tag", "deleted", "selector"], style: { color: mix("--viz-danger", 75) } },
    { types: ["attr-name", "property", "variable", "parameter"], style: { color: mix("--viz-primary", 60) } },
    { types: ["annotation", "decorator", "shebang"], style: { color: mix("--viz-warning", 60) } },
    { types: ["bold"], style: { fontWeight: "bold" } },
    { types: ["italic"], style: { fontStyle: "italic" } },
  ],
};
