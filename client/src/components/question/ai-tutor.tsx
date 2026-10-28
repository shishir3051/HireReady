"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Bot, Loader2, Send, Sparkles, User, X } from "lucide-react";
import { api, getErrorMessage } from "@/lib/api";
import type { Question } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/markdown";
import { useLanguage } from "@/components/providers";

interface Message {
  id: string;
  role: "user" | "model";
  text: string;
}

interface AiTutorProps {
  question: Question;
  topicTitle?: string;
}

export function AiTutor({ question }: AiTutorProps) {
  const { lang } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isBn = lang === "bn";

  // Initial welcome message when opened for the first time
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: "welcome",
          role: "model",
          text: isBn
            ? `হ্যালো! আমি আপনার **Gemini AI Tutor**। "${question.title}" সমস্যাটি বোঝার জন্য আপনি যেকোনো প্রশ্ন করতে পারেন, হিন্ট চাইতে পারেন বা আপনার সমাধান যাচাই করতে পারেন।`
            : `Hi! I'm your **Gemini AI Tutor**. Ask me anything about "${question.title}" — whether you want a gentle hint, intuition behind the pattern, or complexity analysis!`,
        },
      ]);
    }
  }, [isOpen, messages.length, isBn, question.title]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  async function sendMessage(textToSend?: string) {
    const text = (textToSend ?? input).trim();
    if (!text || loading) return;

    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const history = nextMessages
        .filter((m) => m.id !== "welcome")
        .map((m) => ({ role: m.role, text: m.text }));

      const res = await api.ai.chat({
        questionTitle: question.title,
        questionPrompt: question.prompt,
        modelAnswer: question.solution?.summary ?? "",
        message: text,
        history,
        lang,
      });

      setMessages((prev) => [...prev, { id: `m-${Date.now()}`, role: "model", text: res.reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "model",
          text: `⚠️ ${getErrorMessage(err)}`,
        },
      ]);
    } finally {
      setLoading(false);
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
        { label: "💡 একটি ছোট হিন্ট দিন", query: "সরাসরি কোড না দিয়ে আমাকে চিন্তার জন্য একটি ছোট হিন্ট দিন।" },
        { label: "🔍 মূল ধারণাটি সহজ ভাষায় বলুন", query: "এই প্রশ্নটির মূল সমস্যা ও সমাধান ধারণাটি সহজ ভাষায় বুঝিয়ে দিন।" },
        { label: "⚡ টাইম ও স্পেস কমপ্লেক্সিটি কত?", query: "এই অ্যালগরিদমের অপ্টিমাল Time ও Space Complexity কী হবে এবং কেন?" },
        { label: "🧪 কোন এজ কেসগুলো ভাবা দরকার?", query: "এই সমস্যার জন্য গুরুত্বপূর্ণ কী কী Edge Cases মাথায় রাখা উচিত?" },
      ]
    : [
        { label: "💡 Give me a gentle hint", query: "Give me a progressive hint without spoiling the full solution." },
        { label: "🔍 Explain the core intuition", query: "Can you explain the core intuition behind solving this problem?" },
        { label: "⚡ Optimal time & space complexity?", query: "What is the optimal time and space complexity and why?" },
        { label: "🧪 What edge cases to test?", query: "What are the most critical edge cases I should consider?" },
      ];

  return (
    <>
      {/* Trigger Button in Header Toolbar */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="gap-2 border-brand/35 bg-surface hover:border-brand hover:bg-brand-soft/40 transition-colors"
      >
        <Sparkles className="size-4 text-brand animate-pulse" aria-hidden />
        <span className="font-medium text-foreground">{isBn ? "AI টিউটর" : "AI Tutor"}</span>
      </Button>

      {/* Slide-over Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs transition-opacity">
          <div
            className="flex h-full w-full max-w-lg flex-col border-l border-border bg-surface shadow-2xl transition-transform animate-in slide-in-from-right duration-200"
            role="dialog"
            aria-modal="true"
            aria-label="AI Tutor Chat"
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-5">
              <div className="flex items-center gap-2.5">
                <span className="grid size-8 place-items-center rounded-lg bg-brand-soft text-brand">
                  <Sparkles className="size-4" aria-hidden />
                </span>
                <div>
                  <h3 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-1.5">
                    {isBn ? "Gemini AI টিউটর" : "Gemini AI Tutor"}
                    <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-medium text-brand">Beta</span>
                  </h3>
                  <p className="text-xs text-muted line-clamp-1">{question.title}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setIsOpen(false)}
                aria-label="Close AI Tutor"
              >
                <X className="size-4" />
              </Button>
            </div>

            {/* Chat Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {m.role === "model" && (
                    <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">
                      <Bot className="size-3.5" aria-hidden />
                    </span>
                  )}
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 leading-relaxed text-[13px] ${
                      m.role === "user"
                        ? "bg-brand text-white rounded-br-xs"
                        : "border border-border bg-surface-2 text-foreground rounded-bl-xs"
                    }`}
                  >
                    {m.role === "user" ? (
                      <p className="whitespace-pre-wrap">{m.text}</p>
                    ) : (
                      <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-2 [&>p:last-child]:mb-0 [&>pre]:my-2 [&>pre]:bg-background/90 [&>pre]:p-2.5 [&>pre]:rounded-lg [&>pre]:text-xs [&>ul]:my-1.5 [&>ol]:my-1.5">
                        <Markdown>{m.text}</Markdown>
                      </div>
                    )}
                  </div>
                  {m.role === "user" && (
                    <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-surface-3 text-muted">
                      <User className="size-3.5" aria-hidden />
                    </span>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex items-center gap-2 text-xs text-muted">
                  <span className="grid size-6 place-items-center rounded-full bg-brand-soft text-brand">
                    <Bot className="size-3.5" />
                  </span>
                  <div className="flex items-center gap-1.5 rounded-xl border border-border bg-surface-2 px-3 py-2">
                    <Loader2 className="size-3.5 animate-spin text-brand" />
                    <span>{isBn ? "Gemini চিন্তা করছে…" : "Gemini is thinking…"}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Action Chips */}
            <div className="border-t border-border/60 bg-surface/50 p-2.5">
              <div className="flex flex-wrap gap-1.5">
                {promptChips.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    disabled={loading}
                    onClick={() => sendMessage(chip.query)}
                    className="inline-flex items-center rounded-md border border-border bg-surface px-2.5 py-1 text-xs text-muted hover:border-brand/40 hover:bg-brand-soft/30 hover:text-foreground transition-colors disabled:opacity-50"
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
                  placeholder={
                    isBn
                      ? "প্রশ্ন সম্পর্কে কিছু জিজ্ঞাসা করুন…"
                      : "Ask a question about this problem…"
                  }
                  disabled={loading}
                  className="h-10 w-full rounded-xl border border-border bg-background pl-3.5 pr-11 text-xs sm:text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:opacity-50"
                />
                <Button
                  size="icon-sm"
                  variant="primary"
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || loading}
                  className="absolute right-1 size-8 rounded-lg"
                  aria-label="Send message"
                >
                  <Send className="size-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

