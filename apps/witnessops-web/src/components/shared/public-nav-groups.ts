/**
 * English header destinations after the 2026-11-13 footer + header cleanup:
 * one review, how it works, examples and docs (About became Docs in footer bundle B,
 * Design 2026-11-13; /about stays live but unlinked). /early-access, /check,
 * /verify, /pricing and the bare /reviews page are no longer in navigation.
 */
export const PUBLIC_NAV_LINKS = [
  { label: "The review", href: "/reviews/agent-action-security-review" },
  { label: "How it works", href: "/how-it-works" },
  { label: "Examples", href: "/review/sample-cases" },
  { label: "Docs", href: "/docs" },
] as const;
