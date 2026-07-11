import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CoreAction, DeliveryDraftForm, ReceiptLinkForm } from "../../../../../components/admin/admin-core-ui";
import { CoreAuditTimeline, CoreCard, CoreMeta, CorePage, CoreState } from "../../../../../components/admin/admin-core-view";
import { buildDeliveryReadiness, getDelivery, listAuditEvents } from "@/lib/server/admin-core-spine";
import styles from "../../../../../components/admin/admin.module.css";

export const metadata: Metadata = { title: "Admin — Delivery", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
interface RouteContext { params: Promise<{ id: string }> }

export default async function AdminDeliveryDetailPage({ params }: RouteContext) {
  const { id } = await params;
  const delivery = await getDelivery(id);
  if (!delivery) notFound();
  const [readiness, events] = await Promise.all([buildDeliveryReadiness(id), listAuditEvents(delivery.lineageId)]);
  return <CorePage title={delivery.id} eyebrow="Delivery">
    <div className={styles.coreMetaGrid}><CoreMeta label="State" value={<CoreState value={delivery.state} />} /><CoreMeta label="Proof run" value={<Link href={`/admin/proof-runs/${delivery.proofRunId}`} className={styles.inlineLink}>{delivery.proofRunId}</Link>} /><CoreMeta label="Receipt" value={delivery.receiptId ? <Link href={`/admin/receipts/${delivery.receiptId}`} className={styles.inlineLink}>{delivery.receiptId}</Link> : "Not linked"} /><CoreMeta label="Provider" value={delivery.provider || "Not sent"} /><CoreMeta label="Provider message" value={delivery.providerMessageId || "—"} /></div>
    <div className={styles.coreDetailSection}><div className={styles.coreDetailSectionTitle}>Delivery draft</div><DeliveryDraftForm deliveryId={delivery.id} initial={delivery} /></div>
    <div className={styles.coreDetailSection}><div className={styles.coreDetailSectionTitle}>Receipt linkage</div>{delivery.receiptId ? <p className={styles.coreText}>Receipt linked: <Link href={`/admin/receipts/${delivery.receiptId}`} className={styles.inlineLink}>{delivery.receiptId}</Link></p> : <ReceiptLinkForm deliveryId={delivery.id} />}</div>
    <CoreCard title="Readiness check"><div className={styles.coreMetaGrid}><CoreMeta label="Pass" value={readiness.pass.map((item) => item.label).join(" · ") || "None"} /><CoreMeta label="Fail" value={readiness.fail.map((item) => `${item.label}: ${item.detail}`).join(" · ") || "None"} /><CoreMeta label="Unresolved" value={readiness.unresolved.map((item) => `${item.label}: ${item.detail}`).join(" · ") || "None"} /></div></CoreCard>
    <div className={styles.coreDetailSection}><div className={styles.coreDetailSectionTitle}>Delivery actions</div><div className={styles.queueActionButtons}>{delivery.state === "draft" ? <CoreAction endpoint={`/api/admin/core/deliveries/${delivery.id}/transition`} body={{ nextState: "ready_for_operator_review" }} label="Mark ready for review" /> : null}{delivery.state === "ready_for_operator_review" ? <CoreAction endpoint={`/api/admin/core/deliveries/${delivery.id}/send`} body={{ idempotencyKey: `delivery-send:${delivery.id}` }} label="Send delivery" confirmText="Send this customer-facing delivery email?" /> : null}{delivery.state === "sent" ? <CoreAction endpoint={`/api/admin/core/deliveries/${delivery.id}/transition`} body={{ nextState: "acknowledged" }} label="Record acknowledgement" /> : null}</div></div>
    <CoreAuditTimeline events={events} />
  </CorePage>;
}
