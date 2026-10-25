import type { HealthCardView, HealthSummaryModel } from "@/lib/admin/admin-health-display";
import { healthSummary } from "@/lib/admin/admin-health-display";
import { HealthGlyph } from "./admin-health-glyph";
import styles from "./admin.module.css";

function HealthBadge({ kind, label }: { kind: HealthCardView["kind"]; label: string }) {
  return (
    <span className={styles.healthBadge} data-kind={kind}>
      <HealthGlyph kind={kind} />
      <span>{label}</span>
    </span>
  );
}

export function AdminHealthSummary({ cards }: { cards: HealthCardView[] }) {
  const summary: HealthSummaryModel = healthSummary(cards);
  return (
    <div className={styles.healthSummary}>
      <span>{summary.integrationsLabel}</span>
      {summary.badges.map((badge) => <HealthBadge key={badge.kind} kind={badge.kind} label={badge.label} />)}
      <span>{summary.connectedText}</span>
    </div>
  );
}

export function AdminHealthGrid({ cards }: { cards: HealthCardView[] }) {
  return (
    <div className={styles.coreHealthGrid}>
      {cards.map((card) => (
        <article className={styles.coreCard} data-kind={card.kind} key={card.key}>
          <div className={styles.coreCardTitle}>{card.title}</div>
          <HealthBadge kind={card.kind} label={card.label} />
          <p className={styles.coreDetail}>{card.detail}</p>
          {card.lastError ? <p className={styles.queueWarning}>{card.lastError}</p> : null}
          <p className={styles.healthEvidence}>{card.evidence}</p>
        </article>
      ))}
    </div>
  );
}
