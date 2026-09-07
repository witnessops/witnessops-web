import Link from "next/link";
import { getAdminCoreDashboard } from "@/lib/server/admin-core-spine";
import { buildAdmissionQueueView } from "@/lib/server/admission-queue";
import { CoreCard, CoreHealthGrid, CorePage, CoreState, CoreTable } from "./admin-core-view";
import { AdminWizBrief } from "./admin-wiz-brief";
import styles from "./admin.module.css";
import { getAdminPageActor } from "@/lib/server/admin-page-session";

export async function AdminCoreDashboard() {
  const actor = await getAdminPageActor();
  const dashboard = await getAdminCoreDashboard(actor);
  const queue = await buildAdmissionQueueView(actor).catch(() => null);
  return <CorePage title="Dashboard" eyebrow="Core operating spine">
    {queue ? <AdminWizBrief input={{ total: queue.summary.total, ready: queue.summary.ready, reconciliationPending: queue.summary.reconciliationPending, divergent: queue.summary.divergent }} /> : null}
    <div className={styles.coreGrid}>
      {[
        { label: "Inbox to triage", value: dashboard.counts.inbox, href: "/admin/inbox" },
        { label: "Review requests", value: dashboard.counts.reviewRequests, href: "/admin/review-requests" },
        { label: "Waiting for customer", value: dashboard.counts.waitingForCustomer, href: "/admin/review-requests?stage=needs_customer_information" },
        { label: "Needs review", value: dashboard.counts.needsReview, href: "/admin/proof-runs" },
        { label: "Ready to deliver", value: dashboard.counts.readyToDeliver, href: "/admin/deliveries" },
        { label: "Receipts", value: dashboard.counts.receipts, href: "/admin/receipts" },
      ].map(({ label, value, href }) => <CoreCard key={label} title={label} href={href}><div className={styles.coreCardValue}>{value}</div></CoreCard>)}
    </div>
    <div className={styles.coreSection}>
      <div className={styles.coreSectionHeader}><span className={styles.coreSectionTitle}>Enquiries to move forward</span><Link href="/admin/review-requests" className={styles.coreSectionLink}>All requests</Link></div>
      <p className={styles.coreFormNote}>Open requests with the oldest updates first.</p>
      <CoreTable scrollLabel="Enquiry next actions" emptyMessage="No open enquiries need qualification. Check Inbox for new requests." headers={["Customer", "Next action", "Timing", "Stage"]} rows={dashboard.nextReviewRequests.map((request) => [<Link href={`/admin/review-requests/${request.id}`} key={request.id}>{request.customerName}</Link>, request.nextAction, request.timing || "Not recorded", <CoreState value={request.state} key="state" />])} />
    </div>
    <div className={styles.coreSection}>
      <div className={styles.coreSectionHeader}><span className={styles.coreSectionTitle}>Today’s work</span></div>
      <div className={styles.coreMetaGrid}><div className={styles.coreMeta}><span className={styles.coreMetaLabel}>Inbox items</span><span className={styles.coreMetaValue}>{dashboard.today.inbox}</span></div><div className={styles.coreMeta}><span className={styles.coreMetaLabel}>Review requests</span><span className={styles.coreMetaValue}>{dashboard.today.review}</span></div><div className={styles.coreMeta}><span className={styles.coreMetaLabel}>Proof runs</span><span className={styles.coreMetaValue}>{dashboard.today.proofs}</span></div><div className={styles.coreMeta}><span className={styles.coreMetaLabel}>Deliveries</span><span className={styles.coreMetaValue}>{dashboard.today.deliveries}</span></div></div>
    </div>
    <div className={styles.coreSection}><div className={styles.coreSectionHeader}><span className={styles.coreSectionTitle}>Recent proof runs</span><Link href="/admin/proof-runs" className={styles.coreSectionLink}>Open all</Link></div><CoreTable headers={["Run", "Product", "State", "Evidence", "Next action"]} rows={dashboard.recentProofRuns.map((run) => [<Link href={`/admin/proof-runs/${run.id}`} key={run.id}>{run.id}</Link>, run.productContractSnapshot.productName, <CoreState value={run.state} key="state" />, run.evidenceState, run.nextAction])} /></div>
    <div className={styles.coreSection}><div className={styles.coreSectionHeader}><span className={styles.coreSectionTitle}>System health</span><Link href="/admin/settings" className={styles.coreSectionLink}>Settings</Link></div><CoreHealthGrid health={dashboard.health} /></div>
  </CorePage>;
}
