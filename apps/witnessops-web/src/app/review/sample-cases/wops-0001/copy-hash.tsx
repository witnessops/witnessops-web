"use client";

import { useState } from "react";

export function CopyHash({ value, name }: { value: string; name: string }) {
  const [status, setStatus] = useState("");
  return (
    <div className="mt-3">
      <p className="text-xs text-text-muted">SHA-256</p>
      <code className="block break-all text-xs leading-6 text-text-secondary">{value}</code>
      <button
        type="button"
        className="mt-1 min-h-11 border border-surface-border px-3 text-sm text-text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-accent"
        aria-label={`Copy SHA-256 for ${name}`}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setStatus("Full SHA-256 copied.");
          } catch {
            setStatus("Copy unavailable. Select the full SHA-256 above.");
          }
        }}
      >Copy hash</button>
      <span className="ml-3 text-xs text-text-muted" role="status">{status}</span>
    </div>
  );
}
