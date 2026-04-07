/**
 * WEB-011: admin system surface, fiction-cleanup edition.
 *
 * The previous version of this component carried five hardcoded
 * values, three of which were either tautological (`Build: STATIC`,
 * `Status: LIVE`) or stale (`Docs Pages: 48` while the real count had
 * drifted to 57). This version renders only what the system actually
 * knows:
 *
 *   - Surface     : real public site origin from NEXT_PUBLIC_OS_SITE_URL
 *                   with documented fallback
 *   - Docs Pages  : real count of authored doc files at render time
 *   - Audio Files : real count of generated audio assets at render time
 *
 * The Build and Status rows were removed entirely. Build was an
 * architectural label that the page did not actually know; Status
 * was a pure tautology — the row only renders when the operator is
 * already viewing a live deployment.
 *
 * This component is intentionally NOT marked "use client". The
 * previous version carried that directive even though it had no
 * hooks or event handlers; converting it to a server component is
 * what enables the render-time data reads.
 */
import {
  countAudioFiles,
  countDocsPages,
  getPublicSurfaceUrl,
} from "@/lib/server/admin-system-data";
import styles from "./admin.module.css";

export async function AdminSystem() {
  const [docsPageCount, audioFileCount] = await Promise.all([
    countDocsPages(),
    countAudioFiles(),
  ]);
  const surfaceUrl = getPublicSurfaceUrl();
  // Show the host without the protocol so the row stays compact.
  let surfaceLabel: string;
  try {
    surfaceLabel = new URL(surfaceUrl).host;
  } catch {
    surfaceLabel = surfaceUrl;
  }

  return (
    <>
      <div className={styles.sectionHeader}>System</div>
      <div className={styles.row}>
        <span className={styles.rowLabel}>Surface</span>
        <span className={styles.rowValueAccent}>{surfaceLabel}</span>
      </div>
      <div className={styles.row}>
        <span className={styles.rowLabel}>Docs Pages</span>
        <span className={styles.rowValue}>{docsPageCount}</span>
      </div>
      <div className={styles.row}>
        <span className={styles.rowLabel}>Audio Files</span>
        <span className={styles.rowValue}>{audioFileCount}</span>
      </div>
    </>
  );
}
