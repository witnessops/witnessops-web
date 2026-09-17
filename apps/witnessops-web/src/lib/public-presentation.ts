/** Presentation only: never use this route list to grant access or authorize work. */
const publicRoots = new Set([
  "", "early-access", "pricing", "catalog", "review", "support", "docs",
  "library", "research", "articles", "contact", "why-witnessops", "why",
  "privacy", "terms", "security", "media-kit", "governed-execution",
  "operators", "runbooks", "receipts", "access-change-proof-run",
  "proof-backed-security-systems", "runner-loop", "customer-security-review",
  "verify", "verify-ui", "signals",
]);

export function usesPublicPresentation(pathname: string): boolean {
  const path = pathname.replace(/^\/pl(?=\/|$)/, "");
  return publicRoots.has(path.split("/")[1] ?? "");
}
