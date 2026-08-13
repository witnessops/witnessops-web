import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getReceipt } from "@/lib/receipts";
import { getReceiptRecord, listAuditEvents } from "@/lib/server/admin-core-spine";
import { CoreAuditTimeline, CoreMeta, CorePage, CoreState } from "../../../../../components/admin/admin-core-view";
import styles from "../../../../../components/admin/admin.module.css";
import { getAdminPageActor } from "@/lib/server/admin-page-session";

export const metadata: Metadata = { title: "Admin — Receipt", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
interface RouteContext { params: Promise<{ id: string }> }

export default async function AdminReceiptDetailPage({ params }: RouteContext) {
  const { id } = await params;
  const actor = await getAdminPageActor();
  const record = await getReceiptRecord(id, actor);
  if (record) {
    const events = await listAuditEvents(undefined, actor);
    return <CorePage title={record.receiptId} eyebrow="Receipt linkage"><div className={styles.coreMetaGrid}><CoreMeta label="Receipt exists" value={<CoreState value="yes" />} /><CoreMeta label="Structurally valid" value={<CoreState value={record.structurallyValid ? "yes" : "no"} />} /><CoreMeta label="Verifier mechanism" value={record.verifierMechanism} /><CoreMeta label="Verifier result" value={record.verifierResult} /><CoreMeta label="Archive location" value={record.archiveLocation} /><CoreMeta label="Supersedes" value={record.supersedesReceiptId || "None"} /><CoreMeta label="Superseded by" value={record.supersededByReceiptId || "None"} /></div><div className={styles.coreDetailSection}><div className={styles.coreDetailSectionTitle}>Bounded claim</div><div className={styles.coreText}>{record.claimScope}</div><p className={styles.coreText}>Limitations: {record.limitations.join("; ") || "None recorded"}</p></div><CoreAuditTimeline events={events.filter((event) => event.recordId === record.id)} /></CorePage>;
  }
  const published = actor.role === "Delegated Operator" ? null : await getReceipt(id);
  if (!published) notFound();
  return <CorePage title={published.receiptId} eyebrow="Published receipt archive"><div className={styles.coreMetaGrid}><CoreMeta label="Receipt exists" value={<CoreState value="yes" />} /><CoreMeta label="Stage" value={published.stage} /><CoreMeta label="Timestamp" value={published.timestamp} /><CoreMeta label="Previous receipt" value={published.prevReceiptId || "None"} /><CoreMeta label="Archive path" value={published.sourcePath} /><CoreMeta label="Verifier mechanism" value="Not recorded in this admin linkage" /><CoreMeta label="Verifier result" value="Not claimed" /></div><div className={styles.coreDetailSection}><div className={styles.coreDetailSectionTitle}>Operator interpretation</div><div className={styles.coreText}>The receipt exists in the published archive. This screen does not display “verified” because a named verifier mechanism and result are not recorded for this linkage.</div></div></CorePage>;
}
