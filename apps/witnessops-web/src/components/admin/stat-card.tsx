import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import styles from "./admin.module.css";

interface StatCardProps {
  label: string;
  value: number;
  sub?: string;
  icon?: LucideIcon;
  href?: string;
  signal?: "green" | "red" | "accent" | "muted";
}

export function StatCard({ label, value, sub, icon: Icon, href, signal }: StatCardProps) {
  const valueClass =
    signal === "green"
      ? styles.statValueGreen
      : signal === "red"
        ? styles.statValueRed
        : signal === "accent"
          ? styles.statValueAccent
          : styles.statValue;

  const content = (
    <div className={`${styles.statCard}${href ? ` ${styles.statCardLinked}` : ""}`}>
      <div className={styles.statLabel}>
        {Icon ? <Icon size={12} aria-hidden /> : null}
        <span>{label}</span>
      </div>
      <div className={`${valueClass} tabular-nums`}>{value}</div>
      {sub ? <div className={styles.statSub}>{sub}</div> : null}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className={styles.statCardLink}>
        {content}
      </Link>
    );
  }

  return content;
}
