import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CoreAction, ProofRunOperatorForm } from "../../../../../components/admin/admin-core-ui";
import { CoreAuditTimeline, CoreCard, CoreMeta, CorePage, CoreState } from "../../../../../components/admin/admin-core-view";
import { buildProofReadiness, getProofRun, listAuditEvents } from "@/lib/server/admin-core-spine";
import styles from "../../../../../components/admin/admin.module.css";
import { getAdminPageActor } from "@/lib/server/admin-page-session";

export const metadata: Metadata = { title: "Admin — Proof Run", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
interface RouteContext { params: Promise<{ id: string }> }

export default async function AdminProofRunDetailPage({ params }: RouteContext) {
  const { id } = await params;
  const actor = await getAdminPageActor();
  const run = await getProofRun(id, actor);
  if (!run) notFound();
  const [readiness, events] = await Promise.all([buildProofReadiness(id, actor), listAuditEvents(run.lineageId, actor)]);
  const nextState: Record<string, string> = { planned: "ready", ready: "running", running: "operator_review", operator_review: "complete", blocked: "ready" };
  return <CorePage title={run.id} eyebrow="Proof run">
    <div className={styles.coreMetaGrid}><CoreMeta label="State" value={<CoreState value={run.state} />} /><CoreMeta label="Evidence" value={<CoreState value={run.evidenceState} />} /><CoreMeta label="Product contract" value={<Link href={`/admin/products/${run.productContractVersionId}`} className={styles.inlineLink}>{run.productContractSnapshot.productName} v{run.productContractSnapshot.contractVersion}</Link>} /><CoreMeta label="Owner" value={run.owner || "Unassigned"} /><CoreMeta label="Next action" value={run.nextAction} /></div>
    <div className={styles.coreDetailSection}><div className={styles.coreDetailSectionTitle}>Pinned product contract snapshot</div><div className={styles.coreMetaGrid}><CoreMeta label="Scope" value={run.productContractSnapshot.scope} /><CoreMeta label="Boundaries" value={run.productContractSnapshot.boundaries.join(", ")} /><CoreMeta label="Expected inputs" value={run.productContractSnapshot.expectedInputs.join(", ")} /><CoreMeta label="Expected outputs" value={run.productContractSnapshot.expectedOutputs.join(", ")} /><CoreMeta label="Evidence classes" value={run.productContractSnapshot.evidenceClasses.join(", ")} /><CoreMeta label="Verification path" value={run.productContractSnapshot.verificationPath} /></div></div>
    <div className={styles.coreDetailSection}><div className={styles.coreDetailSectionTitle}>Operator execution and evidence</div><ProofRunOperatorForm proofRunId={run.id} initial={run} /></div>
    <CoreCard title="Readiness check"><div className={styles.coreMetaGrid}><CoreMeta label="Pass" value={readiness.pass.map((item) => item.label).join(" · ") || "None"} /><CoreMeta label="Fail" value={readiness.fail.map((item) => `${item.label}: ${item.detail}`).join(" · ") || "None"} /><CoreMeta label="Unresolved" value={readiness.unresolved.map((item) => `${item.label}: ${item.detail}`).join(" · ") || "None"} /></div></CoreCard>
    <div className={styles.coreDetailSection}><div className={styles.coreDetailSectionTitle}>Lifecycle actions</div><div className={styles.queueActionButtons}>{nextState[run.state] ? <CoreAction endpoint={`/api/admin/core/proof-runs/${run.id}/transition`} body={{ nextState: nextState[run.state] }} label={`Mark ${nextState[run.state]}`} confirmText={nextState[run.state] === "complete" ? "Mark this proof run complete?" : undefined} /> : null}{run.state === "complete" && !run.deliveryId ? <CoreAction endpoint={`/api/admin/core/proof-runs/${run.id}/prepare-delivery`} label="Prepare delivery" /> : null}{run.deliveryId ? <Link href={`/admin/deliveries/${run.deliveryId}`} className={styles.inlineLink}>Open delivery</Link> : null}</div></div>
    <CoreAuditTimeline events={events} />
  </CorePage>;
}
