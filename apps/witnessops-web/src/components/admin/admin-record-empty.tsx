import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./admin.module.css";

export function AdminRecordEmpty({
  title,
  text,
  actionHref,
  actionLabel,
  action,
}: {
  title: string;
  text: string;
  actionHref?: string;
  actionLabel?: string;
  action?: ReactNode;
}) {
  return (
    <div className={styles.recordEmpty} role="status">
      <h2 className={styles.recordEmptyTitle}>{title}</h2>
      <p className={styles.recordEmptyText}>{text}</p>
      {action}
      {actionHref && actionLabel ? <Link href={actionHref} className={styles.rowAction}>{actionLabel}</Link> : null}
    </div>
  );
}
