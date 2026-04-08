"use client";

import { useState } from "react";

import { isFreemailDomain } from "@/lib/freemail-policy";
import type { EngageResponse } from "@/lib/token-contract";

export function ScanHero() {
  const [email, setEmail] = useState("");
  const [issuance, setIssuance] = useState<EngageResponse | null>(null);
  const [status, setStatus] = useState<"idle" | "submitting" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const domain = email.split("@")[1]?.toLowerCase() ?? "";
    setErrorMsg("");
    setIssuance(null);

    if (!domain) {
      setErrorMsg("Please enter a valid email address.");
      setStatus("error");
      return;
    }

    if (isFreemailDomain(domain)) {
      setErrorMsg(`Please use your business email — not ${domain}`);
      setStatus("error");
      return;
    }

    setStatus("submitting");

    try {
      const response = await fetch("/api/engage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const payload = await response.json() as EngageResponse | { error?: string };
      if (!response.ok) {
        throw new Error("error" in payload && payload.error ? payload.error : "Unable to issue verification email.");
      }

      setIssuance(payload as EngageResponse);
      setStatus("sent");
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Unable to issue verification email.");
      setStatus("error");
    }
  }

  return (
    <section id="governed-recon" className="mx-auto max-w-[800px] px-6 pt-20 pb-24 text-center">
      <p
        className="mb-6 inline-flex items-center gap-3"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--color-brand-accent)",
        }}
      >
        <span className="inline-block h-2 w-2 bg-brand-accent" />
        Start Here
      </p>

      <h2
        className="mx-auto max-w-2xl text-text-primary mb-5"
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(28px, 4vw, 42px)",
          fontWeight: 600,
          letterSpacing: "0.03em",
          textTransform: "uppercase",
          lineHeight: 1.06,
        }}
      >
        Start with the verifier. Then run the work.
      </h2>

      <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-text-muted">
        Start by verifying a real proof bundle. Then move into a scoped,
        non-intrusive governed recon when you are ready to generate your own
        bundle.
      </p>

      <div className="mx-auto mt-6 max-w-xl space-y-2 text-sm leading-relaxed text-text-muted">
        <p>Use your business email.</p>
        <p>Verify your domain.</p>
        <p>Approve the scope.</p>
        <p>Receive a security report and a signed, portable proof bundle.</p>
        <p>No intrusive testing without explicit approval.</p>
      </div>

      <p
        className="mt-4"
        style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-brand-muted)", letterSpacing: "0.06em" }}
      >
        Business email only.
      </p>

      {status === "sent" ? (
        <div className="mx-auto mt-10 max-w-md border border-signal-green/20 bg-signal-green/5 px-6 py-4 text-sm text-signal-green">
          Verification email issued to <strong>{issuance?.email ?? email}</strong>. Check your inbox.
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="mx-auto mt-10 flex max-w-[540px] overflow-hidden border border-surface-border bg-surface-card transition-all focus-within:border-brand-accent/40 focus-within:shadow-[0_0_32px_rgba(255,107,53,0.06)]"
        >
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setStatus("idle"); }}
            placeholder="you@yourcompany.com"
            required
            className="flex-1 bg-transparent px-5 py-4 font-mono text-sm text-text-primary caret-brand-accent outline-none placeholder:text-text-muted"
            style={{ letterSpacing: "0.03em" }}
          />
          <button
            type="submit"
            disabled={status === "submitting"}
            className="shrink-0 bg-brand-accent px-7 py-4 text-surface-bg transition-all hover:brightness-110 hover:shadow-[0_0_20px_rgba(255,107,53,0.25)]"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            {status === "submitting" ? "Issuing..." : "Start Free Governed Recon"}
          </button>
        </form>
      )}

      {status === "error" && (
        <p className="mt-3 text-xs text-signal-red">{errorMsg}</p>
      )}
    </section>
  );
}
