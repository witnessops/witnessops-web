import type { Metadata } from "next";
import Link from "next/link";
import { GmailImportForm } from "../../../../components/admin/admin-core-ui";
import { CorePage, CoreState, CoreTable } from "../../../../components/admin/admin-core-view";
import { listInboxItems } from "@/lib/server/admin-core-spine";
import styles from "../../../../components/admin/admin.module.css";

export const metadata: Metadata = { title: "Admin — Inbox", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminInboxPage() {
  const items = await listInboxItems();
  return <CorePage title="Inbox" eyebrow="Gmail-originated intake">
    <div className={styles.coreDetailSection}><div className={styles.coreDetailSectionTitle}>Import metadata from Gmail</div><GmailImportForm /></div>
    <CoreTable headers={["Message", "From", "Thread", "State", "Attachments", "Action"]} rows={items.map((item) => [<Link href={`/admin/inbox/${item.id}`} key={item.id}>{item.subject}</Link>, item.sender, item.gmailThreadId, <CoreState value={item.state} key="state" />, item.attachments.length, <Link href={`/admin/inbox/${item.id}`} className={styles.inlineLink} key="open">Open</Link>])} />
  </CorePage>;
}
