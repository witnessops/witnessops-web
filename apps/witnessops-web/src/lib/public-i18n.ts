import { getSku, getSkusByTrack } from "@witnessops/catalog";

export type PublicLocale = "en" | "pl";
export type CanonicalOffsecProductId = string;

export const POLISH_NO_SECRETS_NOTE =
  "Nie wysyłaj haseł, kluczy prywatnych, kluczy API, kodów odzyskiwania, tokenów sesji ani innych sekretów.";

export const POLISH_PUBLIC_NAV = {
  links: [
    { label: "Oferty", href: "/pl/catalog" },
    { label: "Dlaczego WitnessOps", href: "/pl/why-witnessops" },
    { label: "Dokumentacja", href: "/pl/docs" },
    { label: "Weryfikacja", href: "/pl/verify" },
    { label: "Wsparcie", href: "/pl/support" },
  ],
  cta: { label: "Rozpocznij zgłoszenie", href: "/pl/review/request", variant: "primary" },
} as const;

export type PolishOfferCopy = {
  name: string;
  situation: string;
  result: string;
  process: string[];
  deliverables: string[];
  inputs: string[];
  timing: string;
  price: string;
  priceDetail?: string;
  exclusions: string[];
  verification: string;
};

export const POLISH_OFFERS: Record<string, PolishOfferCopy> = {
  "OFFSEC-LOCAL-AUDIT": {
    name: "Kontrola bezpieczeństwa jednego serwera",
    situation: "Potrzebujesz jasnego obrazu stanu jednego autoryzowanego serwera Linux.",
    result: "Otrzymasz raport i podpisany pakiet dowodowy pokazujący, co sprawdzono, jakie dowody wspierają wynik i co pozostaje nierozstrzygnięte.",
    process: [
      "Potwierdzamy zgłoszenie i zakres obejmujący jeden serwer.",
      "Potwierdzamy upoważnienie oraz okno odczytu bez zmian w systemie.",
      "Wykonujemy ograniczone kontrole lokalne bez zbierania sekretów.",
      "Omawiamy wynik z osobą odpowiedzialną za decyzję.",
      "Dostarczamy raport, potwierdzenie, pakiet dowodowy i instrukcję sprawdzenia.",
    ],
    deliverables: ["posture.json", "findings.json", "report.md", "RECEIPT.json", "MANIFEST.sha256", "podpisany pakiet ZIP", "BUYER_WALKTHROUGH.md"],
    inputs: ["Jeden wskazany serwer Linux.", "Autoryzowane okno odczytu bez zmian w systemie.", "Osoba odpowiedzialna za decyzję i podpisane potwierdzenie zakresu.", "Wyłącznie oczyszczone informacje; nigdy hasła, klucze ani tokeny."],
    timing: "W ciągu dwóch dni roboczych od zakończenia autoryzowanego okna zbierania danych.",
    price: "950 € — cena standardowa po sprawdzeniu dopasowania",
    priceDetail: "Dopuszczalny zakres: 500–1 500 €",
    exclusions: ["Bez eksploatacji podatności i testów inwazyjnych.", "Bez zbierania sekretów lub danych uwierzytelniających.", "Bez napraw, chyba że zostaną osobno uzgodnione.", "Bez certyfikacji zgodności i bez gwarancji bezpieczeństwa."],
    verification: "Dostawa zawiera potwierdzenie i instrukcję sprawdzenia, dzięki którym inna osoba może potwierdzić, że pakiet się nie zmienił, oraz zobaczyć, co wynik wspiera, a czego nie wspiera.",
  },
  "OFFSEC-LAUNCH-READY": {
    name: "Kontrola gotowości do uruchomienia",
    situation: "Przygotowujesz uruchomienie i potrzebujesz zapisu stanu przed zmianą i po niej.",
    result: "Otrzymasz raport gotowości i podpisany pakiet dowodowy pokazujący, co się zmieniło, co sprawdzono i co nadal wymaga decyzji.",
    process: ["Potwierdzamy zgłoszenie, jeden host, stan bazowy i okno wersji kandydującej.", "Potwierdzamy upoważnienie, skrót wydania i osobę decyzyjną.", "Zapisujemy zatwierdzony stan bazowy i kandydujący za pomocą ograniczonych kontroli tylko do odczytu.", "Omawiamy różnice, ustalenia i nierozstrzygnięte elementy.", "Dostarczamy raport, potwierdzenie, pakiet dowodowy i instrukcję sprawdzenia."],
    deliverables: ["posture.json", "findings.json", "drift.json", "report.md", "podpisany pakiet ZIP"],
    inputs: ["Jeden wskazany serwer Linux przeznaczony do uruchomienia.", "Zatwierdzony stan bazowy i wersja kandydująca w uzgodnionym oknie.", "Jeden skrót SHA-256 artefaktu wydania i osoba decyzyjna.", "Podpisane upoważnienie i wyłącznie oczyszczone informacje."],
    timing: "Cztery dni robocze od zebrania danych wersji kandydującej.",
    price: "2 500–7 500 €",
    priceDetail: "4 500 € — cena standardowa po sprawdzeniu dopasowania",
    exclusions: ["Bez zatwierdzenia uruchomienia i bez gwarancji bezpieczeństwa.", "Bez napraw i ponownego testu, chyba że zostaną osobno uzgodnione.", "Bez dowolnego przeglądu panelu sterowania chmurą lub kodu źródłowego.", "Bez certyfikacji zgodności."],
    verification: "Potwierdzenie i instrukcja pozwalają sprawdzić relację między stanem bazowym a wersją kandydującą, powiązanie z wydaniem i wskazane ograniczenia. Wynik nie jest zatwierdzeniem uruchomienia.",
  },
  "OFFSEC-CUSTODY-OPS": {
    name: "Przegląd kontroli nad kluczami, dostępem i przekazaniem odpowiedzialności",
    situation: "Chcesz ocenić udokumentowanie kontroli operacyjnych bez ujawniania kluczy ani środków.",
    result: "Otrzymasz raport stanu, ustalenia i podpisany pakiet dowodowy pokazujący dostarczone obserwacje kontroli oraz elementy pozostające poza zakresem.",
    process: ["Potwierdzamy pytanie operacyjne i ograniczony zakres.", "Potwierdzamy upoważnienie oraz format oczyszczonych danych z nieprzejrzystymi identyfikatorami.", "Tworzymy pakiet obserwacji kontroli tylko do odczytu, bez łączenia z portfelami.", "Sprawdzamy kompletność, ustalenia i ograniczenia.", "Dostarczamy raport, potwierdzenie, pakiet dowodowy i instrukcję weryfikacji offline."],
    deliverables: ["posture.json", "findings.json", "report.md", "podpisany pakiet ZIP"],
    inputs: ["Jedno wskazane środowisko operacyjne.", "Osoba decyzyjna i podpisane upoważnienie.", "Zatwierdzony przez klienta, oczyszczony eksport obserwacji kontroli.", "Bez kluczy, fraz seed, sald, adresów portfeli i danych transakcji."],
    timing: "Termin dostawy potwierdzamy podczas wstępnej rozmowy bez sekretów.",
    price: "3 000–15 000 €",
    exclusions: ["Bez przechowywania lub przemieszczania środków.", "Bez kluczy, fraz seed, sald i połączeń z aktywnymi portfelami.", "Bez wniosków o wypłacalności, bezpieczeństwie, stanie prawnym lub zgodności.", "Bez napraw, chyba że zostaną osobno uzgodnione."],
    verification: "Dostawa wskazuje potwierdzenie i weryfikator offline, aby można było sprawdzić dopuszczone obserwacje i ograniczenia. Nie potwierdza pieczy, wypłacalności ani uprawnienia do transakcji.",
  },
  "OFFSEC-ACCESS-REMOVED": {
    name: "Potwierdzenie usunięcia dostępu",
    situation: "Użytkownik, dostawca lub usługa nie powinni już mieć dostępu, a Ty potrzebujesz ograniczonego zapisu tego, co sprawdzono.",
    result: "Otrzymasz podpisany pakiet przed i po zmianie, pokazujący wskazane ścieżki dostępu, zaobserwowany wynik oraz pozostały lub nierozstrzygnięty zakres.",
    process: ["Potwierdzamy jedno zdarzenie usunięcia dostępu, środowisko, podmioty i ścieżki.", "Potwierdzamy podpisane upoważnienie i format oczyszczonego eksportu.", "Zestawiamy obserwacje przed i po bez zmiany dostępu.", "Omawiamy ustalenia i nierozstrzygnięte ścieżki z osobą decyzyjną.", "Dostarczamy raport, potwierdzenie, pakiet dowodowy i instrukcję weryfikacji offline."],
    deliverables: ["zapis obserwacji dostępu przed i po", "findings.json", "report.md", "podpisane potwierdzenie i manifest dowodów", "pakiet ZIP do weryfikacji offline", "BUYER_WALKTHROUGH.md"],
    inputs: ["Jedno wskazane środowisko i jedno zdarzenie usunięcia dostępu.", "Nieprzejrzyste identyfikatory podmiotów i jawnie wskazane ścieżki dostępu.", "Podpisane upoważnienie klienta i oczyszczone obserwacje przed i po.", "Bez danych uwierzytelniających, sekretów i surowych danych tożsamości."],
    timing: "W ciągu dwóch dni roboczych od otrzymania zatwierdzonych eksportów i podpisanego upoważnienia.",
    price: "500–1 500 €",
    exclusions: ["Bez cofania dostępu i bez zmian w systemie.", "Bez sprawdzania danych uwierzytelniających i bez połączenia z systemem tożsamości.", "Bez twierdzenia, że usunięto każdą możliwą ścieżkę dostępu lub wykluczono naruszenie.", "Bez napraw, chyba że zostaną osobno uzgodnione."],
    verification: "Potwierdzenie i weryfikator offline pokazują kompletność wskazanego porównania przed i po. Nie dowodzą usunięcia wszystkich ukrytych ścieżek ani braku naruszenia.",
  },
  "OFFSEC-INCIDENT-READY": {
    name: "Przegląd gotowości na incydent",
    situation: "Chcesz wiedzieć, czy zespół jest przygotowany na jeden konkretnie nazwany incydent.",
    result: "Otrzymasz raport gotowości i podpisany pakiet dowodowy oddzielający obserwacje, niewiadome i elementy poza zakresem.",
    process: ["Potwierdzamy nazwany incydent, środowisko i pytanie o gotowość.", "Potwierdzamy upoważnienie i granicę oczyszczonych obserwacji.", "Przeglądamy zakres incydentu, oś czasu, zabezpieczenie materiału, gotowość do ograniczenia skutków i komunikacji.", "Omawiamy ustalenia, braki i ograniczenia z osobą decyzyjną.", "Dostarczamy raport, potwierdzenie, pakiet dowodowy i instrukcję weryfikacji offline."],
    deliverables: ["raport gotowości", "ciąg potwierdzeń", "podpisany pakiet ZIP"],
    inputs: ["Jeden nazwany incydent i środowisko.", "Osoba decyzyjna i podpisane upoważnienie.", "Oczyszczone obserwacje gotowości z nieprzejrzystymi odwołaniami do dowodów.", "Bez surowych logów, materiałów do eksploatacji, sekretów, danych uwierzytelniających i danych klientów."],
    timing: "Termin dostawy potwierdzamy podczas wstępnej rozmowy bez sekretów.",
    price: "5 000–25 000 €",
    exclusions: ["Bez hack-back, eksploatacji podatności i testów destrukcyjnych.", "Bez dowodzenia incydentem na żywo i bez zmian ograniczających skutki.", "Bez twierdzeń o naruszeniu, przyczynie źródłowej lub atrybucji.", "Bez napraw oraz wniosków prawnych lub zgodnościowych."],
    verification: "Potwierdzenie i nazwany weryfikator offline pozwalają sprawdzić zakres gotowości i braki. Nie potwierdzają naruszenia, przyczyny, atrybucji, opanowania incydentu ani naprawy.",
  },
  "OFFSEC-PILOT": {
    name: "Pilotaż bezpieczeństwa dla 10 serwerów",
    situation: "Chcesz sprawdzić proces na dokładnie dziesięciu wskazanych serwerach.",
    result: "Otrzymasz dziesięć pakietów podrzędnych, zbiorczy manifest i potwierdzenie oraz omówienie wyników dla hostów i całości.",
    process: ["Potwierdzamy dziesięć wskazanych serwerów, jednego operatora, osobę decyzyjną i ramy czasowe.", "Potwierdzamy podpisany zakres oraz granicę tylko do odczytu, bez wykrywania zasobów.", "Wykonujemy etap bazowy i kandydujący dla każdego wskazanego serwera.", "Omawiamy dziesięć wyników podrzędnych i zbiorcze braki.", "Dostarczamy raport zbiorczy, potwierdzenie, pakiety dowodowe i instrukcję sprawdzenia."],
    deliverables: ["podpisane upoważnienie i decyzja dopuszczająca pilotaż", "macierz dwóch przebiegów dla dziesięciu hostów", "dziesięć podpisanych pakietów podrzędnych", "zbiorczy manifest dowodów", "podpisane zbiorcze potwierdzenie pilotażu", "zbiorczy weryfikator offline", "report.md", "BUYER_WALKTHROUGH.md"],
    inputs: ["Dokładnie dziesięć wskazanych serwerów.", "Jeden upoważniony operator i jedna osoba decyzyjna.", "Podpisany zakres z oknem nie dłuższym niż czternaście dni.", "Wyłącznie oczyszczone informacje; bez danych uwierzytelniających, kluczy, logów i zrzutów ekranu."],
    timing: "Termin dostawy potwierdzamy podczas wstępnej rozmowy bez sekretów.",
    price: "Stała równowartość w EUR — wycena po uzgodnieniu zakresu",
    exclusions: ["Bez wykrywania zasobów, monitorowania i utrzymywania dostępu.", "Bez zbierania sekretów lub danych uwierzytelniających, eksploatacji i napraw.", "Bez zatwierdzenia uruchomienia, certyfikacji zgodności i twierdzenia, że host jest bezpieczny.", "Bez programu wykraczającego poza zakres dziesięciu serwerów."],
    verification: "Zbiorcze potwierdzenie i weryfikator odtwarzają dziesięć pakietów podrzędnych oraz ich powiązania. Nie dowodzą, że którykolwiek host jest bezpieczny, ani nie tworzą uprawnienia do monitorowania.",
  },
};

