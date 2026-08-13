import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CoreAction, ProductApproveForm, ReviewNoteForm } from "../../../../../components/admin/admin-core-ui";
import { CoreAuditTimeline, CoreCard, CoreMeta, CorePage, CoreState } from "../../../../../components/admin/admin-core-view";
import { getCustomer, getReviewRequest, listAuditEvents, listProductContracts } from "@/lib/server/admin-core-spine";
import styles from "../../../../../components/admin/admin.module.css";
import { getAdminPageActor } from "@/lib/server/admin-page-session";

export const metadata: Metadata = { title: "Admin — Review Request", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
interface RouteContext { params: Promise<{ id: string }> }

export default async function AdminReviewRequestDetailPage({ params }: RouteContext) {
  const { id } = await params;
  const actor = await getAdminPageActor();
  const request = await getReviewRequest(id, actor);
  if (!request) notFound();
  const [customer, products, events] = await Promise.all([getCustomer(request.customerId, actor), listProductContracts(), listAuditEvents(request.lineageId, actor)]);
  return <CorePage title={request.id} eyebrow="Review request">
    <div className={styles.coreMetaGrid}><CoreMeta label="State" value={<CoreState value={request.state} />} /><CoreMeta label="Customer" value={customer ? <Link href={`/admin/customers/${customer.id}`} className={styles.inlineLink}>{customer.name}</Link> : request.customerId} /><CoreMeta label="Gmail thread" value={request.originatingGmailThreadId} /><CoreMeta label="Owner" value={request.owner || "Unassigned"} /><CoreMeta label="Next action" value={request.nextAction} /></div>
    <div className={styles.coreDetailSection}><div className={styles.coreDetailSectionTitle}>Request</div><div className={styles.coreText}>{request.requestText}</div></div>
    <div className={styles.coreMetaGrid}><CoreMeta label="Scope" value={request.scope} /><CoreMeta label="Workflow boundary" value={request.workflowBoundary} /><CoreMeta label="Authority boundary" value={request.authorityBoundary} /><CoreMeta label="Desired outcome" value={request.desiredOutcome} /><CoreMeta label="Timing" value={request.timing} /><CoreMeta label="Evidence posture" value={request.evidencePosture} /><CoreMeta label="Commercial status" value={request.commercialStatus} /><CoreMeta label="Missing information" value={request.missingInformation.join(", ") || "None recorded"} /></div>
    <div className={styles.coreDetailSection}><div className={styles.coreDetailSectionTitle}>Lifecycle</div><div className={styles.queueActionButtons}>{request.state === "new" ? <CoreAction endpoint={`/api/admin/core/review-requests/${request.id}/transition`} body={{ nextState: "triage" }} label="Start triage" /> : null}{request.state === "triage" ? <CoreAction endpoint={`/api/admin/core/review-requests/${request.id}/transition`} body={{ nextState: "fit_review" }} label="Start fit review" /> : null}{request.state === "fit_review" ? <CoreAction endpoint={`/api/admin/core/review-requests/${request.id}/transition`} body={{ nextState: "fit_confirmed" }} label="Confirm fit" /> : null}{request.state === "fit_confirmed" ? <ProductApproveForm reviewRequestId={request.id} products={products} /> : null}{request.proofRunId ? <Link href={`/admin/proof-runs/${request.proofRunId}`} className={styles.inlineLink}>Open proof run</Link> : null}</div></div>
    <CoreCard title="Internal notes"><div className={styles.coreText}>{request.internalNotes.map((note) => `${note.createdAt} · ${note.author}\n${note.body}`).join("\n\n") || "No internal notes."}</div><ReviewNoteForm reviewRequestId={request.id} /></CoreCard>
    <CoreCard title="Customer-visible reply drafts"><div className={styles.coreText}>{request.customerReplyDrafts.map((draft) => `${draft.status} · ${draft.subject}\n${draft.body}`).join("\n\n") || "No customer-visible draft exists."}</div></CoreCard>
    <CoreAuditTimeline events={events} />
  </CorePage>;
}
