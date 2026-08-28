import type { ReactNode } from "react";

/**
 * Light paper shell for buyer verification landing surfaces.
 * Scoped to verification UX only — not a global site retheme.
 */
export function VerificationLightShell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`public-shell min-h-screen bg-[#f7f5f1] text-[#121212] antialiased ${className}`}
    >
      {children}
    </div>
  );
}

export const verificationLight = {
  page: "bg-[#f7f5f1] text-[#121212]",
  card: "border border-[#cfc9bd] bg-white",
  cardMuted: "border border-[#e4e0d8] bg-[#faf9f7]",
  label:
    "font-mono text-xs uppercase tracking-wider text-[#6f6a63]",
  title: "text-[#121212]",
  body: "text-[#3f3c38]",
  muted: "text-[#6f6a63]",
  input:
    "w-full rounded border border-[#6f6a63] bg-white px-3 py-3 text-center font-mono text-lg tracking-[0.16em] text-[#121212] outline-none transition placeholder:text-[#6f6a63] focus:border-[#b94716] focus:ring-2 focus:ring-[#b94716]/30",
  button:
    "w-full rounded border border-[#b94716] bg-[#b94716] px-4 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-[#fafaf7] transition hover:brightness-90 disabled:cursor-not-allowed disabled:border-[#cfc9bd] disabled:bg-[#e4e0d8] disabled:text-[#6f6a63]",
  buttonSecondary:
    "w-full rounded border border-[#6f6a63] bg-white px-4 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-[#3f3c38] transition hover:border-[#121212] hover:text-[#121212]",
  error:
    "rounded border border-[#f0c4c0] bg-[#fdf2f1] px-3 py-2 text-sm text-[#b42318]",
  accent: "text-[#b94716]",
  trust: "text-[#2d777c]",
} as const;
