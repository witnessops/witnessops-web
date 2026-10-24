import { syncHistoryBadge, syncHistoryRows, type SyncReceiptView } from "@/lib/admin/admin-sync-status";
import { HealthGlyph } from "./admin-health-glyph";
import styles from "./admin.module.css";

const HEADERS = ["Time", "Result", "Reason", "Threads", "Created", "Updated", "Excluded", "Label failures", "Run"];

export function AdminSyncHistory({ receipts }: { receipts: readonly SyncReceiptView[] }) {
  const badge = syncHistoryBadge(receipts);
  const rows = syncHistoryRows(receipts);
  const badgeKind = badge?.startsWith("Last sync succeeded ·") ? "connected" : badge?.includes("failed") ? "failing" : "configured";
  return (
    <details className={styles.syncHistory}>
      <summary className={styles.syncHistorySummary}>
        <span>Sync history</span>
        {badge ? (
          <span className={styles.healthBadge} data-kind={badgeKind}>
            {badgeKind === "connected" ? <HealthGlyph kind="connected" /> : badgeKind === "failing" ? <HealthGlyph kind="failing" /> : <HealthGlyph kind="configured" />}
            <span>{badge}</span>
          </span>
        ) : null}
      </summary>
      {rows.length ? (
        <div className={styles.coreTableWrap}>
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
