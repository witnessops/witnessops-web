import styles from "./simple-homepage.module.css";

/**
 * Synthetic example record. Moved from the homepage to the review page by the
 * homepage cut (2026-11-13); `#example-record` is the homepage link target.
 */
export function AgentActionExampleRecord({ headline, locale = "en" }: { headline: string; locale?: "en" | "pl" }) {
  const polish = locale === "pl";
  return <section id="example-record" className={styles.exampleRecord} aria-labelledby="example-record-heading" data-agent-action-specimen>
    <p className={styles.eyebrow}>{polish ? "Historyczny przykład syntetyczny jednego działania" : "Historical synthetic one-action example"}</p>
    <h2 id="example-record-heading">{headline}</h2>
    <div className={styles.labels}><span>{polish ? "Przykład formatu dokumentacji" : "Illustrative · shape only"}</span><span>{polish ? "Scenariusz fikcyjny, testu nie wykonano" : "Designed, not executed"}</span></div>
    <dl className={`${styles.specimenRows} crop`}>
      <div><dt>{polish ? "Działanie agenta" : "Consequential action"}</dt><dd><code>refund.issue</code>{polish ? " powyżej ustalonej kwoty przez API płatności. To fikcyjny przykład zwrotu." : " above a set amount, through a payments API — an illustrative action, not an executed one."}<small>{polish ? "Dla każdego zlecenia wspólnie wybieramy jedno działanie i ustalamy zasady zbierania dowodów." : "One action per review. Chosen with you before evidence rules are agreed."}</small></dd></div>
      <div><dt>{polish ? "Konto wykonujące działanie" : "Executing identity"}</dt><dd><code>svc-agent-refunds@example.com</code>{polish ? " to fikcyjny adres konta, z którego agent wykonałby działanie." : " — a reserved example of the identity an agent would run as, not the one that configured it."}</dd></div>
      <div><dt>{polish ? "Uprawnienia i wymagane zgody" : "Permission / authority boundary"}</dt><dd>{polish ? "Role, uprawnienia i zatwierdzenia wymagane do wykonania działania przez dane konto." : "The roles, scopes and approval steps that stand between an identity and an action, as configured."}<small>{polish ? "W rzeczywistym zleceniu sprawdzamy je w konfiguracji. Na potrzeby przykładu nie sprawdzano żadnego systemu." : "Read from configuration under agreed evidence rules. Not assumed; none inspected here."}</small></dd></div>
      <div><dt>{polish ? "Dowody" : "Supporting evidence"}</dt><dd>{polish ? "Eksporty polityk, opis narzędzia, konfiguracja zatwierdzeń i logi działania z uzgodnionego okresu. Każdy materiał jest przypisany do konkretnego ustalenia." : "Policy exports, the tool manifest, approval configuration and action logs for an agreed window — each attached to the claim it supports."}<small>{polish ? "Dowody zbieramy po uzgodnieniu zasad ich obsługi. Dla tego przykładu nie zbierano dowodów." : "Collected only after evidence handling is agreed. No evidence was collected for this illustration."}</small></dd></div>
      <div data-finding-slot="unfilled"><dt>{polish ? "Ustalenie" : "Finding"}</dt><dd>{polish ? "Opis uprawnień konta, wyniku działania i dowodów potwierdzających każde ustalenie." : "A written statement of what an identity is permitted to do relative to an action, and what happens when it does it — with the evidence beside each claim."}<small>{polish ? "Wypełniamy po przeprowadzeniu oceny. Ten przykład nie zawiera ustaleń." : "Written after review. This specimen carries no finding."}</small></dd></div>
      <div><dt>{polish ? "Czego nie udało się ustalić" : "Explicit unknowns"}</dt><dd>{polish ? "Czy działanie wykonano w uzgodnionym okresie? Czy człowiek zatwierdzał je poza sprawdzanymi systemami?" : "What the evidence did not establish — for instance whether an action was exercised in the agreed window, or whether a human step exists outside the systems inspected."}<small>{polish ? "To przykładowe pytania. W rzeczywistym raporcie zapisujemy, czego dowody nie rozstrzygają." : "Named in writing. These are example questions, not results."}</small></dd></div>
    </dl>
    <p className={styles.exampleNote}>{polish ? "Fikcyjny przykład z nazwami przeznaczonymi do dokumentacji. Nie przedstawia danych klienta, wykonanego testu, wyniku weryfikacji ani błędu autoryzacji." : "Illustrative. Reserved documentation names. No customer, execution, verification, authorisation failure or result is shown. This is the shape of a record, not a record."}</p>
  </section>;
}
