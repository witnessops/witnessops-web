import type { BuyerLocale } from '@/lib/buyer-services';
import styles from './hero-gap.module.css';

/** Decorative inspection motif. An empty centre never represents approval granted. */
function Checkpoint({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return <svg x={x - 53 * scale} y={y - 53 * scale} width={106 * scale} height={106 * scale} viewBox="-53 -53 106 106" overflow="visible" data-hero-checkpoint>
    <circle r="53" className={styles.expectedPoint} />
    <circle r="44" className={styles.checkpointRing} />
    <circle r="34" className={styles.checkpointCore} />
    <path d="M-7-49H7 M49-7V7 M7 49H-7 M-49 7V-7" className={styles.evidenceTicks} />
    <circle r="53" className={styles.missingPoint} data-hero-gap-point />
  </svg>;
}

function RefundToken({ mobile = false }: { mobile?: boolean }) {
  return <g className={mobile ? styles.tokenMobile : styles.tokenDesktop} data-hero-token>
    <path d={mobile ? 'M0-19V-35' : 'M-19 0H-40'} className={styles.tokenTrail} />
    <circle r="16" className={styles.tokenDisc} />
    <text textAnchor="middle" y="6" className={styles.tokenCurrency}>€</text>
  </g>;
}

/** An authored illustration, not a receipt, execution result or verifier verdict. */
export function HeroGap({ locale = 'en' }: { locale?: BuyerLocale }) {
  const pl = locale === 'pl';
  return <figure className={styles.gap} data-hero-gap data-review-finding aria-label={pl ? 'Fikcyjny zwrot bez dowodu zatwierdzenia' : 'Fictional refund with approval not evidenced'}>
    <div className={styles.context} data-hero-context>
      <span>{pl ? 'Prośba klienta' : 'Customer request'}</span>
      <span className={styles.contextConnector} aria-hidden="true" />
      <span>{pl ? 'Narzędzie zwrotów' : 'Refund tool'}</span>
    </div>
    <p className={styles.action}>{pl ? 'ZWROT' : 'REFUND'} <strong>{pl ? '4 800 €' : '€4,800'}</strong></p>
    <div className={styles.traceStage}>
      <p className={styles.policy} data-hero-policy>{pl ? 'Wymagane zatwierdzenie' : 'Approval required'}</p>
      <svg className={`${styles.trace} ${styles.traceDesktop}`} data-hero-trace="horizontal" viewBox="0 0 600 224" aria-hidden="true">
        <path d="M300 27V46" className={styles.policyGuide} />
        <path d="M16 100H160L176 108H424L440 116H577" className={styles.track} data-hero-route />
        <path d="M16 100H160L176 108H300" pathLength="1" className={styles.traceLeft} />
        <path d="M300 108H424L440 116H577" pathLength="1" className={styles.traceRight} />
        <circle cx="16" cy="100" r="4" className={styles.start} />
        <path d="m575 109 13 7-13 7Z" className={styles.arrow} />
        <Checkpoint x={300} y={108} />
        <RefundToken />
        <path d="M300 162V224" pathLength="1" className={styles.inspectionMark} />
      </svg>
      <svg className={`${styles.trace} ${styles.traceMobile}`} data-hero-trace="vertical" viewBox="0 0 320 220" aria-hidden="true">
        <path d="M160 8V208" className={styles.track} />
        <path d="M160 8V100" pathLength="1" className={styles.traceLeft} />
        <path d="M160 100V208" pathLength="1" className={styles.traceRight} />
        <circle cx="160" cy="8" r="3" className={styles.start} />
        <path d="m154 206 6 10 6-10Z" className={styles.arrow} />
        <Checkpoint x={160} y={100} scale={38 / 53} />
        <RefundToken mobile />
      </svg>
    </div>
    <div className={styles.findingSurface} data-hero-finding>
      <p className={styles.finding}><span className={styles.findingMark} aria-hidden="true" />{pl ? 'Brak dowodu zatwierdzenia' : 'Approval not evidenced.'}</p>
      <dl className={styles.facts}>
        <div><dt>{pl ? 'Oczekiwane' : 'Expected'}</dt><dd>{pl ? 'Zatwierdzenie przed zwrotem' : 'Approval before refund'}</dd></div>
        <div><dt>{pl ? 'Obserwowane' : 'Observed'}</dt><dd>{pl ? 'Zarejestrowany zwrot' : 'Refund recorded'}</dd></div>
      </dl>
    </div>
    <figcaption className={styles.disclosure}>{pl ? 'Fikcyjny przykład · Nie testowano systemu' : 'Fictional example · No system tested'}</figcaption>
  </figure>;
}
