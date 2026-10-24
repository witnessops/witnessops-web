"use client";

import Link from "next/link";
import { ADMIN_HEALTH_SETTINGS_HREF } from "@/lib/admin/admin-health-display";
import { formatWarsawDateTime } from "@/lib/admin/admin-warsaw-time";
import { HealthGlyph } from "./admin-health-glyph";
import styles from "./admin.module.css";

export function AdminPageError({
  title,
  text = "The request failed, so this list may not be empty. Nothing was changed.",
  statusCode,
  occurredAt,
  onRetry,
}: {
  title: string;
  text?: string;
  statusCode?: number | null;
  occurredAt: string;
  onRetry: () => void;
}) {
  const when = formatWarsawDateTime(occurredAt);
  const stamp = when ? `${when} (Europe/Warsaw)` : "time not recorded";
  const meta = statusCode ? `Status ${statusCode} · ${stamp}` : stamp;
  return (
    <div className={styles.pageError} role="alert">
      <div className={styles.pageErrorTitleRow}>
        <HealthGlyph kind="failing" size={18} />
        <h1 className={styles.pageErrorTitle}>{title}</h1>
      </div>
      <p className={styles.pageErrorText}>{text}</p>
      <p className={styles.pageErrorMeta}>{meta}</p>
      <div className={styles.pageErrorActions}>
        <button type="button" className={styles.rowAction} onClick={onRetry}>Retry</button>
        <Link href={ADMIN_HEALTH_SETTINGS_HREF} className={styles.rowActionSecondary}>Open Health</Link>
      </div>
    </div>
  );
}
