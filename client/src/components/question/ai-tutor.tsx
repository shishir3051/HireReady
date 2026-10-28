"use client";

import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type TouchEvent,
  type WheelEvent,
} from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Gem, Loader2, LogIn, Send, User, X } from "lucide-react";
import { api, getErrorMessage, isAbortError } from "@/lib/api";
import { STORAGE_KEYS } from "@/lib/constants";
import { createLocalStore, useIsClient } from "@/lib/storage";
import type { AiUsage, Question } from "@/lib/types";
import { Button, ButtonLink } from "@/components/ui/button";
import { Markdown } from "@/components/markdown";
import { useAuth, useLanguage } from "@/components/providers";

interface Message {
  id: string;
  role: "user" | "model";
  text: string;
  /** error notices are shown but never sent back to the model as history */
  error?: boolean;
}

/** Chat panel width (px) on screens from 640px up; drag its left edge to change it. Phones always get full width. */
const PANEL_MIN = 380;
const PANEL_DEFAULT = 512;
const PANEL_MAX = 960;
const PANEL_KEY_STEP = 32;

/** Keeps the panel between the limits and leaves at least 48px of the page visible beside it. */
function clampPanelWidth(width: number): number {
  const room = Math.max(PANEL_MIN, window.innerWidth - 48);
  return Math.round(Math.min(Math.max(width, PANEL_MIN), PANEL_MAX, room));
}

function subscribeResize(onChange: () => void) {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
}

/** Pointer movement (px) before a press on the edge counts as a drag; a plain click changes nothing. */
const DRAG_THRESHOLD = 3;

const panelWidthStore = createLocalStore<number>(
  STORAGE_KEYS.hiraWidth,
  PANEL_DEFAULT,
  (raw) => {
    const n = Number(raw);
    return Number.isFinite(n) && n >= PANEL_MIN && n <= PANEL_MAX ? n : undefined;
  },
  String,
);

interface AiTutorProps {
  question: Question;
  topicTitle?: string;
}

const TYPE_TICK_MS = 30;

/**
 * Characters per tick, from the reply's length: ~65 a second (a natural reading pace) for short replies, up to
 * ~165 for long ones so they don't drag. The speed stays steady while a reply types out.
 */
const typeStep = (length: number) => (length < 600 ? 2 : length < 1200 ? 3 : length < 2000 ? 4 : 5);

function nextLength(shown: number, text: string): number {
  if (shown >= text.length) return shown;
  let next = shown + typeStep(text.length);
  const code = text.charCodeAt(next - 1);
  if (code >= 0xd800 && code <= 0xdbff) next += 1; // never split an emoji in half
  return Math.min(next, text.length);
}

interface TypewriterMarkdownProps {
  content: string;
  /** true only for the reply being written; every other message shows in full at once */
  typing: boolean;
  /** more text is still arriving from the server */
  streaming: boolean;
  onProgress: () => void;
  /** typing has caught up with a finished reply (or the reader skipped ahead) */
  onDone: () => void;
}

/** Types a reply out at a steady pace while it streams in, with a blinking cursor; click it to show everything. */
function TypewriterMarkdown({ content, typing, streaming, onProgress, onDone }: TypewriterMarkdownProps) {
  const [shown, setShown] = useState(typing ? 0 : content.length);
  const [skipped, setSkipped] = useState(false);
  const animating = typing && !skipped;
  const caughtUp = !animating || shown >= content.length;

  const tick = useEffectEvent(() => setShown((s) => nextLength(s, content)));
  const progress = useEffectEvent(() => onProgress());
  const done = useEffectEvent(() => onDone());

  useEffect(() => {
    if (!animating) return;
    const id = setInterval(() => tick(), TYPE_TICK_MS);
    return () => clearInterval(id);
  }, [animating]);

  // follow each newly typed line
  useEffect(() => {
    if (animating) progress();
  }, [animating, shown]);

  useEffect(() => {
    if (typing && !streaming && caughtUp) done();
  }, [typing, streaming, caughtUp]);

  return (
    <div
      onClick={animating ? () => setSkipped(true) : undefined}
      title={animating ? "Click to show the full answer" : undefined}
      className={`prose prose-sm dark:prose-invert max-w-none [&>p]:mb-2 [&>p:last-child]:mb-0 [&>pre]:my-2 [&>pre]:bg-background/90 [&>pre]:p-2.5 [&>pre]:rounded-lg [&>pre]:text-xs [&>ul]:my-1.5 [&>ol]:my-1.5 ${animating ? "cursor-pointer" : ""}`}
    >
      <Markdown>{animating ? content.slice(0, shown) : content}</Markdown>
      {typing && (
        <span className="ml-0.5 inline-block h-3.5 w-1.5 translate-y-0.5 animate-pulse rounded-xs bg-brand" aria-hidden />
      )}
    </div>
  );
}

