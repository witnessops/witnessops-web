import Link from "next/link";
import { getAdminCoreDashboard } from "@/lib/server/admin-core-spine";
import { CoreCard, CoreHealthGrid, CorePage, CoreState, CoreTable } from "./admin-core-view";
import styles from "./admin.module.css";

export async function AdminCoreDashboard() {
  const dashboard = await getAdminCoreDashboard();
  return <CorePage title="Dashboard" eyebrow="Core operating spine">
    <div className={styles.coreGrid}>
      {Object.entries({
        "Inbox to triage": dashboard.counts.inbox,
        "Review requests": dashboard.counts.reviewRequests,
        "Waiting for customer": dashboard.counts.waitingForCustomer,
        "Needs review": dashboard.counts.needsReview,
        "Ready to deliver": dashboard.counts.readyToDeliver,
        Receipts: dashboard.counts.receipts,
      }).map(([label, value]) => <CoreCard key={label} title={label}><div className={styles.coreCardValue}>{value}</div></CoreCard>)}
    </div>
    <div className={styles.coreSection}>
      <div className={styles.coreSectionHeader}><span className={styles.coreSectionTitle}>Today’s work</span></div>
      <div className={styles.coreMetaGrid}><div className={styles.coreMeta}><span className={styles.coreMetaLabel}>Inbox items</span><span className={styles.coreMetaValue}>{dashboard.today.inbox}</span></div><div className={styles.coreMeta}><span className={styles.coreMetaLabel}>Review requests</span><span className={styles.coreMetaValue}>{dashboard.today.review}</span></div><div className={styles.coreMeta}><span className={styles.coreMetaLabel}>Proof runs</span><span className={styles.coreMetaValue}>{dashboard.today.proofs}</span></div><div className={styles.coreMeta}><span className={styles.coreMetaLabel}>Deliveries</span><span className={styles.coreMetaValue}>{dashboard.today.deliveries}</span></div></div>
    </div>
    <div className={styles.coreSection}><div className={styles.coreSectionHeader}><span className={styles.coreSectionTitle}>Recent proof runs</span><Link href="/admin/proof-runs" className={styles.coreSectionLink}>Open all</Link></div><CoreTable headers={["Run", "Product", "State", "Evidence", "Next action"]} rows={dashboard.recentProofRuns.map((run) => [<Link href={`/admin/proof-runs/${run.id}`} key={run.id}>{run.id}</Link>, run.productContractSnapshot.productName, <CoreState value={run.state} key="state" />, run.evidenceState, run.nextAction])} /></div>
    <div className={styles.coreSection}><div className={styles.coreSectionHeader}><span className={styles.coreSectionTitle}>System health</span><Link href="/admin/settings" className={styles.coreSectionLink}>Settings</Link></div><CoreHealthGrid health={dashboard.health} /></div>
  </CorePage>;
}
