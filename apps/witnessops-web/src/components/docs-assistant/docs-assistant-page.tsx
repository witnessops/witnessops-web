"use client";

import { useEffect, useRef, useState } from "react";

import { DocsAssistantBoundaryMeta } from "./docs-assistant-boundary-meta";
import { DocsAssistantLoadingStatus } from "./docs-assistant-loading-status";
import { DocsAssistantSourceLinks } from "./docs-assistant-source-links";
import {
  answerText,
  docsAssistantRequestErrorDetails,
  type DocsAssistantUiAnswer,
} from "./docs-assistant-response";

interface Message {
  role: "user" | "assistant";
  content: string;
  citations?: DocsAssistantUiAnswer["citations"];
  answer?: DocsAssistantUiAnswer;
  error?: boolean;
}

const SUGGESTED_QUESTIONS = [
  "How does governed execution work?",
  "What fields are in a WitnessOps receipt?",
  "What does /verify check?",
  "What are the current trust limits?",
];

export function DocsAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function ask(q: string) {
    const trimmed = q.trim();
    if (!trimmed || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setQuestion("");
    setLoading(true);

    try {
      const res = await fetch("/api/docs-assistant/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
      });
      if (!res.ok) {
        const error = await docsAssistantRequestErrorDetails(res);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: error.message,
            error: true,
            answer: error.answer,
          },
        ]);
        return;
      }
      const data = (await res.json()) as DocsAssistantUiAnswer;
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: answerText(data),
          citations: data.citations,
          answer: data,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            err instanceof Error ? err.message : "Something went wrong.",
          error: true,
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-[calc(100vh-13rem)] flex-col pb-20 md:pb-0">
      <header className="mb-4 border-b border-surface-border pb-4">
        <div
          className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-accent"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          Assistant
        </div>
        <h1
          className="mt-1 text-2xl font-semibold uppercase tracking-tight text-text-primary"
          style={{ fontFamily: "var(--font-display)" }}
        >
          WitnessOps Docs
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Ask anything — receipts, governed execution, verification, or trust
          boundaries.
        </p>
      </header>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto">
        {isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center gap-6 px-4 text-center">
            <p className="max-w-sm text-sm leading-relaxed text-text-muted">
              Start with a question or pick one below to explore the docs.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => ask(q)}
                  className="rounded border border-surface-border bg-surface-bg px-3 py-2 text-sm text-text-muted transition-colors hover:border-brand-accent hover:text-text-primary"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {messages.map((msg, i) =>
              msg.role === "user" ? (
                <div key={i} className="flex justify-end">
                  <div className="max-w-xl rounded border border-surface-border bg-surface-bg px-4 py-3 text-sm text-text-primary">
                    {msg.content}
                  </div>
                </div>
              ) : (
                <div key={i} className="flex justify-start">
                  <div className="max-w-2xl">
                    <p
                      className={`whitespace-pre-line text-sm leading-relaxed ${
                        msg.error ? "text-red-400" : "text-text-primary"
                      }`}
                    >
                      {msg.content}
                    </p>
                    <DocsAssistantSourceLinks
                      answer={msg.answer}
                      citations={msg.citations}
                    />
                    <DocsAssistantBoundaryMeta answer={msg.answer} />
                  </div>
                </div>
              ),
            )}

            {loading && (
              <div className="flex justify-start">
                <DocsAssistantLoadingStatus />
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-surface-border pt-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(question);
          }}
          className="flex flex-col gap-2 sm:flex-row"
        >
          <input
            ref={inputRef}
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask anything about WitnessOps docs…"
            className="min-w-0 flex-1 rounded border border-surface-border bg-surface-bg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-brand-accent focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="shrink-0 rounded border border-surface-border bg-surface-bg px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-text-primary transition-colors hover:border-brand-accent hover:text-brand-accent disabled:opacity-40"
          >
            Ask
          </button>
        </form>
      </div>
    </div>
  );
}
