import type { BuyerLocale } from "@/lib/buyer-services";
import { publicProofBundles } from "@/lib/public-proof-bundles";
import styles from "./buyer-homepage.module.css";

export function OwnSystemCase({ locale }: { locale: BuyerLocale }) {
  const pl = locale === "pl";
  const bundle = publicProofBundles.find(item => item.id === "api-authorization-first-run-v1");
  if (!bundle) return null;

  return <article className={styles.ownSystemCase} aria-labelledby="own-system-case-heading">
    <p className={styles.eyebrow}>{pl ? "Własny system · 27 kwietnia 2026" : "Our own system · 27 April 2026"}</p>
    <h3 id="own-system-case-heading">{pl ? "Czy nieuwierzytelnione żądanie dociera do funkcji administracyjnej?" : "Can an unauthenticated request reach an admin function?"}</h3>
    <p>{pl ? "Materiały z witnessops.com zapisują odpowiedź 401 na żądanie HEAD do jednego endpointu administracyjnego oraz odpowiedź 200 z endpointu publicznego. Paczka zachowuje zapisane szczegóły żądań, odpowiedzi i granice tego, co te obserwacje potwierdzają. To nasz własny system, nie realizacja dla klienta." : "The witnessops.com evidence records a 401 response to one HEAD request at an admin endpoint and a 200 response from a public endpoint. The package preserves recorded request details, responses and limits of what those observations establish. This is our own system, not customer work."}</p>
    <details>
      <summary>{pl ? "Zobacz obserwacje i ograniczenia" : "Inspect the observations and limits"}</summary>
      <ul>
        <li>{pl ? "Obserwacja: zapis nagłówków zawiera odpowiedzi 200 i 401. Żądanie GET do endpointu publicznego zwróciło pustą listę chain." : "Observation: the saved headers contain the 200 and 401 responses. A GET request to the public endpoint returned an empty chain list."}</li>
        <li>{pl ? "Materiały: endpoint-headers.txt, public-response.txt i status-matrix.txt w katalogu evidence pobranej paczki." : "Evidence: endpoint-headers.txt, public-response.txt and status-matrix.txt in the download’s evidence folder."}</li>
        <li>{pl ? "Kolejny krok: testy z uwierzytelnieniem i próbami obejścia wymagają osobnego zakresu. Paczka nie dokumentuje naprawy ani ponownego testu." : "Next step: authenticated tests and bypass attempts need a separate scope. No correction or retest is recorded in this package."}</li>
      </ul>
      <p>{pl ? "Historyczna obserwacja dotyczy tylko wymienionych żądań. Odpowiedź 401 na HEAD nie dowodzi ochrony innych metod ani dzisiejszego stanu API. Zgodność hashy plików nie potwierdza prawdziwości obserwacji ani bezpieczeństwa systemu." : "This historical observation covers only the named requests. A 401 on HEAD does not establish protection for other methods or the API’s current state. Matching file hashes does not establish observation truth or system security."}</p>
    </details>
    <a className={styles.sectionLink} href={bundle.artifactPath} download>{pl ? "Pobierz zapisane materiały (ZIP, EN)" : "Download the recorded evidence (ZIP)"}</a>
  </article>;
}
