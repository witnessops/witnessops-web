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
  "What package fits a launch readiness review?",
  "What does a proof packet include?",
  "Can I send logs or screenshots?",
  "What is not included in workspace access?",
  "How do I request a fit check?",
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
    <div className="flex min-h-[calc(100vh-13rem)] flex-col pb-20 md:h-[calc(100vh-13rem)] md:pb-0">
      <header className="mb-4 border-b border-surface-border pb-4">
        <div
          className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-accent"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          Bounded proof guide
        </div>
        <h1
          className="mt-1 text-2xl font-semibold uppercase tracking-tight text-text-primary"
          style={{ fontFamily: "var(--font-display)" }}
        >
          ASK WITNESSOPS
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-text-muted">
          Ask a non-secret question about proof packets, receipts, verification
          paths, catalog packages, or safe first contact.
        </p>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-muted md:text-xs">
          Do not paste secrets, logs, credentials, private keys, MFA codes,
          screenshots, customer evidence, or raw exports.
        </p>
      </header>

      {/* Message list */}
      <div className="overflow-visible md:min-h-0 md:flex-1 md:overflow-y-auto">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center gap-4 px-4 py-6 text-center md:h-full md:gap-6 md:py-0">
            <p className="max-w-sm text-sm leading-relaxed text-text-muted">
              Pick a bounded buyer or proof question to start.
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
            placeholder="Ask a non-secret question..."
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
        <p className="mt-2 text-sm leading-relaxed text-text-muted md:text-xs">
          Answers are based on public WitnessOps material. For private systems,
          request a fit check.
        </p>
      </div>
    </div>
  );
}
