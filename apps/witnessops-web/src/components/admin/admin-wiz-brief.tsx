import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  buildAdminWizBrief,
  type AdminWizBriefInput,
} from "./admin-wiz-brief-model";
import { WizOperatorMark } from "./wiz-operator-mark";
import styles from "./admin-wiz.module.css";

interface AdminWizBriefProps {
  input: AdminWizBriefInput;
}

export function AdminWizBrief({ input }: AdminWizBriefProps) {
  const brief = buildAdminWizBrief(input);

  return (
    <section
      className={styles.brief}
      data-state={brief.state}
      aria-labelledby="wiz-operator-brief-title"
    >
      <div className={styles.avatarShell}>
        <WizOperatorMark state={brief.state} size={112} />
        <span className={styles.onDuty}>On duty</span>
      </div>

      <div className={styles.content}>
        <div className={styles.identity}>
          <span className={styles.name}>Wiz</span>
          <span className={styles.role}>First Operator · WOPS-001</span>
        </div>
        <h2 id="wiz-operator-brief-title" className={styles.title}>
          Current operator brief
        </h2>
        <p className={styles.headline}>{brief.headline}</p>
        <p className={styles.detail}>{brief.detail}</p>
        <p className={styles.boundaryNote}>
          Derived from the current admission queue summary. Wiz does not execute
          actions automatically.
        </p>
      </div>

      <Link href={brief.actionHref} className={styles.action}>
        <span>{brief.actionLabel}</span>
        <ArrowRight size={14} aria-hidden />
      </Link>
    </section>
  );
}

export function AdminWizSidebarIdentity() {
  return (
    <Link
      href="/admin"
      className={styles.sidebarIdentity}
      aria-label="Wiz, First Operator"
    >
      <WizOperatorMark state="idle" size={38} />
      <span className={styles.sidebarIdentityText}>
        <strong>Wiz</strong>
        <span>First Operator · WOPS-001</span>
      </span>
    </Link>
  );
}
