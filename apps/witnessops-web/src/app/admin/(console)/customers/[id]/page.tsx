import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CoreAuditTimeline, CoreCard, CoreMeta, CorePage, CoreState, CoreTable } from "../../../../../components/admin/admin-core-view";
import { getCustomer, listAuditEvents, listDeliveries, listProofRuns, listReviewRequests } from "@/lib/server/admin-core-spine";
import styles from "../../../../../components/admin/admin.module.css";

export const metadata: Metadata = { title: "Admin — Customer", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
interface RouteContext { params: Promise<{ id: string }> }

export default async function AdminCustomerDetailPage({ params }: RouteContext) {
  const { id } = await params;
  const customer = await getCustomer(id);
  if (!customer) notFound();
  const [requests, runs, deliveries, events] = await Promise.all([listReviewRequests(), listProofRuns(), listDeliveries(), listAuditEvents()]);
  const customerRequests = requests.filter((item) => item.customerId === id);
  const customerRuns = runs.filter((item) => item.customerId === id);
  const customerDeliveries = deliveries.filter((item) => item.customerId === id);
  const lineageIds = new Set(customerRequests.map((item) => item.lineageId));
  return <CorePage title={customer.name} eyebrow="Customer">
    <div className={styles.coreMetaGrid}><CoreMeta label="Email" value={customer.email} /><CoreMeta label="Organization" value={customer.organization || "—"} /><CoreMeta label="Owner" value={customer.owner || "—"} /><CoreMeta label="Created" value={customer.createdAt} /></div>
    <div className={styles.coreDetailSection}><div className={styles.coreDetailSectionTitle}>Notes</div><div className={styles.coreText}>{customer.notes || "No notes."}</div></div>
    <CoreCard title="Review requests"><CoreTable headers={["ID", "State", "Next action"]} rows={customerRequests.map((item) => [<Link href={`/admin/review-requests/${item.id}`} key={item.id}>{item.id}</Link>, <CoreState value={item.state} key="state" />, item.nextAction])} /></CoreCard>
    <CoreCard title="Proof runs"><CoreTable headers={["ID", "Product", "State", "Evidence"]} rows={customerRuns.map((item) => [<Link href={`/admin/proof-runs/${item.id}`} key={item.id}>{item.id}</Link>, item.productContractSnapshot.productName, <CoreState value={item.state} key="state" />, item.evidenceState])} /></CoreCard>
    <CoreCard title="Deliveries"><CoreTable headers={["ID", "State", "Receipt"]} rows={customerDeliveries.map((item) => [<Link href={`/admin/deliveries/${item.id}`} key={item.id}>{item.id}</Link>, <CoreState value={item.state} key="state" />, item.receiptId || "—"])}/></CoreCard>
    <CoreAuditTimeline events={events.filter((event) => event.recordId === id || (event.lineageId && lineageIds.has(event.lineageId)))} />
  </CorePage>;
}