export function AiTutor({ question }: AiTutorProps) {
  const { lang } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const pathname = usePathname();
  const isClient = useIsClient();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [waiting, setWaiting] = useState(false); // request sent, no text yet
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [typingId, setTypingId] = useState<string | null>(null); // reply still being typed out
  const [usage, setUsage] = useState<AiUsage | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const savedWidth = panelWidthStore.useValue();
  const [dragWidth, setDragWidth] = useState<number | null>(null); // live width while the edge is being dragged
  const dragStartRef = useRef<number | null>(null); // pointer x where a press on the edge began
  const viewportWidth = useSyncExternalStore(subscribeResize, () => window.innerWidth, () => 1280);
  // what is actually shown: a saved width wider than the window is capped (also what the handle reports)
  const maxPanelWidth = Math.max(PANEL_MIN, Math.min(PANEL_MAX, viewportWidth - 48));
  const panelWidth = Math.min(dragWidth ?? savedWidth, maxPanelWidth);
  const stickRef = useRef(true); // follow new text unless the reader scrolled up to re-read
  const lastTopRef = useRef(0);
  const touchYRef = useRef(0);

  const isBn = lang === "bn";
  const busy = waiting || streamingId !== null || typingId !== null;
  // "Hira" = HIre + ReAdy, and হীরা (diamond) in Bangla: HireReady's own interview coach
  const welcome = isBn
    ? `হ্যালো! আমি **হীরা**, HireReady-এর ইন্টারভিউ কোচ। "${question.title}" সমস্যাটি বোঝার জন্য আমাকে যেকোনো প্রশ্ন করুন, হিন্ট চান বা আপনার সমাধান যাচাই করান।`
    : `Hi! I'm **Hira**, your HireReady interview coach. Ask me anything about "${question.title}" — a gentle hint, the intuition behind the pattern, or the complexity analysis!`;

  // Lock body scroll and listen for Escape key when drawer is open
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
        setTypingId(null);
        setDragWidth(null); // a drag in progress ends with the panel
        dragStartRef.current = null;
        abortRef.current?.abort();
      }
    }
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  // Stop a running reply when the tutor unmounts (e.g. navigating to another question)
  useEffect(() => () => abortRef.current?.abort(), []);

  // Keep the newest message in view (unless the reader scrolled up)
  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickRef.current) el.scrollTop = el.scrollHeight;
  }, [messages, waiting, isOpen]);

  function followText() {
    const el = scrollRef.current;
    if (el && stickRef.current) el.scrollTop = el.scrollHeight;
  }

  // Wheel and touch say "scrolling up" before the scroll happens, so the next typed line can't drag the reader back down
  function onWheel(e: WheelEvent<HTMLDivElement>) {
    if (e.deltaY < 0) stickRef.current = false;
  }

  function onTouchStart(e: TouchEvent<HTMLDivElement>) {
    touchYRef.current = e.touches[0]?.clientY ?? 0;
  }

  function onTouchMove(e: TouchEvent<HTMLDivElement>) {
    if ((e.touches[0]?.clientY ?? 0) > touchYRef.current + 4) stickRef.current = false; // finger moving down = scrolling up
  }

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const top = el.scrollTop;
    if (top < lastTopRef.current - 2) stickRef.current = false; // scrolled up another way (scrollbar, keyboard)
    else if (top > lastTopRef.current && el.scrollHeight - top - el.clientHeight < 24) stickRef.current = true; // back at the bottom
    lastTopRef.current = top;
  }

  // Resize by dragging the panel's left edge (it is anchored to the right of the window)
  function onResizeStart(e: PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStartRef.current = e.clientX;
  }

  function onResizeMove(e: PointerEvent<HTMLDivElement>) {
    const startX = dragStartRef.current;
    if (startX === null || !e.currentTarget.hasPointerCapture(e.pointerId)) return;
    if (dragWidth === null && Math.abs(e.clientX - startX) < DRAG_THRESHOLD) return; // still just a click
    setDragWidth(clampPanelWidth(window.innerWidth - e.clientX));
  }

  /** Pointer released, cancelled or capture lost (e.g. the panel closed mid-drag): keep the width if it was a drag. */
  function onResizeEnd() {
    dragStartRef.current = null;
    if (dragWidth === null) return;
    panelWidthStore.set(dragWidth); // remembered for next time
    setDragWidth(null);
  }

  function onResizeKey(e: KeyboardEvent<HTMLDivElement>) {
    const step = e.shiftKey ? PANEL_KEY_STEP * 3 : PANEL_KEY_STEP;
    const next =
      e.key === "ArrowLeft" ? panelWidth + step
      : e.key === "ArrowRight" ? panelWidth - step
      : e.key === "Home" ? PANEL_MIN
      : e.key === "End" ? PANEL_MAX
      : null;
    if (next === null) return;
    e.preventDefault();
    panelWidthStore.set(clampPanelWidth(next));
  }

  function open() {
    stickRef.current = true;
    lastTopRef.current = 0;
    setIsOpen(true);
    if (user) {
      api.ai
        .status()
        .then((s) => setUsage(s.usage?.chat ?? null))
        .catch(() => {});
    }
  }

  function close() {
    setIsOpen(false);
    setTypingId(null); // a reopened chat shows the reply in full instead of typing it again
    setDragWidth(null);
    dragStartRef.current = null;
    abortRef.current?.abort(); // don't keep paying for a reply nobody reads
  }

  async function sendMessage(textToSend?: string) {
    const text = (textToSend ?? input).trim();
    if (!text || busy || !user) return;

    // the tutor only uses recent turns; the server takes up to 10 of at most 4000 characters each
    const history = messages
      .filter((m) => !m.error)
      .slice(-6)
      .map((m) => ({ role: m.role, text: m.text.slice(0, 4000) }));
    const replyId = `m-${Date.now()}`;
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: "user", text }]);
    setInput("");
    setWaiting(true);
    stickRef.current = true;

    const controller = new AbortController();
    abortRef.current = controller;
    let started = false;
    try {
      await api.ai.chatStream(
        { slug: question.slug, message: text, history, lang },
        (piece) => {
          if (!started) {
            started = true;
            setWaiting(false);
            setStreamingId(replyId);
            setTypingId(replyId);
            setMessages((prev) => [...prev, { id: replyId, role: "model", text: piece }]);
          } else {
            setMessages((prev) => prev.map((m) => (m.id === replyId ? { ...m, text: m.text + piece } : m)));
          }
        },
        { signal: controller.signal },
      );
      setUsage((u) => (u ? { ...u, used: Math.min(u.limit, u.used + 1) } : u));
    } catch (err) {
      if (!isAbortError(err)) {
        setMessages((prev) => [...prev, { id: `err-${Date.now()}`, role: "model", text: `⚠️ ${getErrorMessage(err)}`, error: true }]);
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setWaiting(false);
      setStreamingId(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const promptChips = isBn
    ? [
        { label: "💡 একটি ছোট হিন্ট দিন", query: "সরাসরি কোড না দিয়ে আমাকে চিন্তার জন্য একটি ছোট হিন্ট দিন।" },
        { label: "🔍 মূল ধারণাটি সহজ ভাষায় বলুন", query: "এই প্রশ্নটির মূল সমস্যা ও সমাধান ধারণাটি সহজ ভাষায় বুঝিয়ে দিন।" },
        { label: "⚡ টাইম ও স্পেস কমপ্লেক্সিটি কত?", query: "এই অ্যালগরিদমের অপ্টিমাল Time ও Space Complexity কী হবে এবং কেন?" },
        { label: "🧪 কোন এজ কেসগুলো ভাবা দরকার?", query: "এই সমস্যার জন্য গুরুত্বপূর্ণ কী কী Edge Cases মাথায় রাখা উচিত?" },
      ]
    : [
        { label: "💡 Give me a gentle hint", query: "Give me a progressive hint without spoiling the full solution." },
        { label: "🔍 Explain the core intuition", query: "Can you explain the core intuition behind solving this problem?" },
        { label: "⚡ Optimal time & space complexity?", query: "What is the optimal time and space complexity and why?" },
        { label: "🧪 What edge cases to test?", query: "What are the most critical edge cases I should consider?" },
      ];

  const left = usage ? Math.max(0, usage.limit - usage.used) : null;

  const drawerContent = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          {/* Backdrop with fade transition */}
          <motion.div
            aria-hidden
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
            onClick={close}
          />

          {/* Slide-over Drawer with spring transition */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={isBn ? "হীরার সাথে চ্যাট" : "Chat with Hira"}
            initial={{ x: "100%", opacity: 0.8 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0.8 }}
            transition={{ type: "spring", damping: 30, stiffness: 320, mass: 0.85 }}
            style={{ "--hira-width": `${panelWidth}px` } as CSSProperties}
            className={`relative z-10 flex h-full w-full flex-col border-l border-border bg-surface shadow-2xl sm:w-(--hira-width) sm:max-w-[calc(100vw-3rem)] ${dragWidth !== null ? "select-none" : ""}`}
          >
            {/* Resize handle: drag the left edge, use ← / → when focused (Shift for bigger steps), double-click to reset */}
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label={isBn ? "চ্যাটের প্রস্থ পরিবর্তন করুন" : "Resize chat"}
              aria-valuemin={PANEL_MIN}
              aria-valuemax={maxPanelWidth}
              aria-valuenow={panelWidth}
              tabIndex={0}
              title={isBn ? "টেনে প্রস্থ বদলান · ডাবল-ক্লিকে আগের মাপে ফিরুন" : "Drag to resize · double-click to reset"}
              onPointerDown={onResizeStart}
              onPointerMove={onResizeMove}
              onPointerUp={onResizeEnd}
              onPointerCancel={onResizeEnd}
              onLostPointerCapture={onResizeEnd}
              onKeyDown={onResizeKey}
              onDoubleClick={() => panelWidthStore.set(PANEL_DEFAULT)}
              className="group absolute inset-y-0 left-0 z-20 hidden w-3 -translate-x-1/2 cursor-col-resize touch-none outline-none sm:block"
            >
              <span
                aria-hidden
                className={`absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 transition-colors group-hover:bg-brand/50 group-focus-visible:bg-brand ${dragWidth !== null ? "bg-brand" : ""}`}
              />
              <span
                aria-hidden
                className={`absolute top-1/2 left-1/2 h-10 w-1.5 -translate-1/2 rounded-full border border-border bg-surface-2 shadow-xs transition-colors group-hover:border-brand group-hover:bg-brand group-focus-visible:bg-brand ${dragWidth !== null ? "border-brand bg-brand" : ""}`}
              />
            </div>

            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-5">
              <div className="flex items-center gap-2.5">
                <span className="grid size-8 place-items-center rounded-lg bg-brand-soft text-brand">
                  <Gem className="size-4" aria-hidden />
                </span>
                <div>
                  <h3 className="flex items-center gap-1.5 text-sm font-semibold tracking-tight text-foreground">
                    {isBn ? "হীরা" : "Hira"}
                    <span className="font-normal text-muted">· {isBn ? "AI ইন্টারভিউ কোচ" : "AI interview coach"}</span>
                    <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-medium text-brand">Beta</span>
                  </h3>
                  <p className="line-clamp-1 text-xs text-muted">
                    {question.title}
                    {left !== null && (
                      <span className="tabular-nums">
                        {" · "}
                        {isBn ? `আজ আর ${left}টি মেসেজ বাকি` : `${left} ${left === 1 ? "message" : "messages"} left today`}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={close} aria-label={isBn ? "হীরার চ্যাট বন্ধ করুন" : "Close chat with Hira"} className="rounded-lg">
                <X className="size-4" />
              </Button>
            </div>

            {/* Chat Messages */}
            <div
              ref={scrollRef}
              onScroll={onScroll}
              onWheel={onWheel}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              className="flex-1 space-y-4 overflow-y-auto p-4 text-sm"
              aria-live="polite"
              aria-busy={busy}
            >
              {[{ id: "welcome", role: "model" as const, text: welcome }, ...messages].map((m) => (
                <div key={m.id} className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  {m.role === "model" && (
                    <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">
                      <Gem className="size-3.5" aria-hidden />
                    </span>
                  )}
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                      m.role === "user"
                        ? "rounded-br-xs bg-brand text-white shadow-xs"
                        : "rounded-bl-xs border border-border bg-surface-2 text-foreground"
                    }`}
                  >
                    {m.role === "user" ? (
                      <p className="whitespace-pre-wrap">{m.text}</p>
                    ) : (
                      <TypewriterMarkdown
                        content={m.text}
                        typing={m.id === typingId}
                        streaming={m.id === streamingId}
                        onProgress={followText}
                        onDone={() => setTypingId(null)}
                      />
                    )}
                  </div>
                  {m.role === "user" && (
                    <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-surface-3 text-muted">
                      <User className="size-3.5" aria-hidden />
                    </span>
                  )}
                </div>
              ))}

              {waiting && (
                <div className="flex items-center gap-2 text-xs text-muted">
                  <span className="grid size-6 place-items-center rounded-full bg-brand-soft text-brand">
                    <Gem className="size-3.5" aria-hidden />
                  </span>
                  <div className="flex items-center gap-1.5 rounded-xl border border-border bg-surface-2 px-3 py-2">
                    <Loader2 className="size-3.5 animate-spin text-brand" />
                    <span>{isBn ? "হীরা ভাবছে…" : "Hira is thinking…"}</span>
                  </div>
                </div>
              )}
            </div>

            {!authLoading && !user ? (
              /* AI features need an account (protects the shared Gemini quota) */
              <div className="space-y-3 border-t border-border p-4 text-center">
                <p className="text-sm text-muted">
                  {isBn ? "হীরার সাথে চ্যাট করতে লগ ইন করুন। এটি ফ্রি।" : "Log in to chat with Hira. It's free."}
                </p>
                <ButtonLink href={`/login?next=${encodeURIComponent(pathname)}`} className="w-full" leftIcon={<LogIn aria-hidden />}>
                  {isBn ? "লগ ইন" : "Log in"}
                </ButtonLink>
              </div>
            ) : (
              <>
                {/* Quick Action Chips */}
                <div className="border-t border-border/60 bg-surface/50 p-2.5">
                  <div className="flex flex-wrap gap-1.5">
                    {promptChips.map((chip, idx) => (
                      <button
                        key={idx}
                        type="button"
                        disabled={busy}
                        onClick={() => sendMessage(chip.query)}
                        className="inline-flex items-center rounded-md border border-border bg-surface px-2.5 py-1 text-xs text-muted transition-colors hover:border-brand/40 hover:bg-brand-soft/30 hover:text-foreground disabled:opacity-50"
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message Input Bar */}
                <div className="border-t border-border p-3 sm:p-4">
                  <div className="relative flex items-center">
                    <input
                      ref={inputRef}
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={onKeyDown}
                      maxLength={2000}
                      placeholder={isBn ? "প্রশ্ন সম্পর্কে কিছু জিজ্ঞাসা করুন…" : "Ask a question about this problem…"}
                      className="h-10 w-full rounded-xl border border-border bg-background pl-3.5 pr-11 text-xs focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:opacity-50 sm:text-sm"
                    />
                    <Button
                      size="icon-sm"
                      variant="primary"
                      onClick={() => sendMessage()}
                      disabled={!input.trim() || busy}
                      className="absolute right-1 size-8 rounded-lg"
                      aria-label="Send message"
                    >
                      <Send className="size-3.5" />
                    </Button>
                  </div>
                  <p className="mt-1.5 text-center text-[10px] text-muted">
                    {isBn ? "Gemini দ্বারা চালিত · উত্তর ভুল হতে পারে" : "Powered by Gemini · Hira can make mistakes"}
                  </p>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      {/* Animated Trigger Button */}
      <motion.button
        type="button"
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        onClick={open}
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-brand/35 bg-surface px-3 text-sm font-medium text-foreground shadow-xs transition-colors hover:border-brand hover:bg-brand-soft/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        <Gem className="size-4 text-brand" aria-hidden />
        <span>{isBn ? "হীরাকে জিজ্ঞাসা করুন" : "Ask Hira"}</span>
      </motion.button>

      {/* Render Portal Drawer */}
      {isClient && createPortal(drawerContent, document.body)}
    </>
  );
}
