import type { BuyerLocale } from "@/lib/buyer-services";
import styles from "./simple-homepage.module.css";

const COPY = {
  en: {
    example: "Illustrative example",
    action: "Action",
    refund: "Refund action",
    control: "Required control",
    approval: "Approval required",
    blocked: "Blocked",
    outcome: "Example outcome",
    result: ["Refund without", "approval"],
    limit: "Not a customer test result.",
    description: "Two attempts are blocked; a third bypasses approval in this fictional refund scenario.",
  },
  pl: {
    example: "Przykład poglądowy",
    action: "Akcja",
    refund: "Zwrot płatności",
    control: "Wymagany warunek",
    approval: "Wymaga zatwierdzenia",
    blocked: "Zablokowana",
    outcome: "Przykładowy wynik",
    result: ["Zwrot bez", "zatwierdzenia"],
    limit: "To nie jest wynik testu u klienta.",
    description: "Dwie próby zostają zablokowane; trzecia pomija zatwierdzenie w tym fikcyjnym scenariuszu zwrotu płatności.",
  },
} as const;

export function HeroActionVisual({ locale }: { locale: BuyerLocale }) {
  const text = COPY[locale];
  return <figure className={styles.heroArt} data-home-hero-illustration aria-labelledby="home-hero-example-caption">
    <svg viewBox="0 0 360 336" fill="none" aria-hidden="true" focusable="false">
      <g className={styles.heroArtFrame} strokeWidth="1">
        <path d="M12 26V14h12m312 0h12v12M12 310v12h12m312 0h12v-12" />
        <path d="M28 52h304" className={styles.heroArtMutedLine} />
      </g>
      <text x="28" y="36" className={styles.heroArtEyebrow}>{text.example}</text>

      <path d="M32 104v186" className={styles.heroArtMutedLine} strokeDasharray="2 6" />
      {[0, 1].map((attempt) => <g key={attempt} transform={`translate(0 ${attempt * 78})`}>
        <text x="20" y="112" className={styles.heroArtNumber}>{`0${attempt + 1}`}</text>
        <text x="53" y="112" className={styles.heroArtRouteLabel}>{text.blocked}</text>
        <path d="M32 128h92m0-6v12" className={styles.heroArtStopped} strokeWidth="1.5" />
        <circle cx="32" cy="128" r="3.5" className={styles.heroArtStoppedNode} />
      </g>)}
      <text x="20" y="268" className={styles.heroArtNumberActive}>03</text>
      <path d="M32 284h114" className={styles.heroArtActiveLine} strokeWidth="2" />
      <circle cx="32" cy="284" r="4" className={styles.heroArtActiveNode} />
      <path d="m140 279 8 5-8 5" className={styles.heroArtArrow} />

      <rect x="148" y="76" width="196" height="232" className={styles.heroArtCard} />
      <path d="M148 76h196" className={styles.heroArtActiveLine} strokeWidth="2" />
      <text x="164" y="101" className={styles.heroArtEyebrow}>{text.action}</text>
      <text x="164" y="130" className={styles.heroArtTitle}>{text.refund}</text>
      <path d="M164 148h164" className={styles.heroArtMutedLine} />
      <text x="164" y="177" className={styles.heroArtRouteLabel}>{text.control}</text>
      <text x="164" y="200" className={styles.heroArtBody}>{text.approval}</text>
      <rect x="148" y="228" width="196" height="80" className={styles.heroArtResult} />
      <path d="M148 228h196" className={styles.heroArtResultBorder} />
      <text x="164" y="249" className={styles.heroArtOutcomeLabel}>{text.outcome}</text>
      <text x="164" y="273" className={styles.heroArtBody}>
        <tspan x="164">{text.result[0]}</tspan>
        <tspan x="164" dy="20">{text.result[1]}</tspan>
      </text>
    </svg>
    <figcaption id="home-hero-example-caption" className={styles.heroArtCaption}>
      <strong>{text.example}</strong>
      <span>{text.limit}</span>
      <span className="sr-only">{text.description}</span>
    </figcaption>
  </figure>;
}
