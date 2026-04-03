"use client";

import { useState } from "react";
import styles from "./admin.module.css";

interface Props {
  reportUrl: string;
}

export function AdminCopyReport({ reportUrl }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      const fullUrl = new URL(reportUrl, window.location.origin).href;
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable
    }
  }

  return (
    <button
      type="button"
      className={styles.rowAction}
      onClick={handleCopy}
    >
      {copied ? "Copied" : "Copy URL"}
    </button>
  );
}
