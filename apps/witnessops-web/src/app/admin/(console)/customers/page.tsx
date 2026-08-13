import type { Metadata } from "next";
import Link from "next/link";
import { listCustomers } from "@/lib/server/admin-core-spine";
import { CorePage, CoreTable } from "../../../../components/admin/admin-core-view";
import { getAdminPageActor } from "@/lib/server/admin-page-session";

export const metadata: Metadata = { title: "Admin — Customers", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminCustomersPage() {
  const customers = await listCustomers(await getAdminPageActor());
  return <CorePage title="Customers" eyebrow="Minimal customer record"><CoreTable headers={["Customer", "Email", "Organization", "Owner", "Updated"]} rows={customers.map((customer) => [<Link href={`/admin/customers/${customer.id}`} key={customer.id}>{customer.name}</Link>, customer.email, customer.organization || "—", customer.owner || "—", customer.updatedAt])} /></CorePage>;
}
