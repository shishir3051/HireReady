# Bangla version: plan

Status: **not started** (planned 2026-10-27). English stays the default and the fallback for anything not yet translated,
so every phase can ship on its own.

| Phase | What | Time |
|---|---|---|
| 1 | বাংলা / English switch for the whole interface | ~1–1.5 h |
| 2 | Translate all content (335 questions, 348 quiz items, ~3,400 walkthrough notes) | ~2–2.5 h |
| 3 | Bangla narration | ~15 min |
| 4 | Checks + your review of ~10 questions | ~15 min + 20–30 min of your time |

To start later, open a Claude session in this folder and say: **"Start the Bangla plan, phase 1"** (or phase 2…).

---

## Decisions to confirm before starting

1. **Default language**: English (recommended), or Bangla when the browser language is `bn`.
2. **Digits**: keep `0–9` (recommended, matches code and complexity like O(n log n)) or Bangla digits `০–৯`.
3. **Question titles**: keep standard English names ("Two Sum", "LRU Cache"), which is what interviewers say, with a Bangla
   subtitle where useful (recommended).
4. **Diagram labels** (Mermaid): keep English in v1 (recommended; translating them risks breaking diagram syntax).

## Style guide (applies to all translated text)

- Bangla sentences, **English technical terms**, the way Bangladeshi engineers speak:
  > i = 1: need = 14 − 13 = 1. 1 এখনো `seen`-এ নেই, তাই 13 → index 1 map-এ রেখে দিই।
- Keep in English: code, anything in backticks, variable/function names, slugs, numbers, Big-O, data structure names
  (array, hash map, stack, heap, pointer, recursion…), framework/tool names.
- Plain, friendly চলিত ভাষা; no সাধু ভাষা, no overly formal words.
- One shared glossary (`docs/bangla-glossary.md`, created in phase 2) so the same term is used everywhere.

---

## Phase 1: interface switch (~1–1.5 h)

**Approach: no URL change.** The choice lives in a cookie (`hr-lang = en | bn`), so links, password-reset emails and
the Google sign-in redirect keep working unchanged.

1. **Dictionaries**: `client/src/i18n/en.ts` (source of truth) and `client/src/i18n/bn.ts` typed as `typeof en`, so
   TypeScript fails the build if a Bangla string is missing.
2. **Helpers**: `getDictionary()` for server components (reads the cookie via `await cookies()`), and a
   `LanguageProvider` + `useT()` hook for client components. `<html lang>` follows the choice.
3. **Switch**: a বাংলা / EN toggle in the header (desktop + mobile menu) and the footer; sets the cookie and refreshes.
4. **Font**: Geist has no Bengali letters. Add a Bengali font (e.g. Hind Siliguri or Noto Sans Bengali via `next/font`)
   used only when the language is Bangla.
5. **Extract strings area by area** (can run in parallel, one agent per area, like the spacing change): layout + footer,
   landing page, topics/questions lists, question page, visual player controls, quiz, mock interview, roadmap,
   dashboard, login/register/forgot/reset, errors, toasts and page metadata.
6. **Check**: typecheck + lint, every page at 1366px and 375px in both languages (Bangla text is longer; nothing may
   overflow), light and dark mode.

## Phase 2: content translation (~2–2.5 h)

**Approach: overlay files.** English JSON stays untouched; Bangla lives next to it and only contains translated text.

1. **Files**: `server/src/data/content-bn/<topic>.json`, keyed by question slug / quiz id / visual index / step index.
2. **Translate** (text fields only): topic summary, overview, cheatsheet, pattern descriptions; question prompt,
   example explanations, hints, approach ideas, solution summary + explanation + key points, pitfalls, follow-ups;
   visual titles, captions, step notes, diagram frame notes, comparison cells; quiz question, options (except code),
   explanation.
   **Never translate**: code, backticks, Mermaid source, slugs, identifiers, numbers.
3. **Automatic checks** (added to `npm run validate`): overlay matches the English structure (same questions, same
   number of steps and options); backtick spans, numbers and markdown preserved; no code changed; every Bangla
   string non-empty.
4. **Seed + API**: the seed stores the Bangla overlay with each document; API requests with `?lang=bn` (the web app
   sends it from the cookie) get Bangla text, falling back to English field by field.
5. **Pipeline**: one translator agent per topic (29), ~10 at a time, each followed by an independent reviewer who
   compares meaning with the English, checks glossary consistency, and confirms code/numbers are untouched.
6. **Check**: `npm run validate`, `npm run seed`, then `/dev/content-check` in Bangla mode (all visuals must render).

## Phase 3: Bangla narration (~15 min)

- `client/src/components/visualizers/lib/narration.ts`: pick a voice by language (`bn-BD`, then `bn-IN`); speak the
  Bangla notes when the site is in Bangla.
- If the device has no Bangla voice, fall back to English narration and show a small hint.
- Voices: **Microsoft Edge** has natural Bangla voices (e.g. Nabanita, Pradeep); **Chrome on Android** has Google's
  Bangla voice; Chrome on Windows usually has none.

## Phase 4: final checks + your review

- Full typecheck/lint, production builds of both apps, render check in both languages, 375px phone check.
- **You** read ~10 translated questions (mix of DSA, concept, behavioral) and say whether the Bangla is natural, too
  formal or too mixed with English; the style guide is adjusted and the affected topics re-run if needed.
