"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { VerifyTokenResponse } from "@/lib/token-contract";

interface Props {
  issuanceId: string;
  email: string;
  token: string;
}

function buildRedirectUrl(payload: VerifyTokenResponse): string {
  if (payload.channel === "support") {
    const search = new URLSearchParams({
      verified: "1",
      intakeId: payload.intakeId,
      email: payload.email,
    });
    if (payload.threadId) {
      search.set("threadId", payload.threadId);
    }
    return `/support?${search.toString()}`;
  }

  const search = new URLSearchParams({ email: payload.email });
  return `/assessment/${encodeURIComponent(payload.issuanceId)}?${search.toString()}`;
}

export function VerifyTokenForm(props: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/verify-token", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(props),
      });
      const payload = (await response.json().catch(() => null)) as
        | (Partial<VerifyTokenResponse> & { error?: string })
        | null;

      if (!response.ok || !payload?.issuanceId || !payload.email) {
        setError(payload?.error ?? "Verification failed.");
        return;
      }

      router.replace(buildRedirectUrl(payload as VerifyTokenResponse));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <div className="font-mono text-xs uppercase tracking-wider text-zinc-500">
          Email
        </div>
        <div className="mt-1 break-all text-sm text-zinc-200">{props.email}</div>
      </div>
      {error ? (
        <div className="rounded border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      ) : null}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded border border-emerald-700 bg-emerald-500 px-4 py-2 text-sm font-medium text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:border-zinc-700 disabled:bg-zinc-800 disabled:text-zinc-500"
      >
        {isSubmitting ? "Verifying..." : "Verify mailbox"}
      </button>
    </form>
  );
}
