"use client";

import React from "react";
import { useState, useTransition } from "react";

interface Props {
  runId: string;
}

export function AdminAuthorizeRunAction({ runId }: Props) {
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  async function submit() {
    setError("");
    const response = await fetch(`/api/admin/lifecycle/${runId}/authorize`, {
      method: "POST",
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setError(payload?.error ?? "Unable to authorize this run.");
      return;
    }

    startTransition(() => {
      window.location.reload();
    });
  }

  return (
    <div data-testid="authorize-run-action" className="space-y-2">
      <button
        type="button"
        onClick={() => void submit()}
        disabled={isPending}
        className="rounded border border-amber-700 bg-amber-900/40 px-3 py-1 text-xs font-mono text-amber-100"
      >
        {isPending ? "Authorizing..." : "Authorize / start"}
      </button>
      {error ? <div className="text-xs text-red-300">{error}</div> : null}
    </div>
  );
}
