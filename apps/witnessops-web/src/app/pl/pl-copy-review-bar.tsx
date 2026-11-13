"use client";

import { usePathname } from "next/navigation";

import styles from "./pl-copy-review-bar.module.css";

const COMPACT_PATHS = new Set([
  "/pl/reviews/agent-action-security-review",
]);

export function PlCopyReviewBar() {
  const pathname = usePathname() || "";
  if (pathname === "/pl" || pathname === "/pl/") return null;
  const compact = COMPACT_PATHS.has(pathname);
  return (
    <p
      className={
        compact
          ? `pl-copy-review reviewTag border-b border-[var(--line)] bg-[var(--paper-2)] px-4 text-center text-[var(--ink-dim)] ${styles.compact}`
          : "pl-copy-review reviewTag border-b border-[var(--line)] bg-[var(--paper-2)] px-4 py-2 text-center text-[var(--ink-dim)]"
      }
    >
      PL copy pending native review
    </p>
  );
}
