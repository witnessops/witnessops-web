import type { Metadata } from "next";
import Link from "next/link";
import { SyncInboxAction } from "../../../../components/admin/admin-core-ui";
import { CorePage, CoreState, CoreTable } from "../../../../components/admin/admin-core-view";
import { listGmailSyncReceipts, listInboxItems } from "@/lib/server/admin-core-spine";
import styles from "../../../../components/admin/admin.module.css";

export const metadata: Metadata = { title: "Admin — Inbox", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminInboxPage() {
  const items = await listInboxItems();
  const syncRuns = await listGmailSyncReceipts(5);
  return <CorePage title="Inbox" eyebrow="Gmail-originated intake">
    <div className={styles.coreDetailSection}><div className={styles.coreDetailSectionTitle}>Manual reconciliation</div><p className={styles.coreFormNote}>Fetches metadata from {"engage@mail.witnessops.com"}, creates or updates inbox items, applies the configured lifecycle label, and never creates a review request automatically.</p><SyncInboxAction /></div>
    <div className={styles.coreDetailSection}><div className={styles.coreDetailSectionTitle}>Recent reconciliation receipts</div><CoreTable headers={["Run", "Status", "Threads", "Created", "Updated", "Excluded", "Label failures"]} rows={syncRuns.map((receipt) => [receipt.syncRunId, <CoreState value={receipt.status} key="status" />, receipt.counts.threadsInspected, receipt.counts.inboxItemsCreated, receipt.counts.existingItemsUpdated, receipt.counts.securityMessagesExcluded, receipt.counts.labelFailures])} /></div>
    <CoreTable headers={["Message", "From", "Thread", "State", "Attachments", "Action"]} rows={items.map((item) => [<Link href={`/admin/inbox/${item.id}`} key={item.id}>{item.subject}</Link>, item.sender, item.gmailThreadId, <CoreState value={item.state} key="state" />, item.attachments.length, <Link href={`/admin/inbox/${item.id}`} className={styles.inlineLink} key="open">Open</Link>])} />
  </CorePage>;
}
