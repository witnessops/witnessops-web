import type { Metadata } from "next";
import Link from "next/link";
import { InboxEmptyState, InboxSyncBanner, InboxSyncButton, InboxSyncProvider, InboxSyncStatus } from "../../../../components/admin/admin-inbox-sync";
import { AdminSyncHistory } from "../../../../components/admin/admin-sync-history";
import { CorePage, CoreState, CoreTable } from "../../../../components/admin/admin-core-view";
import { inboxEmpty, syncBanner } from "@/lib/admin/admin-sync-status";
import { listGmailSyncReceipts, listInboxItems } from "@/lib/server/admin-core-spine";
import styles from "../../../../components/admin/admin.module.css";
import { getAdminPageActor } from "@/lib/server/admin-page-session";

export const metadata: Metadata = { title: "Admin — Inbox", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminInboxPage() {
  const actor = await getAdminPageActor();
  const items = await listInboxItems(actor);
  const syncRuns = await listGmailSyncReceipts(5, actor);
  const banner = syncBanner(syncRuns);
  const empty = inboxEmpty(items.length, syncRuns);
  return (
    <InboxSyncProvider initiallyFailing={Boolean(banner)}>
      <CorePage title="Inbox" eyebrow="Gmail-originated intake">
        {banner ? <InboxSyncBanner banner={banner} /> : null}
        <InboxSyncStatus />
        <div className={styles.coreDetailSection}>
          <div className={styles.coreDetailSectionTitle}>Manual reconciliation</div>
          <p className={styles.coreFormNote}>Fetches metadata from {"engage@mail.witnessops.com"}, creates or updates inbox items, applies the configured lifecycle label, and never creates a review request automatically.</p>
          <InboxSyncButton label="Sync inbox" emphasis={banner ? "secondary" : "primary"} />
        </div>
        <AdminSyncHistory receipts={syncRuns} />
        <CoreTable
          headers={["Message", "From", "Thread", "State", "Attachments", "Action"]}
          rows={items.map((item) => [<Link href={`/admin/inbox/${item.id}`} key={item.id}>{item.subject}</Link>, item.sender, item.gmailThreadId, <CoreState value={item.state} key="state" />, item.attachments.length, <Link href={`/admin/inbox/${item.id}`} className={styles.inlineLink} key="open">Open</Link>])}
          emptyMessage={empty ? <InboxEmptyState title={empty.title} text={empty.text} actionLabel={empty.actionLabel} /> : undefined}
        />
      </CorePage>
    </InboxSyncProvider>
  );
}
