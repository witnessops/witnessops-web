import type { BuyerLocale } from '@/lib/buyer-services';
import styles from './hero-gap.module.css';

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
        <path d="M16 108H238 M362 108H577" className={styles.track} />
        <circle cx="300" cy="108" r="53" className={styles.expectedPoint} />
        <path d="M16 108H238" pathLength="1" className={styles.traceLeft} />
        <path d="M362 108H577" pathLength="1" className={styles.traceRight} />
        <circle cx="16" cy="108" r="4" className={styles.start} />
        <path d="m575 101 13 7-13 7Z" className={styles.arrow} />
        <circle cx="300" cy="108" r="53" className={styles.missingPoint} data-hero-gap-point />
        <path d="M300 170V224" pathLength="1" className={styles.inspectionMark} />
      </svg>
      <svg className={`${styles.trace} ${styles.traceMobile}`} data-hero-trace="vertical" viewBox="0 0 320 220" aria-hidden="true">
        <path d="M160 8V54 M160 146V208" className={styles.track} />
        <circle cx="160" cy="100" r="38" className={styles.expectedPoint} />
        <path d="M160 8V54" pathLength="1" className={styles.traceLeft} />
        <path d="M160 146V208" pathLength="1" className={styles.traceRight} />
        <circle cx="160" cy="8" r="3" className={styles.start} />
        <path d="m154 206 6 10 6-10Z" className={styles.arrow} />
        <circle cx="160" cy="100" r="38" className={styles.missingPoint} data-hero-gap-point />
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
