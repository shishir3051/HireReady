/**
 * Speakable narration text. Step notes are written for the eye — `code`, **bold**, arrows, comparison signs, `nums[i]`,
 * `maxSum`, O(n log n) — and speech voices either skip those or read the symbol's name ("rightwards arrow"). Here they
 * are spelled out as words in the note's language, and the result is cut into sentence-sized pieces: Chrome's Google
 * voices stop after about 15 seconds of one utterance, and short pieces with a breath between them are easier to follow.
 * Pure functions, no browser APIs. Rules are ordered: earlier stages must not destroy what later stages read.
 */
import { plainText } from "./utils";

export type SpeechLang = "en" | "bn";

/** Bengali letters mean a Bangla note; ৳ or Bengali digits alone do not (English notes write ৳500). */
export const isBanglaText = (text: string) => /[অ-হৎড়-য়]/.test(text);

/** Word joiner: keeps the words of one spoken code term together ("nums-এর⁠mid") so a comparison takes the whole term. */
const G = "⁠";
const glue = (text: string) => (/[()]/.test(text) ? text : text.trim().replace(/\s+/g, G));
/** Placeholder for the slashes of a path or URL while other rules run. */
const PATH_SLASH = "";

type Binary = (a: string, b: string) => string;
type Unary = (x: string) => string;

/** How a comparison sign is read: with both operands, with only the right one, or on its own. */
interface Relation {
  both: Binary;
  right: Unary;
  bare: string;
}

interface Words {
  to: string;
  chain: string;
  afterIncrement: string;
  swap: string;
  so: string;
  equals: string;
  plus: string;
  minus: string;
  negative: string;
  times: string;
  countTimes: string;
  cross: string;
  dividedBy: string;
  slash: string;
  mod: string;
  and: string;
  or: string;
  andOperator: string;
  orOperator: string;
  bitAnd: string;
  bitOr: string;
  not: string;
  xor: string;
  shiftLeft: string;
  shiftRight: string;
  unsignedShiftRight: string;
  plusEquals: string;
  minusEquals: string;
  plusPlus: string;
  minusMinus: string;
  dash: string;
  dot: string;
  star: string;
  hash: string;
  at: string;
  number: string;
  tilde: string;
  infinity: string;
  about: string;
  plusMinus: string;
  emptySet: string;
  emptyList: string;
  empty: string;
  emptyString: string;
  bracket: string;
  open: string;
  close: string;
  forExample: string;
  thatIs: string;
  versus: string;
  up: string;
  down: string;
  from: string;
  start: string;
  end: string;
  bigO: string;
  theta: string;
  omega: string;
  floorOf: string;
  ceilingOf: string;
  logBase: string;
  lambda: string;
  sumOf: string;
  prime: string;
  taka: string;
  lt: Relation;
  le: Relation;
  gt: Relation;
  ge: Relation;
  ne: Relation;
  isIn: Relation;
  notIn: Relation;
  eqStrict: Relation;
  eqLoose: Relation;
  index: Binary;
  slice: (name: string, from: string, to: string) => string;
  call: Unary;
  squared: Unary;
  cubed: Unary;
  power: Binary;
  sqrt: Unary;
  abs: Unary;
  factorial: Unary;
  between: Binary;
  halfOpen: Binary;
  openClosed: Binary;
  tag: Unary;
  array: Unary;
  /** names for a quoted punctuation mark: ',' → "comma" */
  symbols: Record<string, string>;
}

/** "is" is not repeated after a copula: "which is not < n" → "which is not less than n". */
const COPULA = /^(is|are|was|were|be|been|being|not|still|already|now|always|never|also|stays)$/i;
const enRel = (word: string): Relation => ({
  both: (a, b) => `${a} ${COPULA.test(a) ? "" : "is "}${word} ${b}`,
  right: (b) => `${word} ${b}`,
  bare: word,
});
const enOp = (word: string): Relation => ({ both: (a, b) => `${a} ${word} ${b}`, right: (b) => `${word} ${b}`, bare: word });

