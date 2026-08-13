import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CoreCard, CoreMeta, CorePage, CoreState, CoreTable } from "../../../../../components/admin/admin-core-view";
import { getProductContract, listProofRuns } from "@/lib/server/admin-core-spine";
import styles from "../../../../../components/admin/admin.module.css";
import { getAdminPageActor } from "@/lib/server/admin-page-session";

export const metadata: Metadata = { title: "Admin — Product Contract", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
interface RouteContext { params: Promise<{ id: string }> }

export default async function AdminProductDetailPage({ params }: RouteContext) {
  const { id } = await params;
  const actor = await getAdminPageActor();
  const product = await getProductContract(id);
  if (!product) notFound();
  const runs = (await listProofRuns(actor)).filter((run) => run.productContractVersionId === product.id);
  return <CorePage title={product.productName} eyebrow="Product contract version">
    <div className={styles.coreMetaGrid}><CoreMeta label="Product ID" value={product.productId} /><CoreMeta label="Contract version" value={product.contractVersion} /><CoreMeta label="Status" value={<CoreState value={product.status} />} /><CoreMeta label="Commercial terms" value={product.commercialTerms || "—"} /><CoreMeta label="Created" value={product.createdAt} /></div>
    <div className={styles.coreDetailSection}><div className={styles.coreDetailSectionTitle}>Scope</div><div className={styles.coreText}>{product.scope}</div></div>
    <div className={styles.coreMetaGrid}><CoreMeta label="Boundaries" value={product.boundaries.join(", ")} /><CoreMeta label="Expected inputs" value={product.expectedInputs.join(", ")} /><CoreMeta label="Expected outputs" value={product.expectedOutputs.join(", ")} /><CoreMeta label="Evidence classes" value={product.evidenceClasses.join(", ")} /><CoreMeta label="Verification path" value={product.verificationPath} /><CoreMeta label="Delivery requirements" value={product.deliveryRequirements.join(", ")} /><CoreMeta label="Receipt requirements" value={product.receiptRequirements.join(", ")} /></div>
    <CoreCard title="Pinned proof runs"><CoreTable headers={["Run", "State", "Pinned contract"]} rows={runs.map((run) => [<Link href={`/admin/proof-runs/${run.id}`} key={run.id}>{run.id}</Link>, <CoreState value={run.state} key="state" />, `${run.productContractSnapshot.productName} v${run.productContractSnapshot.contractVersion}`])} /></CoreCard>
  </CorePage>;
}
