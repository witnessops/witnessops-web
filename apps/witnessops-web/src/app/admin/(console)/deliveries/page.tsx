import type { Metadata } from "next";
import Link from "next/link";
import { listDeliveries } from "@/lib/server/admin-core-spine";
import { CorePage, CoreState, CoreTable } from "../../../../components/admin/admin-core-view";

export const metadata: Metadata = { title: "Admin — Deliveries", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminDeliveriesPage() {
  const deliveries = await listDeliveries();
  return <CorePage title="Deliveries" eyebrow="Operator-reviewed customer delivery"><CoreTable headers={["Delivery", "Proof run", "State", "Receipt", "Sent"]} rows={deliveries.map((delivery) => [<Link href={`/admin/deliveries/${delivery.id}`} key={delivery.id}>{delivery.id}</Link>, delivery.proofRunId, <CoreState value={delivery.state} key="state" />, delivery.receiptId || "—", delivery.sentAt || "—"])}/></CorePage>;
}
