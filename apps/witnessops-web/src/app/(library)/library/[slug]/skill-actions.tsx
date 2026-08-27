"use client";

import { useState } from "react";
import styles from "../skill-library.module.css";

export function SkillCopyAction({ markdown }: { markdown: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function copyExactBytes() {
    try {
      await navigator.clipboard.writeText(markdown);
      setState("copied");
    } catch {
      setState("failed");
    }
  }

  return (
    <>
      <button type="button" className={styles.copyButton} onClick={copyExactBytes}>
        {state === "copied" ? "Copied exact text" : "Copy SKILL.md"}
      </button>
      <span aria-live="polite" className="text-xs text-text-muted">
        {state === "failed" ? "Clipboard unavailable. Use exact-byte download." : ""}
      </span>
    </>
  );
}
