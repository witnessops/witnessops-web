import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buildAdminWizBrief, type AdminWizBriefInput } from "./admin-wiz-brief-model";
import { WizOperatorMark } from "./wiz-operator-mark";
import styles from "./admin-wiz.module.css";

export function AdminWizBrief({ input }: { input: AdminWizBriefInput }) {
  const brief = buildAdminWizBrief(input);
  return (
    <section className={styles.brief} data-state={brief.state} aria-labelledby="admin-wiz-title">
      <div className={styles.avatarShell}>
        <WizOperatorMark state={brief.state} size={104} />
        <span className={styles.onDuty}>Operator companion</span>
      </div>
      <div className={styles.content}>
        <div className={styles.identity}><span className={styles.name}>Wiz</span><span className={styles.role}>First Operator · WOPS-001</span></div>
        <h2 id="admin-wiz-title" className={styles.title}>Current operator brief</h2>
        <p className={styles.headline}>{brief.headline}</p>
        <p className={styles.detail}>{brief.detail}</p>
        <p className={styles.boundaryNote}>Derived from the current admission summary. Wiz does not execute actions automatically.</p>
      </div>
      <Link href={brief.actionHref} className={styles.action}><span>{brief.actionLabel}</span><ArrowRight size={14} aria-hidden /></Link>
    </section>
  );
}

export function AdminWizSidebarIdentity() {
  return <Link href="/admin" className={styles.sidebarIdentity} aria-label="Wiz, First Operator"><WizOperatorMark state="idle" size={34} /><span className={styles.sidebarIdentityText}><strong>Wiz</strong><span>First Operator · WOPS-001</span></span></Link>;
}
