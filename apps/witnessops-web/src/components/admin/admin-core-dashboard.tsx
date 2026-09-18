import Link from "next/link";
import { getAdminCoreDashboard } from "@/lib/server/admin-core-spine";
import { CoreCard, CorePage, CoreState, CoreTable } from "./admin-core-view";
import styles from "./admin.module.css";
import { getAdminPageActor } from "@/lib/server/admin-page-session";

export async function AdminCoreDashboard() {
  const actor = await getAdminPageActor();
  const dashboard = await getAdminCoreDashboard(actor);
  return <CorePage title="Overview" eyebrow="WitnessOps operations" actions={<Link href="/admin/settings" className={styles.coreSectionLink}>Settings &amp; health</Link>}>
    <section className={styles.coreSection} aria-labelledby="website-activity-title">
      <div className={styles.coreSectionHeader}><h2 id="website-activity-title" className={styles.coreSectionTitle}>Website activity</h2><a href="https://dash.cloudflare.com/" target="_blank" rel="noopener noreferrer" className={styles.coreSectionLink}>Open Cloudflare ↗</a></div>
      <div className={styles.dashboardSummary}>
        <strong>Reporting not connected to this dashboard</strong>
        <p>Open Web Analytics in Cloudflare for available page views, visits and page performance. No visitor counts have been imported here.</p>
        <p>Live visitors, button clicks and time on page are not measured by this dashboard.</p>
      </div>
    </section>
    <div className={styles.coreGrid}>
      {[
        { label: "Inbox to triage", value: dashboard.counts.inbox, href: "/admin/inbox" },
        { label: "Review requests", value: dashboard.counts.reviewRequests, href: "/admin/review-requests" },
        { label: "Needs review", value: dashboard.counts.needsReview, href: "/admin/proof-runs" },
        { label: "Deliveries to review", value: dashboard.counts.readyToDeliver, href: "/admin/deliveries" },
      ].map(({ label, value, href }) => <CoreCard key={label} title={label} href={href}><div className={styles.coreCardValue}>{value}</div></CoreCard>)}
    </div>
    <div className={styles.coreSection}>
      <div className={styles.coreSectionHeader}><span className={styles.coreSectionTitle}>Enquiries to move forward</span><Link href="/admin/review-requests" className={styles.coreSectionLink}>All requests</Link></div>
      <p className={styles.adminServiceSectionNote}>Open requests with the oldest updates first. <Link href="/admin/review-requests?stage=needs_customer_information">Waiting for customer: {dashboard.counts.waitingForCustomer}</Link></p>
      <CoreTable scrollLabel="Enquiry next actions" emptyMessage="No open enquiries need qualification. Check Inbox for new requests." headers={["Customer", "Next action", "Timing", "Stage"]} rows={dashboard.nextReviewRequests.map((request) => [<Link href={`/admin/review-requests/${request.id}`} key={request.id}>{request.customerName}</Link>, request.nextAction, request.timing || "Not recorded", <CoreState value={request.state} key="state" />])} />
    </div>
    {dashboard.recentProofRuns.length > 0 ? <div className={styles.coreSection}><div className={styles.coreSectionHeader}><span className={styles.coreSectionTitle}>Recent proof runs</span><Link href="/admin/proof-runs" className={styles.coreSectionLink}>Open all</Link></div><CoreTable headers={["Run", "Product", "State", "Evidence", "Next action"]} rows={dashboard.recentProofRuns.map((run) => [<Link href={`/admin/proof-runs/${run.id}`} key={run.id}>{run.id}</Link>, run.productContractSnapshot.productName, <CoreState value={run.state} key="state" />, run.evidenceState, run.nextAction])} /></div> : null}
    <section className={styles.coreSection} aria-labelledby="automation-title">
      <div className={styles.coreSectionHeader}><h2 id="automation-title" className={styles.coreSectionTitle}>Automations</h2><a href="https://n8n-fra.witnessops.com/" target="_blank" rel="noopener noreferrer" className={styles.coreSectionLink}>Open n8n ↗</a></div>
      <div className={styles.dashboardSummary}><p>Manage workflows in n8n. This is a shortcut; workflow status and execution history are not connected here.</p></div>
    </section>
    <div className={styles.dashboardLinks}><Link href="/admin/queue">Admission queue</Link><Link href="/admin/reports">Reconciliation reports</Link><Link href="/admin/receipts">Receipts</Link></div>
  </CorePage>;
}