const EN: Words = {
  to: "to",
  chain: " to ",
  afterIncrement: " to ",
  swap: "and",
  so: "so",
  equals: "equals",
  plus: "plus",
  minus: "minus",
  negative: "minus",
  times: "times",
  countTimes: "times",
  cross: "cross",
  dividedBy: "divided by",
  slash: "slash",
  mod: "mod",
  and: "and",
  or: "or",
  andOperator: "AND",
  orOperator: "OR",
  bitAnd: "bitwise and",
  bitOr: "bitwise or",
  not: "not",
  xor: "xor",
  shiftLeft: "shifted left by",
  shiftRight: "shifted right by",
  unsignedShiftRight: "unsigned shifted right by",
  plusEquals: "plus equals",
  minusEquals: "minus equals",
  plusPlus: "plus plus",
  minusMinus: "minus minus",
  dash: "dash",
  dot: "dot",
  star: "star",
  hash: "hash",
  at: "at",
  number: "number",
  tilde: "tilde",
  infinity: "infinity",
  about: "about",
  plusMinus: "plus or minus",
  emptySet: "the empty set",
  emptyList: "an empty list",
  empty: "empty",
  emptyString: "the empty string",
  bracket: "bracket",
  open: "open",
  close: "close",
  forExample: "for example",
  thatIs: "that is",
  versus: "versus",
  up: "up",
  down: "down",
  from: "from",
  start: "the start",
  end: "the end",
  bigO: "big O of",
  theta: "theta of",
  omega: "omega of",
  floorOf: "floor of",
  ceilingOf: "ceiling of",
  logBase: "log base",
  lambda: "lambda",
  sumOf: "the sum of",
  prime: "prime",
  taka: "taka",
  lt: enRel("less than"),
  le: enRel("at most"),
  gt: enRel("greater than"),
  ge: enRel("at least"),
  ne: enRel("not equal to"),
  isIn: enRel("in"),
  notIn: enRel("not in"),
  eqStrict: enOp("strictly equals"),
  eqLoose: enOp("double equals"),
  index: (name, idx) => `${name} at ${idx}`,
  slice: (name, from, to) => `${name} from ${from} to ${to}`,
  call: (name) => `${name} of`,
  squared: (x) => `${x} squared`,
  cubed: (x) => `${x} cubed`,
  power: (b, e) => `${b} to the power ${e}`,
  sqrt: (x) => `the square root of ${x}`,
  abs: (x) => `the absolute value of ${x}`,
  factorial: (x) => `${x} factorial`,
  between: (a, b) => `${a} and ${b}`,
  halfOpen: (a, b) => `from ${a} up to but not including ${b}`,
  openClosed: (a, b) => `after ${a}, up to and including ${b}`,
  tag: (x) => `${x} tag`,
  array: (x) => `${x} array`,
  symbols: {
    ",": "comma", ".": "dot", "?": "question mark", "!": "exclamation mark", ":": "colon", ";": "semicolon",
    "+": "plus", "-": "dash", "*": "star", "/": "slash", "#": "hash", "@": "at", "&": "ampersand", "|": "pipe",
    "^": "caret", "~": "tilde", "=": "equals sign", "<": "less-than sign", ">": "greater-than sign", "%": "percent",
    "$": "dollar", "_": "underscore", " ": "space", "\\": "backslash",
  },
};

// Bangla: math words in Bangla (the order differs: "a, b-এর চেয়ে ছোট" = "a is less than b"); code terms and operator
// names stay English, as Bangla-speaking programmers say them.
const bnRel = (tail: string, bare: string): Relation => ({
  both: (a, b) => `${a}, ${b}-এর ${tail}`,
  right: (b) => `, ${b}-এর ${tail}`,
  bare,
});
const bnOp = (word: string): Relation => ({ both: (a, b) => `${a} ${word} ${b}`, right: (b) => `${word} ${b}`, bare: word });

