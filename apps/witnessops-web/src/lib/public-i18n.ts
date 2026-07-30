import { getSku, getSkusByTrack } from "@witnessops/catalog";
import { buyerServiceByProductId } from "@/lib/buyer-services";

export type PublicLocale = "en" | "pl";
export type CanonicalOffsecProductId = string;

export const POLISH_NO_SECRETS_NOTE =
  "Nie wysyłaj haseł, kluczy prywatnych, kluczy API, kodów odzyskiwania, tokenów sesyjnych ani innych sekretów.";

export const POLISH_PUBLIC_NAV = {
  links: [
    { label: "Usługi", href: "/pl/catalog" },
    { label: "Customer Security Review", href: "/pl/customer-security-review" },
    { label: "Biblioteka", href: "/pl/library" },
    { label: "Dlaczego WitnessOps", href: "/pl/why-witnessops" },
  ],
  cta: { label: "Rozpocznij przegląd", href: "/pl/review/request", variant: "primary" },
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
    name: "Przegląd bezpieczeństwa pojedynczego serwera",
    situation: "Potrzebujesz rzetelnej oceny stanu bezpieczeństwa wskazanego serwera Linux.",
    result: "Otrzymasz raport i podpisany pakiet dowodowy pokazujący, co sprawdzono, jakie dowody wspierają wynik i co pozostaje nierozstrzygnięte.",
    process: [
      "Ustalamy zakres obejmujący jeden wskazany serwer.",
      "Ustalamy upoważnienie oraz okno odczytu bez zmian w systemie.",
      "Wykonujemy uzgodnione kontrole lokalne bez zbierania danych poufnych.",
      "Omawiamy wynik z osobą odpowiedzialną za decyzję.",
      "Dostarczamy raport, podpisany zapis wykonania, pakiet dowodowy i instrukcję weryfikacji.",
    ],
    deliverables: ["posture.json", "findings.json", "report.md", "RECEIPT.json", "MANIFEST.sha256", "podpisany pakiet ZIP", "BUYER_WALKTHROUGH.md"],
    inputs: ["Jeden wskazany serwer Linux.", "Autoryzowane okno odczytu bez zmian w systemie.", "Osoba odpowiedzialna za decyzję i podpisane potwierdzenie zakresu.", "Wyłącznie informacje pozbawione danych poufnych; nigdy hasła, klucze ani tokeny."],
    timing: "W ciągu dwóch dni roboczych od zakończenia autoryzowanego okna zbierania danych.",
    price: "950 € — standardowa cena po wstępnym potwierdzeniu zakresu",
    priceDetail: "Dopuszczalny zakres: 500–1 500 €",
    exclusions: ["Bez eksploatacji podatności i testów inwazyjnych.", "Bez zbierania sekretów lub danych uwierzytelniających.", "Bez napraw, chyba że zostaną osobno uzgodnione.", "Bez certyfikacji zgodności i bez gwarancji bezpieczeństwa."],
    verification: "Dostawa zawiera podpisany zapis wykonania i instrukcję weryfikacji, dzięki którym inna osoba może sprawdzić, czy pakiet się nie zmienił, oraz zobaczyć, co wynik wspiera, a czego nie wspiera.",
  },
  "OFFSEC-LAUNCH-READY": {
    name: "Ocena gotowości do wdrożenia",
    situation: "Przygotowujesz wdrożenie i potrzebujesz zapisu stanu przed zmianą i po niej.",
    result: "Otrzymasz raport gotowości i podpisany pakiet dowodowy pokazujący, co się zmieniło, co sprawdzono i co nadal wymaga decyzji.",
    process: ["Ustalamy zgłoszenie, jeden host, stan bazowy i okno wersji kandydującej.", "Ustalamy upoważnienie, skrót wydania i osobę odpowiedzialną za decyzję.", "Zapisujemy zatwierdzony stan bazowy i kandydujący za pomocą ściśle określonych kontroli tylko do odczytu.", "Omawiamy różnice, ustalenia i nierozstrzygnięte elementy.", "Dostarczamy raport, podpisany zapis wykonania, pakiet dowodowy i instrukcję weryfikacji."],
    deliverables: ["posture.json", "findings.json", "drift.json", "report.md", "podpisany pakiet ZIP"],
    inputs: ["Jeden wskazany serwer Linux przeznaczony do wdrożenia.", "Zatwierdzony stan bazowy i wersja kandydująca w uzgodnionym oknie.", "Jeden skrót SHA-256 artefaktu wydania i osoba odpowiedzialna za decyzję.", "Podpisane upoważnienie i wyłącznie informacje pozbawione danych poufnych."],
    timing: "Cztery dni robocze od zebrania danych wersji kandydującej.",
    price: "2 500–7 500 €",
    priceDetail: "4 500 € — cena standardowa po sprawdzeniu dopasowania",
    exclusions: ["Bez zatwierdzenia wdrożenia i bez gwarancji bezpieczeństwa.", "Bez napraw i ponownego testu, chyba że zostaną osobno uzgodnione.", "Bez dowolnego przeglądu panelu sterowania chmurą lub kodu źródłowego.", "Bez certyfikacji zgodności."],
    verification: "Podpisany zapis wykonania i instrukcja weryfikacji pozwalają sprawdzić relację między stanem bazowym a wersją kandydującą, powiązanie z wydaniem i wskazane ograniczenia. Wynik nie jest zatwierdzeniem wdrożenia.",
  },
  "OFFSEC-CUSTODY-OPS": {
    name: "Przegląd zarządzania kluczami, dostępem i przekazaniem odpowiedzialności",
    situation: "Chcesz ocenić, jak udokumentowano kontrole operacyjne, bez ujawniania kluczy ani środków.",
    result: "Otrzymasz raport stanu, ustalenia i podpisany pakiet dowodowy pokazujący dostarczone obserwacje kontroli oraz elementy pozostające poza zakresem.",
    process: ["Ustalamy pytanie operacyjne i zakres ściśle określony.", "Ustalamy upoważnienie oraz format eksportu pozbawionego danych poufnych i zawierającego nieprzejrzyste identyfikatory.", "Tworzymy pakiet obserwacji kontroli tylko do odczytu, bez łączenia z portfelami.", "Sprawdzamy kompletność, ustalenia i ograniczenia.", "Dostarczamy raport, podpisany zapis wykonania, pakiet dowodowy i instrukcję weryfikacji offline."],
    deliverables: ["posture.json", "findings.json", "report.md", "podpisany pakiet ZIP"],
    inputs: ["Jedno wskazane środowisko operacyjne.", "Osoba odpowiedzialna za decyzję i podpisane upoważnienie.", "Zatwierdzony przez klienta eksport obserwacji kontroli pozbawiony danych poufnych.", "Bez kluczy, fraz seed, sald, adresów portfeli i danych transakcji."],
    timing: "Termin dostawy ustalamy podczas wstępnego potwierdzenia zakresu.",
    price: "3 000–15 000 €",
    exclusions: ["Bez przechowywania lub przemieszczania środków.", "Bez kluczy, fraz seed, sald i połączeń z aktywnymi portfelami.", "Bez wniosków o wypłacalności, bezpieczeństwie, stanie prawnym lub zgodności.", "Bez napraw, chyba że zostaną osobno uzgodnione."],
    verification: "Dostawa wskazuje podpisany zapis wykonania i weryfikator offline, aby można było sprawdzić dopuszczone obserwacje i ograniczenia. Nie potwierdza pieczy, wypłacalności ani uprawnienia do transakcji.",
  },
  "OFFSEC-INCIDENT-READY": {
    name: "Przegląd gotowości na wypadek incydentu",
    situation: "Chcesz sprawdzić, czy zespół jest przygotowany na określony incydent.",
    result: "Otrzymasz raport gotowości i podpisany pakiet dowodowy oddzielający obserwacje, niewiadome i elementy poza zakresem.",
    process: ["Ustalamy incydent, środowisko i pytanie o gotowość.", "Ustalamy upoważnienie i granicę eksportu pozbawionego danych poufnych.", "Przeglądamy zakres incydentu, oś czasu, zabezpieczenie materiału, gotowość do ograniczenia skutków i komunikacji.", "Omawiamy ustalenia, braki i ograniczenia z osobą odpowiedzialną za decyzję.", "Dostarczamy raport, podpisany zapis wykonania, pakiet dowodowy i instrukcję weryfikacji offline."],
    deliverables: ["raport gotowości", "ciąg potwierdzeń", "podpisany pakiet ZIP"],
    inputs: ["Jeden określony incydent i środowisko.", "Osoba odpowiedzialna za decyzję i podpisane upoważnienie.", "Obserwacje gotowości pozbawione danych poufnych, z nieprzejrzystymi odwołaniami do dowodów.", "Bez surowych logów, materiałów do eksploatacji, sekretów, danych uwierzytelniających i danych klientów."],
    timing: "Termin dostawy ustalamy podczas wstępnego potwierdzenia zakresu.",
    price: "5 000–25 000 €",
    exclusions: ["Bez hack-back, eksploatacji podatności i testów destrukcyjnych.", "Bez dowodzenia incydentem na żywo i bez zmian ograniczających skutki.", "Bez twierdzeń o naruszeniu, przyczynie źródłowej lub atrybucji.", "Bez napraw oraz wniosków prawnych lub zgodnościowych."],
    verification: "Podpisany zapis wykonania i wskazany weryfikator offline pozwalają sprawdzić zakres gotowości i braki. Nie potwierdzają naruszenia, przyczyny, atrybucji, opanowania incydentu ani naprawy.",
  },
  "OFFSEC-PILOT": {
    name: "Pilotaż przeglądu bezpieczeństwa 10 serwerów",
    situation: "Chcesz sprawdzić proces na dokładnie dziesięciu wskazanych serwerach.",
    result: "Otrzymasz dziesięć pakietów podrzędnych, zbiorczy manifest i podpisany zapis wykonania oraz omówienie wyników dla hostów i całości.",
    process: ["Ustalamy dziesięć wskazanych serwerów, jednego operatora, osobę odpowiedzialną za decyzję i ramy czasowe.", "Ustalamy podpisany zakres oraz granicę tylko do odczytu, bez wykrywania zasobów.", "Wykonujemy etap bazowy i kandydujący dla każdego wskazanego serwera.", "Omawiamy dziesięć wyników podrzędnych i zbiorcze braki.", "Dostarczamy raport zbiorczy, podpisany zapis wykonania, pakiety dowodowe i instrukcję weryfikacji."],
    deliverables: ["podpisane upoważnienie i decyzja dopuszczająca pilotaż", "macierz dwóch przebiegów dla dziesięciu hostów", "dziesięć podpisanych pakietów podrzędnych", "zbiorczy manifest dowodów", "podpisany zbiorczy zapis wykonania pilotażu", "zbiorczy weryfikator offline", "report.md", "BUYER_WALKTHROUGH.md"],
    inputs: ["Dokładnie dziesięć wskazanych serwerów.", "Jeden upoważniony operator i jedna osoba odpowiedzialna za decyzję.", "Podpisany zakres z oknem nie dłuższym niż czternaście dni.", "Wyłącznie informacje pozbawione danych poufnych; bez danych uwierzytelniających, kluczy, logów i zrzutów ekranu."],
    timing: "Termin dostawy ustalamy podczas wstępnego potwierdzenia zakresu.",
    price: "Stała równowartość w EUR — wycena po uzgodnieniu zakresu",
    exclusions: ["Bez wykrywania zasobów, monitorowania i utrzymywania dostępu.", "Bez zbierania sekretów lub danych uwierzytelniających, eksploatacji i napraw.", "Bez zatwierdzenia uruchomienia, certyfikacji zgodności i twierdzenia, że host jest bezpieczny.", "Bez programu wykraczającego poza zakres dziesięciu serwerów."],
    verification: "Zbiorczy podpisany zapis wykonania i weryfikator odtwarzają dziesięć pakietów podrzędnych oraz ich powiązania. Nie dowodzą, że którykolwiek host jest bezpieczny, ani nie tworzą uprawnienia do monitorowania.",
  },
};

const POLISH_TRANSLATED_PATHS = [
  /^\/$/,
  /^\/catalog(?:\/(?:offsec-local-audit|offsec-launch-ready|offsec-custody-ops|offsec-incident-ready|offsec-pilot))?$/,
  /^\/review\/request(?:\/confirmed)?$/,
  /^\/why-witnessops$/,
  /^\/customer-security-review$/,
  /^\/library$/,
  /^\/docs$/,
  /^\/verify$/,
  /^\/support$/,
  /^\/contact$/,
] as const;

export function polishOfferRequestHref(productId: CanonicalOffsecProductId): string {
  const sku = getSku(productId);
  if (!sku) return "/pl/review/request";
  const buyerService = buyerServiceByProductId(productId);

  const params = new URLSearchParams({
    productId: sku.id,
    offer: buyerService?.name.pl ?? sku.name,
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
