import { syncHistoryBadge, syncHistoryRows, type SyncHistoryBadgeKind, type SyncReceiptView } from "@/lib/admin/admin-sync-status";
import { HealthGlyph } from "./admin-health-glyph";
import styles from "./admin.module.css";

const HEADERS = ["Time", "Result", "Reason", "Threads", "Created", "Updated", "Excluded", "Label failures", "Run"];

function syncHistoryBadgeTone(kind: SyncHistoryBadgeKind): "connected" | "failing" | "configured" {
  switch (kind) {
    case "connected":
      return "connected";
    case "failing":
      return "failing";
    case "neutral":
      return "configured";
    default: {
      const unreachable: never = kind;
      return unreachable;
    }
  }
}

export function AdminSyncHistory({ receipts }: { receipts: readonly SyncReceiptView[] }) {
  const badge = syncHistoryBadge(receipts);
  const rows = syncHistoryRows(receipts);
  const badgeTone = badge ? syncHistoryBadgeTone(badge.kind) : null;
  return (
    <details className={styles.syncHistory}>
      <summary className={styles.syncHistorySummary}>
        <span>Sync history</span>
        {badge && badgeTone ? (
          <span className={styles.healthBadge} data-kind={badgeTone}>
            <HealthGlyph kind={badgeTone} />
            <span>{badge.label}</span>
          </span>
        ) : null}
      </summary>
      {rows.length ? (
        <div className={styles.coreTableWrap} role="region" aria-label="Sync history" tabIndex={0}>
          <table className={styles.coreTable}>
            <thead><tr>{HEADERS.map((header) => <th key={header}>{header}</th>)}</tr></thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.runId}>
                  <td>{row.time}</td>
                  <td>
                    <span className={styles.healthBadge} data-kind={row.tone === "neutral" ? "configured" : row.tone}>
                      {row.tone === "connected" ? <HealthGlyph kind="connected" /> : row.tone === "failing" ? <HealthGlyph kind="failing" /> : <HealthGlyph kind="configured" />}
                      <span>{row.result}</span>
                    </span>
                  </td>
                  <td>{row.reason}</td>
                  {row.counts.map((count, index) => <td key={`${row.runId}-${index}`}>{count}</td>)}
                  <td><span className={styles.syncRunId}>{row.runId}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className={styles.syncHistoryEmpty}>No syncs recorded.</p>}
    </details>
  );
}