const POLISH_TRANSLATED_PATHS = [
  /^\/$/,
  /^\/catalog(?:\/(?:offsec-local-audit|offsec-launch-ready|offsec-custody-ops|offsec-access-removed|offsec-incident-ready|offsec-pilot))?$/,
  /^\/review\/request(?:\/confirmed)?$/,
  /^\/why-witnessops$/,
  /^\/docs$/,
  /^\/verify$/,
  /^\/support$/,
  /^\/contact$/,
] as const;

export function polishOfferRequestHref(productId: CanonicalOffsecProductId): string {
  const sku = getSku(productId);
  if (!sku) return "/pl/review/request";

  const params = new URLSearchParams({
    productId: sku.id,
    offer: sku.name,
  });
  return `/pl/review/request?${params.toString()}`;
}

export function getPolishSkus() {
  return getSkusByTrack("offsec_proof").filter((sku) => Boolean(POLISH_OFFERS[sku.id]));
}

export function isPolishPath(pathname: string): boolean {
  return pathname === "/pl" || pathname.startsWith("/pl/");
}

export function toEnglishPath(pathname: string): string {
  if (!isPolishPath(pathname)) return pathname || "/";
  const stripped = pathname.slice(3);
  return stripped || "/";
}

export function toPolishPath(pathname: string): string {
  const englishPath = toEnglishPath(pathname);
  if (POLISH_TRANSLATED_PATHS.some((pattern) => pattern.test(englishPath))) {
    return englishPath === "/" ? "/pl" : `/pl${englishPath}`;
  }
  if (englishPath.startsWith("/docs/")) return "/pl/docs";
  return "/pl";
}

export function localizedPath(pathname: string, locale: PublicLocale): string {
  return locale === "pl" ? toPolishPath(pathname) : toEnglishPath(pathname);
}

export function localizedHref(pathname: string, search: string, locale: PublicLocale): string {
  const target = localizedPath(pathname, locale);
  const preservesPage = toEnglishPath(target) === toEnglishPath(pathname);
  const normalizedSearch = search && !search.startsWith("?") ? `?${search}` : search;
  return preservesPage ? `${target}${normalizedSearch}` : target;
}