const BN: Words = {
  to: "থেকে",
  chain: ", তারপর ",
  afterIncrement: ", এখন ",
  swap: "ও",
  so: "তাই",
  equals: "সমান",
  plus: "যোগ",
  minus: "বিয়োগ",
  negative: "মাইনাস",
  times: "গুণ",
  countTimes: "বার",
  cross: "ক্রস",
  dividedBy: "ভাগ",
  slash: "স্ল্যাশ",
  mod: "মড",
  and: "এবং",
  or: "অথবা",
  andOperator: "AND",
  orOperator: "OR",
  bitAnd: "AND",
  bitOr: "OR",
  not: "নট",
  xor: "XOR",
  shiftLeft: "লেফট শিফট",
  shiftRight: "রাইট শিফট",
  unsignedShiftRight: "আনসাইনড রাইট শিফট",
  plusEquals: "প্লাস ইকুয়ালস",
  minusEquals: "মাইনাস ইকুয়ালস",
  plusPlus: "প্লাস প্লাস",
  minusMinus: "মাইনাস মাইনাস",
  dash: "ড্যাশ",
  dot: "ডট",
  star: "স্টার",
  hash: "হ্যাশ",
  at: "at",
  number: "নম্বর",
  tilde: "টিল্ডা",
  infinity: "অসীম",
  about: "প্রায়",
  plusMinus: "প্লাস-মাইনাস",
  emptySet: "খালি সেট",
  emptyList: "খালি লিস্ট",
  empty: "খালি",
  emptyString: "খালি স্ট্রিং",
  bracket: "ব্র্যাকেট",
  open: "ওপেন",
  close: "ক্লোজ",
  forExample: "যেমন",
  thatIs: "অর্থাৎ",
  versus: "বনাম",
  up: "উপরে",
  down: "নিচে",
  from: "থেকে",
  start: "শুরু",
  end: "শেষ",
  bigO: "big O of",
  theta: "theta of",
  omega: "omega of",
  floorOf: "floor of",
  ceilingOf: "ceiling of",
  logBase: "log base",
  lambda: "lambda",
  sumOf: "যোগফল",
  prime: "প্রাইম",
  taka: "টাকা",
  lt: bnRel("চেয়ে ছোট", "ছোট"),
  le: bnRel("চেয়ে ছোট বা সমান", "ছোট বা সমান"),
  gt: bnRel("চেয়ে বড়", "বড়"),
  ge: bnRel("চেয়ে বড় বা সমান", "বড় বা সমান"),
  ne: bnRel("সমান নয়", "সমান নয়"),
  isIn: bnRel("মধ্যে আছে", "মধ্যে আছে"),
  notIn: bnRel("মধ্যে নেই", "মধ্যে নেই"),
  eqStrict: bnOp("ট্রিপল ইকুয়াল"),
  eqLoose: bnOp("ডাবল ইকুয়াল"),
  index: (name, idx) => `${name}-এর ${idx}`,
  slice: (name, from, to) => `${name}-এর ${from} থেকে ${to}`,
  call: (name) => name,
  squared: (x) => `${x}-এর বর্গ`,
  cubed: (x) => `${x}-এর ঘন`,
  power: (b, e) => `${b}-এর ${e} ঘাত`,
  sqrt: (x) => `${x}-এর বর্গমূল`,
  abs: (x) => `${x}-এর পরম মান`,
  factorial: (x) => `${x} ফ্যাক্টোরিয়াল`,
  between: (a, b) => `${a} ও ${b}`,
  halfOpen: (a, b) => `${a} থেকে ${b}-এর আগ পর্যন্ত`,
  openClosed: (a, b) => `${a}-এর পর থেকে ${b} পর্যন্ত`,
  tag: (x) => `${x} ট্যাগ`,
  array: (x) => `${x} array`,
  symbols: {
    ",": "কমা", ".": "ডট", "?": "প্রশ্নবোধক চিহ্ন", "!": "বিস্ময়সূচক চিহ্ন", ":": "কোলন", ";": "সেমিকোলন",
    "+": "প্লাস", "-": "ড্যাশ", "*": "স্টার", "/": "স্ল্যাশ", "#": "হ্যাশ", "@": "at", "&": "অ্যাম্পারস্যান্ড",
    "|": "পাইপ", "^": "ক্যারেট", "~": "টিল্ডা", "=": "ইকুয়াল চিহ্ন", "<": "লেস-দ্যান চিহ্ন", ">": "গ্রেটার-দ্যান চিহ্ন",
    "%": "পার্সেন্ট", "$": "ডলার", "_": "আন্ডারস্কোর", " ": "স্পেস", "\\": "ব্যাকস্ল্যাশ",
  },
};

const SUPERSCRIPT: Record<string, string> = {
  "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9",
  "ⁿ": "n", "ᵏ": "k", "⁺": "+", "⁻": "-",
};
const SUBSCRIPT: Record<string, string> = {
  "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4", "₅": "5", "₆": "6", "₇": "7", "₈": "8", "₉": "9",
};
const SUPERS = "⁰¹²³⁴⁵⁶⁷⁸⁹ⁿᵏ⁺⁻";
const mapChars = (text: string, table: Record<string, string>) => [...text].map((c) => table[c] ?? c).join("");

const IDENT = String.raw`[A-Za-z_$][\w$]*`;
/** a base or exponent: a parenthesised group or a single token (any script, e.g. φⁿ) */
const TERM = String.raw`\([^()]*\)|[\p{L}\p{Nd}_.]+`; // \p{Nd}: not superscript digits, which are the exponent
/**
 * One side of a comparison: a single token (glued code terms count as one). It never starts with an operator sign and
 * never holds a danda, so "3 < 12।" keeps its full stop out of the operand.
 */
const OPERAND = String.raw`(?:!(?=\w))?[^\s,;:()।=<>!][^\s,;:()।]*`;
/** Bangla puts the verb after the right side, so it also takes a "= value" or a label's number: "hi = 3", "bRight 14". */
const BN_RIGHT = String.raw`${OPERAND}(?:\s*=\s*${OPERAND}|\s+\d[\d.]*(?![\wঀ-৿]))?`;
/** words before "(" that are syntax, not functions ("if (", "while (") */
const KEYWORDS = /^(if|for|while|switch|return|catch|function|elif|else|and|or|not|in|of|typeof|sizeof|new|await|yield|print)$/;

const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

