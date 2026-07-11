import Link from "next/link";
import type { ReactNode } from "react";
import { CoreAction } from "./admin-core-ui";
import type { AuditEventRecord, HealthState } from "@/lib/server/admin-core-spine";
import styles from "./admin.module.css";

export function CorePage({ title, eyebrow, children, actions }: { title: string; eyebrow?: string; children: ReactNode; actions?: ReactNode }) {
  return <div className={styles.corePage}>
    <div className={styles.corePageHeader}>
      <div><div className={styles.coreEyebrow}>{eyebrow || "WitnessOps Admin Console"}</div><h1 className={styles.coreTitle}>{title}</h1></div>
      {actions ? <div className={styles.coreHeaderActions}>{actions}</div> : null}
    </div>
    {children}
  </div>;
}

export function CoreCard({ title, children, href }: { title: string; children: ReactNode; href?: string }) {
  const content = <div className={styles.coreCard}><div className={styles.coreCardTitle}>{title}</div>{children}</div>;
  return href ? <Link href={href} className={styles.coreCardLink}>{content}</Link> : content;
}

export function CoreState({ value }: { value: string }) {
  return <span className={styles.coreState}>{value}</span>;
}

export function CoreTable({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
  return <div className={styles.coreTableWrap}><table className={styles.coreTable}><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{rows.length ? rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>) : <tr><td colSpan={headers.length} className={styles.emptyState}>No records yet.</td></tr>}</tbody></table></div>;
}

export function CoreMeta({ label, value }: { label: string; value: ReactNode }) {
  return <div className={styles.coreMeta}><span className={styles.coreMetaLabel}>{label}</span><span className={styles.coreMetaValue}>{value}</span></div>;
}

export function CoreAuditTimeline({ events }: { events: AuditEventRecord[] }) {
  return <CoreCard title="Immutable audit timeline"><div className={styles.coreTimeline}>{events.length ? events.map((event) => <div className={styles.coreTimelineItem} key={event.eventId}><div className={styles.coreTimelineTop}><span>{event.action}</span><time>{event.timestamp}</time></div><div className={styles.coreTimelineDetail}>{event.actor} · {event.previousState || "—"} → {event.resultingState || "—"}{event.integrationResult ? ` · ${event.integrationResult}` : ""}</div>{event.failureDetails ? <div className={styles.queueWarning}>{event.failureDetails}</div> : null}</div>) : <div className={styles.emptyState}>No audit events yet.</div>}</div></CoreCard>;
}

export function CoreHealthGrid({ health }: { health: Record<string, { state: HealthState; lastSuccessfulCheck: string | null; lastError: string | null; detail: string }> }) {
  return <div className={styles.coreHealthGrid}>{Object.entries(health).map(([name, item]) => <CoreCard title={name.replaceAll(/([A-Z])/g, " $1")} key={name}><div className={styles.coreHealthState}><span className={`${styles.coreHealthDot} ${item.state === "connected" ? styles.coreHealthGood : item.state === "disconnected" ? styles.coreHealthBad : styles.coreHealthUnknown}`} />{item.state}</div><p className={styles.coreDetail}>{item.detail}</p>{item.lastError ? <p className={styles.queueWarning}>{item.lastError}</p> : null}</CoreCard>)}</div>;
}

export function DetailActions({ endpoint, action, label, confirmText }: { endpoint: string; action: string; label: string; confirmText?: string }) {
  return <CoreAction endpoint={endpoint} body={{ nextState: action }} label={label} confirmText={confirmText} />;
}
