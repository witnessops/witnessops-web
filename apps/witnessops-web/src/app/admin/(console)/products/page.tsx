import type { Metadata } from "next";
import Link from "next/link";
import { listProductContracts } from "@/lib/server/admin-core-spine";
import { CorePage, CoreState, CoreTable } from "../../../../components/admin/admin-core-view";
import { getAdminPageActor } from "@/lib/server/admin-page-session";

export const metadata: Metadata = { title: "Admin — Products", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const products = await listProductContracts(await getAdminPageActor());
  return <CorePage title="Products" eyebrow="Immutable contract versions"><CoreTable headers={["Product", "Product ID", "Contract", "Status", "Expected outputs"]} rows={products.map((product) => [<Link href={`/admin/products/${product.id}`} key={product.id}>{product.productName}</Link>, product.productId, product.contractVersion, <CoreState value={product.status} key="status" />, product.expectedOutputs.join(", ")])} /></CorePage>;
}