/** A token that reads as a value: number, code identifier, quoted string, single letter, ID like C2 or #3. */
function isValue(token: string): boolean {
  return (
    /^[-+−]?\d/.test(token) ||
    /^["'`]/.test(token) ||
    /[\d_$#.[\]′]/.test(token) ||
    /^[A-Za-z]$/.test(token) ||
    /^[A-Z0-9]{2,}$/.test(token) ||
    /[a-z][A-Z]/.test(token) ||
    /(\+\+|--)$/.test(token) ||
    /^(null|true|false|None|nil)$/.test(token)
  );
}

/**
 * How to read "→", by what surrounds it:
 * - after x++ / x--: the new value ("top plus plus to 1"; Bangla ", এখন")
 * - in a chain a → b → c: a sequence ("to"; Bangla ", তারপর" — "থেকে" would mean "from")
 * - after "= value" or a comparison: the result (", so" / ", তাই")
 * - between two values or two states (5 → 3, Waiting → Ready), or in a short mapping (value → index): "to"
 * - after any other clause (col 2 is safe → place a queen): ", so"
 */
function arrowWord(whole: string, offset: number, length: number, w: Words): string {
  const before = whole.slice(0, offset);
  if (!before.trim()) return ""; // a leading arrow is just a bullet
  const after = whole.slice(offset + length);
  const clean = (t: string) => t.replace(/^[(\[{'"]+/, "").replace(/[.,;:!?)\]}'"।]+$/, "");
  const prevToken = clean(/(\S+)\s*$/.exec(before)?.[1] ?? "");
  const nextToken = clean(/^\s*(\S+)/.exec(after)?.[1] ?? "");
  // "।" is the Bangla full stop: it ends a clause like "."
  const clauseBefore = before.split(/[.;:!?,।]/).pop() ?? "";
  const clauseAfter = after.split(/[.;:!?,।]/)[0] ?? "";
  const segmentBefore = (clauseBefore.split("→").pop() ?? "").split("(").pop() ?? "";
  const segmentAfter = (clauseAfter.split("→")[0] ?? "").split(")")[0] ?? "";
  const calcAfter = /[=+−×÷*<>≤≥≠]|\s-\s/.test(segmentAfter);
  if (/(\+\+|--)$/.test(prevToken)) return w.afterIncrement;
  if ((clauseBefore.includes("→") || clauseAfter.includes("→")) && !calcAfter) return w.chain;
  if (/[=≠<>≤≥]/.test(segmentBefore) && !/^[A-Z][A-Z_]+$/.test(nextToken)) return `, ${w.so} `;
  const state = (t: string) => /^[A-Z][a-z]+$/.test(t);
  if (((isValue(prevToken) && isValue(nextToken)) || (state(prevToken) && state(nextToken))) && !calcAfter) {
    return ` ${w.to} `;
  }
  if (wordCount(segmentBefore) <= 2 && wordCount(segmentAfter) <= 2) return ` ${w.to} `;
  return `, ${w.so} `;
}

/** n² → "n squared", 2³¹ → "2 to the power 31", 2^n → "2 to the power n"; glued so a comparison keeps the whole term. */
function powers(text: string, w: Words): string {
  return text
    .replace(new RegExp(`(${TERM})([${SUPERS}]+)`, "gu"), (_m, base: string, sup: string) => {
      const e = mapChars(sup, SUPERSCRIPT);
      return ` ${glue(e === "2" ? w.squared(base) : e === "3" ? w.cubed(base) : w.power(base, e))} `;
    })
    .replace(new RegExp(`(${TERM})\\^(${TERM})`, "gu"), (_m, base: string, e: string) => ` ${glue(w.power(base, e))} `);
}

/** Sentence punctuation (and a closing quote) at the end of a right operand goes after the whole comparison. */
function splitEnd(b: string): [string, string] {
  const end = /[.?!"'”’]+$/.exec(b)?.[0] ?? "";
  return end && end.length < b.length ? [b.slice(0, b.length - end.length), end] : [b, ""];
}

/** Replaces `a OP b` with its sentence; a sign with only a right operand, or none, gets the matching shorter form. */
function binary(text: string, op: string, rel: Relation, lang: SpeechLang): string {
  const right = lang === "bn" ? BN_RIGHT : OPERAND;
  return text
    .replace(new RegExp(`(${OPERAND})\\s*(?:${op})\\s*(${right})`, "g"), (_m, a: string, b: string) => {
      const [core, end] = splitEnd(b);
      return ` ${rel.both(a, core)}${end} `;
    })
    .replace(new RegExp(`(^|[(\\s])(?:${op})\\s*(${right})`, "g"), (_m, pre: string, b: string) => {
      const [core, end] = splitEnd(b);
      const phrase = rel.right(core);
      return `${pre}${pre === "(" ? phrase.replace(/^,\s*/, "") : phrase}${end} `;
    })
    .replace(new RegExp(`\\s*(?:${op})\\s*`, "g"), ` ${rel.bare} `);
}

/** "-" with spaces: subtraction between values (a - b, n - 1), otherwise a dash in prose (S - Situation, … - চালিয়ে যান). */
function isMinus(a: string, b: string): boolean {
  const numeric = (t: string) => /^[-+−]?[\d.]+$/.test(t);
  return (
    numeric(a) ||
    numeric(b) ||
    /[)\]]$/.test(a) ||
    /^[([]/.test(b) ||
    (/^[A-Za-z]$/.test(a) && /^[A-Za-z]$/.test(b)) ||
    a.includes(G) // a glued code term: nums at i - 1
  );
}

/** "(()" → "open, open, close"; a single bracket → "open bracket". */
function spellBrackets(brackets: string, w: Words): string {
  const name = (c: string) => ("([{".includes(c) ? w.open : w.close);
  return brackets.length === 1 ? `${name(brackets)} ${w.bracket}` : [...brackets].map(name).join(", ");
}

/** A step note → text a speech voice reads clearly, in the note's language. */
export function speechText(note: string, lang: SpeechLang): string {
  const w = lang === "bn" ? BN : EN;
  let s = plainText(note)
    .replace(/৷/g, "।") // some Bangla notes end sentences with ৷ (a number sign), not the danda
    .replace(/\*{2,}/g, " ") // unpaired ** left by the markdown strip
    .replace(/\*(?=["“'‘ঀ-৿])|(?<=[ঀ-৿।]\s?)\*/g, " ") // stray italic * beside Bangla
    .replace(/৳\s?(\d[\d,]*)/g, `$1 ${w.taka}`);

  // paths and URLs keep their slashes (read "slash" at the end); network masks and HTTP versions are not division
  s = s
    .replace(/(\d+\.\d+\.\d+\.\d+)\/(\d+)/g, `$1 ${PATH_SLASH} $2`)
    .replace(/\b(HTTPS?)\/(\d(?:\.\d)?)\b/g, "$1 $2")
    .replace(/(^|[\s(`"'])((?:https?:\/\/|\/)[^\s)`"']*)/g, (_m, pre: string, path: string) => pre + path.replace(/\//g, PATH_SLASH));

  // abbreviations that voices spell out or split at the dots
  s = s
    .replace(/\be\.g\.,?/gi, `${w.forExample},`)
    .replace(/\bi\.e\.,?/gi, `${w.thatIs},`)
    .replace(/\bvs\.?(?=\s)/gi, w.versus);

  // literals that would otherwise vanish or be misread
  s = s
    .replace(/(^|[\s(=,:[])(''|"")(?=[\s),.;:\]]|$)/g, `$1 ${w.emptyString} `)
    .replace(/(['"])([()[\]{}]+)\1/g, (_m, _q: string, br: string) => ` ${spellBrackets(br, w)} `)
    .replace(/(['"])([,.?!:;+\-*/#@&|^~=<>%$_\\ ])\1/g, (_m, _q: string, ch: string) => ` ${w.symbols[ch] ?? ch} `)
    .replace(/(["'])([^"'\s,]+(?:,[^"'\s,]+)+)\1/g, (_m, q: string, inner: string) => `${q}${inner.replace(/,/g, ` ${w.symbols[","]} `)}${q}`)
    .replace(/(['"])a\1/g, "A") // the letter a, not the article
    .replace(/(^|[\s(=,])a(?=\s*(?:={1,3}|[+*/&|^<>%,)]|\s-\s)|\.\w)/g, "$1A") // a variable a
    .replace(/((?:[=+*/&|^<>%]|\s-)\s*)a\b(?!['’]\w)/g, "$1A")
    .replace(/\((?:\.{3}|…)\)/g, "") // json(...) → json
    .replace(/\b0\/1\b/g, "0 1") // 0/1 knapsack
    .replace(/(\w)\((?:s|es)\)/g, "$1") // chunk(s) → chunk
    .replace(/✕/g, ` ${w.cross} `)
    .replace(/\bHEAD~(\d+)/g, `HEAD ${w.tilde} $1`)
    .replace(/~(?=[\w(][\w.]*\)?\s*(?:===?|[=+&|^]))/g, `${w.not} `) // ~5 = …, ~x === …: bitwise NOT
    .replace(/~(?=\s?[\w(])/g, `${w.about} `) // ~80 ms: about
    .replace(/(\b\d+|\b[a-z])!(?![=\w])/g, (_m, x: string) => w.factorial(x)) // n!
    .replace(/\|([\w.\-−]+)\|/g, (_m, x: string) => w.abs(x)) // |x|
    .replace(/(\d+) \(([01]{3,})\)/g, (m, n: string, bits: string) => (parseInt(bits, 2) === Number(n) ? `${n} (${[...bits].join(" ")})` : m))
    .replace(/(?<![\d,.])(0[01]{2,}|[01]{5,})(?![\d.,]?\d)/g, (bits) => (/^10+$/.test(bits) ? bits : [...bits].join(" "))); // binary

  // ranges (0..4, 1…9, lo..mid, 1–5, 5-20), then ellipses and dashes become pauses
  s = s
    .replace(/(\d)\s*(?:\.{2,3}|…)\s*([−-]?\d)/g, `$1 ${w.to} $2`)
    .replace(/([\w)\]])\s*\.\.\s*(?=[\w(−-])/g, `$1 ${w.to} `)
    .replace(/(\d)\s*[–—]\s*(\d)/g, `$1 ${w.to} $2`)
    .replace(/(^|[\s(])(\d+)-(\d+)(?![\d-])/g, `$1$2 ${w.to} $3`)
    .replace(/…|\.{3}/g, ", ")
    .replace(/\s*[—–]\s*/g, ", ");

  // the sign of a number (−1, −∞, best = −5) is not a subtraction (Bangla: মাইনাস, not বিয়োগ)
  s = s
    .replace(/−(?=\S)/g, (m, offset: number, whole: string) =>
      /[\w)\]′'⁠]/.test(whole.slice(0, offset).trimEnd().slice(-1)) ? m : `${w.negative} `,
    )
    .replace(/(^|[\s(=,:[])-(?=\d)/g, `$1${w.negative} `);

  // complexity first: "big O of n squared" stays one English term, also in Bangla notes
  s = s
    .replace(/(^|[^\w])O\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g, (_m, pre: string, inner: string) => `${pre}${w.bigO} ${powers(inner, EN)}`)
    .replace(/(^|[^\w])Θ\(([^()]*)\)/g, (_m, pre: string, inner: string) => `${pre}${w.theta} ${powers(inner, EN)}`)
    .replace(/(^|[^\w])Ω\(([^()]*)\)/g, (_m, pre: string, inner: string) => `${pre}${w.omega} ${powers(inner, EN)}`);

  // logs, subscripts, superscripts and powers
  s = powers(
    s
      .replace(/log([₀-₉]+)/g, (_m, d: string) => `${w.logBase} ${mapChars(d, SUBSCRIPT)} `)
      .replace(/[₀-₉]+/g, (d) => ` ${mapChars(d, SUBSCRIPT)}`),
    w,
  ).replace(/\s\^\s/g, ` ${w.xor} `);

  // floor/ceiling, square roots
  s = s
    .replace(/⌊([^⌋]*)⌋/g, ` ${w.floorOf} $1 `)
    .replace(/⌈([^⌉]*)⌉/g, ` ${w.ceilingOf} $1 `)
    .replace(new RegExp(`√\\s*(${TERM})`, "gu"), (_m, x: string) => ` ${glue(w.sqrt(x))} `);

  // generics, innermost first (Map<String, List<Integer>> → "Map of String, List of Integer"); each parameter starts
  // with a capital (or ?) and parameters are comma-separated, which keeps the match linear. The Java diamond (new
  // HashMap<>()) is dropped; SQL's <> is "not equal" (below). JSX/HTML tags: <App /> → "App tag".
  const GENERIC = /([A-Za-z_$][\w$]*)<\s*([A-Z?][\w$. ]*(?:\[\])?(?:\s*,\s*[A-Z?][\w$. ]*(?:\[\])?)*)\s*>/g;
  for (let i = 0; i < 3; i++) s = s.replace(GENERIC, (_m, type: string, params: string) => `${type} of ${params.trim()}`);
  s = s
    .replace(/([A-Za-z_$][\w$]*)<>(?=\s*\()/g, "$1")
    .replace(/<\/?([A-Za-z][\w.]*)(?:\s[^<>]*)?\/?>/g, (_m, name: string) => ` ${w.tag(name)} `);

  // arrows (see arrowWord); ← ↑ ↓ ↔
  s = s.replace(/->|=>|⇒|↦/g, "→");
  s = s.replace(/\s*→\s*/g, (m, offset: number, whole: string) => arrowWord(whole, offset, m.length, w));
  s = s
    .replace(/\s*←\s*/g, ` ${w.from} `)
    .replace(/↑/g, ` ${w.up} `)
    .replace(/↓/g, ` ${w.down} `)
    .replace(/\s*↔\s*/g, ` ${w.swap} `);

  // primes: C′, 2' (copies in Clone Graph), x′′
  s = s
    .replace(/(\w)(?:′′|'')(?=[\s,.;:)\]]|$)/g, `$1 double ${w.prime}`)
    .replace(/(\w)′/g, `$1 ${w.prime}`)
    .replace(/(^|[\s(\[,])(\d+|[A-Za-z])'(?=[\s,.;:)\]]|$)/g, `$1$2 ${w.prime}`);

  // half-open intervals: [lo, hi) and (2, 15]
  s = s
    .replace(/\[([^[\]()]+?),\s*([^[\]()]+?)\)/g, (_m, a: string, b: string) => w.halfOpen(a.trim(), b.trim()))
    .replace(/\(([^[\]()]+?),\s*([^[\]()]+?)\]/g, (_m, a: string, b: string) => w.openClosed(a.trim(), b.trim()));

  // nums[i] → "nums at i", dp[i][j] → "dp at i, j", s[i:j] → "s from i to j", int[] → "int array"
  s = s.replace(new RegExp(`(${IDENT}(?:\\.${IDENT})*)((?:\\[[^\\[\\]]*\\])+)`, "g"), (_m, name: string, brackets: string) => {
    const parts = [...brackets.matchAll(/\[([^[\]]*)\]/g)].map((m) => m[1]!.trim());
    if (parts.length === 1 && parts[0] === "") return glue(w.array(name));
    const slice = parts.length === 1 ? /^([^:]*):([^:]*)$/.exec(parts[0]!) : null;
    if (slice) return glue(w.slice(name, slice[1]!.trim() || w.start, slice[2]!.trim() || w.end));
    return glue(w.index(name, parts.join(", ")));
  });
  s = s
    .replace(/\[([^[\]]*\|[^[\]]*)\]/g, (_m, inner: string) => ` ${inner.replace(/\s*\|\s*/g, ", ")} `) // [40 | 50]
    .replace(/\[\s*\]/g, ` ${w.emptyList} `)
    .replace(/\{\s*\}/g, ` ${w.empty} `)
    .replace(/[[\]{}]/g, " ");

  // calls: start() → "start", isMirror(a, b) → "isMirror of (a, b)"
  s = s
    .replace(new RegExp(`(${IDENT}(?:\\.${IDENT})*)\\(\\s*\\)`, "g"), "$1")
    .replace(new RegExp(`(${IDENT}(?:\\.${IDENT})*)\\(`, "g"), (_m, name: string) =>
      KEYWORDS.test(name) ? `${name} (` : `${w.call(name)} (`,
    )
    .replace(/\(\s*\)/g, " ");

  // code identifiers, glued so they stay one term: node.left → "node dot left", .com → "dot com", maxSum → "max Sum"
  s = s
    .replace(/([A-Za-z_$][\w$]*)\.(?=[A-Za-z_$])/g, `$1${G}${w.dot}${G}`)
    .replace(/(^|[\s(])\.(?=[A-Za-z])/g, `$1${w.dot}${G}`)
    .replace(/([a-z\d])([A-Z])/g, `$1${G}$2`)
    .replace(/([A-Z]+)([A-Z][a-z]{2,})/g, `$1${G}$2`)
    .replace(/([A-Za-z\d])_+(?=[A-Za-z\d])/g, `$1${G}`);

  // command-line flags, logical and bit operators, increments, compound assignment
  s = s
    .replace(/(^|[\s(])--(?=[a-z])/g, `$1${w.dash} ${w.dash} `)
    .replace(/(^|\s)-([a-zA-Z])\b/g, `$1${w.dash} $2`)
    .replace(/\s*&&\s*(?=[A-Za-z0-9_(!'"$])/g, ` ${w.and} `)
    .replace(/\s*&&\s*/g, ` ${w.andOperator} `)
    .replace(/\s*\|\|\s*(?=[A-Za-z0-9_(!'"$])/g, ` ${w.or} `)
    .replace(/\s*\|\|\s*/g, ` ${w.orOperator} `)
    .replace(/\s*<<\s*/g, ` ${w.shiftLeft} `)
    .replace(/\s*>>>\s*/g, ` ${w.unsignedShiftRight} `)
    .replace(/\s*>>\s*/g, ` ${w.shiftRight} `)
    .replace(/\+\+/g, ` ${w.plusPlus} `)
    .replace(/([\w)\]])--|--(?=[A-Za-z_])/g, (_m, before?: string) => `${before ?? ""} ${w.minusMinus} `)
    .replace(/\s*--\s*/g, ", ")
    .replace(/\s*\+=\s*/g, ` ${w.plusEquals} `)
    .replace(/\s*-=\s*/g, ` ${w.minusEquals} `);

  // comparisons, with their operands (Bangla puts the verb last); "!=" before "==" so "!==" is not split
  s = binary(s, "!==|!=|≠|<>", w.ne, lang);
  s = binary(s, "===", w.eqStrict, lang);
  s = binary(s, "==", w.eqLoose, lang);
  s = binary(s, "<=|≤", w.le, lang);
  s = binary(s, ">=|≥", w.ge, lang);
  s = binary(s, "∉", w.notIn, lang);
  s = binary(s, "∈", w.isIn, lang);
  s = binary(s, "<", w.lt, lang);
  s = binary(s, ">", w.gt, lang);
  s = s.replace(/\s*=\s*/g, ` ${w.equals} `);

  // arithmetic
  s = s
    .replace(/\s*−\s*/g, ` ${w.minus} `)
    .replace(/(\S+)\s+-\s+(?=(\S+))/g, (_m, a: string, b: string) => `${a}${isMinus(a, b) ? ` ${w.minus} ` : ", "}`)
    .replace(/(\b(?:[a-z]|lo|hi|mid|len|end|size|count|right|left|idx|pos)|\)|\])-(\d+)\b/g, `$1 ${w.minus} $2`)
    .replace(/\s*\+\s*/g, (m, offset: number, whole: string) =>
      /[\w)\]⁠]$/.test(whole.slice(0, offset)) || /\s/.test(m) ? ` ${w.plus} ` : m,
    )
    .replace(/(\d)×(?=[\s,.;:!?।)]|$)/g, `$1 ${w.countTimes}`) // appears 4×
    .replace(/([\w)\]⁠])\s*[×·]\s*(?=[\w(⁠])/g, `$1 ${w.times} `)
    .replace(/×/g, ` ${w.cross} `) // a mark on a board
    .replace(/\s*·\s*/g, ", ")
    .replace(/\s+\*\s+/g, ` ${w.times} `)
    .replace(/(\d|\))\s*\*\s*(\w)|(\w)\s*\*\s*(\d|\()/g, (_m, a1?: string, b1?: string, a2?: string, b2?: string) =>
      `${a1 ?? a2} ${w.times} ${b1 ?? b2}`,
    )
    .replace(/\s*÷\s*/g, ` ${w.dividedBy} `)
    .replace(/(\S+)\s+\/\s+(?=(\S+))/g, (_m, a: string, b: string) => {
      const value = (t: string) => /^[-+−]?[\d.]+$|[)\]]$|^[([]|^[A-Za-z]$/.test(t);
      const word = /[ঀ-৿]/.test(a + b) ? w.or : w.slash;
      return `${a} ${value(a) && value(b) ? w.dividedBy : word} `;
    })
    .replace(/([\w)\]])\/(\d+|\()/g, `$1 ${w.dividedBy} $2`)
    .replace(/\band\/or\b/g, `${w.and} ${w.or}`)
    .replace(/([ঀ-৿]+)\/([ঀ-৿]+)/g, `$1 ${w.or} $2`)
    .replace(/([A-Za-z]{2,})\/([A-Za-z]{2,})/g, `$1 ${w.slash} $2`)
    .replace(/\s+%\s+/g, ` ${w.mod} `)
    .replace(/\s+&\s+/g, ` ${w.bitAnd} `)
    .replace(/\s+\|\s+/g, ` ${w.bitOr} `)
    .replace(/\b(\w+)\|(\w+)\b/g, (_m, a: string, b: string) => w.between(a, b)) // Gap 2|3
    .replace(/(^|[\s(])!(?=[A-Za-z_(])/g, `$1${w.not} `);

  // remaining symbols
  s = s
    .replace(/∞/g, ` ${w.infinity} `)
    .replace(/≈/g, ` ${w.about} `)
    .replace(/±/g, ` ${w.plusMinus} `)
    .replace(/∅/g, ` ${w.emptySet} `)
    .replace(/∑/g, ` ${w.sumOf} `)
    .replace(/λ/g, ` ${w.lambda} `)
    .replace(/[Θθ]/g, " theta ")
    .replace(/Ω/g, " omega ")
    .replace(/(^|[\s(])#(\d)/g, `$1${w.number} $2`)
    .replace(/#/g, ` ${w.hash} `)
    .replace(/[✓✔✗✘]/g, " ")
    .replace(/@(?=\w)/g, ` ${w.at} `)
    .replace(/\$(?=[A-Za-z_{])/g, "")
    .replace(/(^|[\s(=,:⁠])['"‘“]+/g, "$1")
    .replace(/['"’”]+(?=$|[\s),.;:!?।⁠])/g, "")
    .replace(/\s*\*\s*/g, ` ${w.star} `)
    .replace(/[`^~\\|<>_]/g, " ")
    .replace(/;/g, ",");

  // tidy spacing and punctuation; "3,1,2" gets spaces so it is read as a list, not one number (1,000 stays)
  return s
    .replace(new RegExp(G, "g"), " ")
    .replace(new RegExp(PATH_SLASH, "g"), ` ${w.slash} `)
    .replace(/(\d),(?=\d)(?!\d{3}(?!\d))/g, "$1, ")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?।])/g, "$1")
    .replace(/,(\s*,)+/g, ",")
    .replace(/,\s*([.!?।])/g, "$1")
    .replace(/^[\s,]+/, "")
    .replace(/(\()\s+/g, "$1")
    .replace(/\s+\)/g, ")")
    .trim();
}

/** Longest piece spoken in one go: about 11 seconds, safely under Chrome's ~15 s cut-off for Google voices. */
export const MAX_CHUNK = 150;

function splitLong(text: string, max: number): string[] {
  if (text.length <= max) return [text];
  // break at the clause boundary closest to the middle that keeps the first part within the limit
  const mid = text.length / 2;
  let best = -1;
  for (const m of text.matchAll(/[,;:](?=\s)/g)) {
    const at = (m.index ?? 0) + 1;
    if (at <= max && (best < 0 || Math.abs(at - mid) < Math.abs(best - mid))) best = at;
  }
  if (best < 0) {
    best = text.lastIndexOf(" ", max);
    if (best <= 0) best = max;
  }
  return [text.slice(0, best).trim(), ...splitLong(text.slice(best).trim(), max)].filter(Boolean);
}

/** Sentence-sized pieces to speak one after another; very short sentences ride along with their neighbour. */
export function speechChunks(text: string, max = MAX_CHUNK): string[] {
  const pieces = text
    .split(/(?<=[.!?।])\s+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .flatMap((t) => splitLong(t, max));
  const merged: string[] = [];
  for (const piece of pieces) {
    const last = merged[merged.length - 1];
    if (last !== undefined && (last.length < 40 || piece.length < 25) && last.length + piece.length + 1 <= max) {
      merged[merged.length - 1] = `${last} ${piece}`;
    } else {
      merged.push(piece);
    }
  }
  return merged;
}
