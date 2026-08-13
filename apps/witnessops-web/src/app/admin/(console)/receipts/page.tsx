import type { Metadata } from "next";
import Link from "next/link";
import { listReceipts } from "@/lib/receipts";
import { listReceiptRecords } from "@/lib/server/admin-core-spine";
import { CorePage, CoreTable } from "../../../../components/admin/admin-core-view";
import styles from "../../../../components/admin/admin.module.css";
import { getAdminPageActor } from "@/lib/server/admin-page-session";

export const metadata: Metadata = { title: "Admin — Receipts", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminReceiptsPage() {
  const actor = await getAdminPageActor();
  const records = await listReceiptRecords(actor);
  const published = actor.role === "Delegated Operator" ? [] : await listReceipts();
  return <CorePage title="Receipts" eyebrow="Durable receipt archive and verification posture"><CoreTable headers={["Receipt ID", "Source", "Claim scope / stage", "Verifier posture", "Open"]} rows={[...records.map((receipt) => [<Link href={`/admin/receipts/${receipt.id}`} key={receipt.id}>{receipt.receiptId}</Link>, "Admin linkage", receipt.claimScope, `${receipt.verifierMechanism}: ${receipt.verifierResult}`, <Link href={`/admin/receipts/${receipt.id}`} className={styles.inlineLink} key="open">Open</Link>]), ...published.map((receipt) => [<Link href={`/admin/receipts/${receipt.receiptId}`} key={receipt.receiptId}>{receipt.receiptId}</Link>, "Published archive", receipt.stage, "Mechanism not recorded in admin linkage", <Link href={`/admin/receipts/${receipt.receiptId}`} className={styles.inlineLink} key="open">Open</Link>])]} /></CorePage>;
}
