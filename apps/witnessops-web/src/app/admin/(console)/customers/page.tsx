import type { Metadata } from "next";
import Link from "next/link";
import { listCustomers } from "@/lib/server/admin-core-spine";
import { AdminRecordEmpty } from "../../../../components/admin/admin-record-empty";
import { CorePage, CoreTable } from "../../../../components/admin/admin-core-view";
import { getAdminPageActor } from "@/lib/server/admin-page-session";

export const metadata: Metadata = { title: "Admin — Customers", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminCustomersPage() {
  const customers = await listCustomers(await getAdminPageActor());
  return <CorePage title="Customers" eyebrow="Minimal customer record"><CoreTable headers={["Customer", "Email", "Organization", "Owner", "Updated"]} emptyMessage={<AdminRecordEmpty title="No customers yet." text="A customer record is created when you convert an Inbox message to a review request." actionHref="/admin/inbox" actionLabel="Go to Inbox" />} rows={customers.map((customer) => [<Link href={`/admin/customers/${customer.id}`} key={customer.id}>{customer.name}</Link>, customer.email, customer.organization || "—", customer.owner || "—", customer.updatedAt])} /></CorePage>;
}
