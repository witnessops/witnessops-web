import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CoreAction } from "../../../../../components/admin/admin-core-ui";
import { CoreAuditTimeline, CoreMeta, CorePage, CoreState, CoreTable } from "../../../../../components/admin/admin-core-view";
import { getInboxItem, listAuditEvents } from "@/lib/server/admin-core-spine";
import styles from "../../../../../components/admin/admin.module.css";
import { getAdminPageActor } from "@/lib/server/admin-page-session";

export const metadata: Metadata = { title: "Admin — Inbox Item", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
interface RouteContext { params: Promise<{ id: string }> }

export default async function AdminInboxDetailPage({ params }: RouteContext) {
  const { id } = await params;
  const actor = await getAdminPageActor();
  const item = await getInboxItem(id, actor);
  if (!item) notFound();
  const events = await listAuditEvents(item.lineageId, actor);
  return <CorePage title={item.subject} eyebrow="Inbox item">
    <div className={styles.coreMetaGrid}><CoreMeta label="State" value={<CoreState value={item.state} />} /><CoreMeta label="Gmail message" value={item.gmailMessageId} /><CoreMeta label="Gmail thread" value={item.gmailThreadId} /><CoreMeta label="From" value={item.sender} /><CoreMeta label="Received" value={item.receivedAt} /></div>
    <div className={styles.coreDetailSection}><div className={styles.coreDetailSectionTitle}>Message excerpt</div><div className={styles.coreText}>{item.excerpt || "No excerpt retained; open the original Gmail thread."}</div></div>
    <div className={styles.coreDetailSection}><div className={styles.coreDetailSectionTitle}>Attachment metadata · untrusted until classified</div><CoreTable headers={["Attachment", "MIME", "Size", "Classification", "Action"]} rows={item.attachments.map((attachment) => [attachment.filename, attachment.mimeType, attachment.sizeBytes ?? "—", attachment.classification ?? "unreviewed", <span key={attachment.attachmentId}><CoreAction endpoint={`/api/admin/core/inbox/${item.id}/classify-attachment`} body={{ attachmentId: attachment.attachmentId, classification: attachment.classification === "excluded" ? "reference" : "excluded" }} label={attachment.classification === "excluded" ? "Mark reference" : "Exclude"} /></span>])} /></div>
    <div className={styles.coreDetailSection}><div className={styles.coreDetailSectionTitle}>Lifecycle action</div>{item.state === "security-routed" ? <p className={styles.coreText}>This message is routed to {"security@witnessops.com"} and cannot become a review request.</p> : item.reviewRequestId ? <p className={styles.coreText}>Linked review request: <Link href={`/admin/review-requests/${item.reviewRequestId}`} className={styles.inlineLink}>{item.reviewRequestId}</Link></p> : <CoreAction endpoint={`/api/admin/core/inbox/${item.id}/convert`} body={{ idempotencyKey: `convert:${item.id}` }} label="Convert to review request" confirmText="Create an internal review request from this Gmail item?" />}</div>
    <CoreAuditTimeline events={events} />
  </CorePage>;
}
