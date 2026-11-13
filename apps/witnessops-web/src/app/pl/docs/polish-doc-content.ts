import { PUBLIC_AGENT_ACTION_OFFER } from "@/lib/commercial-truth";

/** Buyer-facing Polish guides. Technical identifiers retain their original names. */
type PolishDocSection = {
  heading: string;
  paragraphs?: readonly string[];
  bullets?: readonly string[];
};

type PolishDoc = {
  introduction: string;
  sections: readonly PolishDocSection[];
  related: readonly { label: string; href: string }[];
};

export const POLISH_DOC_CONTENT: Record<string, PolishDoc> = {
  "understand-the-service": {
    introduction: PUBLIC_AGENT_ACTION_OFFER.situation.pl,
    sections: [
      { heading: "Jakie działanie?", paragraphs: ["Może to być na przykład zwrot płatności, zmiana danych lub nadanie dostępu. Przegląd dotyczy jednego wybranego działania, a nie wszystkich możliwości agenta."] },
      { heading: "Co sprawdzamy?", bullets: ["Czy treść kontrolowana przez atakującego może wywołać niedozwolone działanie oraz jaką decyzję, narzędzie i parametry wybiera agent — na podstawie obserwowalnego zachowania.", "Co faktycznie przesłano do narzędzia lub API, z uwzględnieniem walidacji, błędów, ponowień i nieoczekiwanych operacji. Jaka tożsamość działała i czy egzekwowano zatwierdzenia oraz granice zasobów.", "Co faktycznie zapisano w systemie docelowym, także przy zmianach częściowych, powielonych lub niezapisanych, oraz czy wejście, wywołania i wynik pozwalają odtworzyć ustalenie."] },
      { heading: "Przykład: zwrot płatności", paragraphs: ["Załóżmy, że agent ma zlecić zwrot płatności. Warto zapytać: czy zwrot wymaga zatwierdzenia i czy uprawnienia konta używanego przez agenta pozwalają też zwrócić pieniądze niewłaściwej osobie lub w niewłaściwej kwocie?", "W uzgodnionym środowisku próbujemy wywołać zdefiniowany niedozwolony zwrot, sprawdzamy przesłane wywołanie i rzeczywisty stan po stronie systemu docelowego. Brak dowodu nie oznacza odparcia próby. To przykład, a nie opis rzeczywistego klienta."] },
      { heading: "Czego usługa nie obejmuje?", paragraphs: [PUBLIC_AGENT_ACTION_OFFER.defaultAuthority.pl, "Zmiany produkcyjne wymagają osobnego wyraźnego upoważnienia. Nie wdrażamy poprawek, nie prowadzimy działań destrukcyjnych, ciągłego monitoringu ani certyfikacji bezpieczeństwa. Nie jest to test penetracyjny całego środowiska ani gwarancja bezpieczeństwa."] },
    ],
    related: [{ label: "Zakres i cena przeglądu", href: "/pl/reviews/agent-action-security-review" }, { label: "Co otrzymasz", href: "/pl/docs/what-you-receive" }],
  },
  "how-witnessops-works": {
    introduction: "Zaczynamy od jednego istotnego działania i niedozwolonego skutku, którego agent powinien odmówić. Aktywne testy wykonujemy dopiero po uzgodnieniu środowiska, granic i upoważnienia.",
    sections: [
      { heading: "1. Opisz potrzebę", paragraphs: ["W zapytaniu podaj ogólny opis działania, związanych z nim systemów i terminu decyzji. Nie dołączaj haseł, kluczy, logów, zrzutów ekranu ani danych klientów."] },
      { heading: "2. Uzgodnij zakres", paragraphs: ["Przed testem uzgadniamy środowisko, dozwolone działania, tożsamości, limity prób i skutków, warunki przerwania, odtworzenie stanu i obsługę dowodów. Cenę, termin i ewentualne przypadki oraz limit ponownych testów określa podpisany SOW. Wysłanie zapytania ani potwierdzenie adresu e-mail nie rozpoczyna przeglądu i nie daje upoważnienia do sprawdzania systemów."] },
      { heading: "3. Aktywne testy i raport", paragraphs: ["Próbujemy doprowadzić do uzgodnionych niedozwolonych skutków. Łączymy wejście, obserwowalną decyzję agenta, wywołanie narzędzia lub API, efektywne uprawnienia, faktycznie zapisaną zmianę i dowody. Upoważnienie musi być egzekwowane przed zmianą systemu.", PUBLIC_AGENT_ACTION_OFFER.result.pl] },
    ],
    related: [{ label: "Co musisz dostarczyć", href: "/pl/docs/what-you-need-to-provide" }, { label: "Zapytaj o przegląd", href: "/pl/review/request" }],
  },
  "what-you-receive": {
    introduction: "Po przeglądzie otrzymasz pisemny raport i omówienie dotyczące jednego uzgodnionego działania.",
    sections: [
      { heading: "Co znajdziesz w raporcie?", bullets: ["Mapę całej ścieżki: treść kontrolowana przez atakującego, decyzja agenta, wywołanie narzędzia lub API, efektywne uprawnienia, zapisana zmiana i dowody.", "Wyniki testów, wykazany wpływ i warunki odtworzenia, ze wskazaniem dowodów i jawnych luk.", "Zalecenia naprawcze uporządkowane według ważności i pisemny raport do omówienia."] },
      { heading: "Jak opisujemy wynik?", paragraphs: [PUBLIC_AGENT_ACTION_OFFER.result.pl, PUBLIC_AGENT_ACTION_OFFER.retest.pl] },
      { heading: "Jak z tego skorzystać?", paragraphs: ["Raport pomaga zespołowi zdecydować, które kwestie wymagają uwagi. Wniosek należy czytać razem z jego źródłem, zakresem i ograniczeniami. Zalecenia nie oznaczają, że poprawki zostały wdrożone."] },
    ],
    related: [{ label: "Jak działa przegląd", href: "/pl/docs/how-witnessops-works" }, { label: "Pełny zakres przeglądu", href: "/pl/reviews/agent-action-security-review" }],
  },
  faq: {
    introduction: "Odpowiedzi na pytania przed zgłoszeniem przeglądu.",
    sections: [
      { heading: "Ile działań obejmuje przegląd?", paragraphs: ["Jedno uzgodnione istotne działanie agenta lub automatyzacji. Jeśli zgłoszenie obejmuje więcej, zakres należy zawęzić; możemy też odmówić jego przyjęcia."] },
      { heading: "Czy wykonujecie działanie podczas testu?", paragraphs: ["Tak, podejmujemy uzgodnione próby wywołania niedozwolonych skutków jednego działania w uzgodnionym środowisku. Sprawdzamy rzeczywisty stan systemu docelowego. Upoważnienie musi być egzekwowane przed zmianą. Badanie nie obejmuje całego środowiska; zmiany produkcyjne wymagają osobnego wyraźnego upoważnienia, a wdrażanie poprawek pozostaje poza zakresem."] },
      { heading: "Ile kosztuje i jak długo trwa?", paragraphs: [`${PUBLIC_AGENT_ACTION_OFFER.price.pl}. ${PUBLIC_AGENT_ACTION_OFFER.timing.pl}. Dostępność uzgadniamy przed przyjęciem prac; nie ma domyślnej stałej ceny dla rozszerzonego zakresu.`, PUBLIC_AGENT_ACTION_OFFER.retest.pl] },
      { heading: "Czy zapytanie rozpoczyna pracę?", paragraphs: ["Nie. Najpierw sprawdzamy dopasowanie. Praca wymaga uzgodnienia zakresu, upoważnienia i sposobu obchodzenia się z materiałami."] },
    ],
    related: [{ label: "Oferta i cena", href: "/pl/reviews/agent-action-security-review" }, { label: "Wyślij zapytanie", href: "/pl/review/request" }],
  },
  "buyer-approver-guide": {
    introduction: "Przed podjęciem decyzji ustal, jakie działanie agenta jest ważne dla organizacji i kto może zatwierdzić zakres przeglądu.",
    sections: [
      { heading: "Pytania dla osoby kupującej", bullets: ["Jakie jedno działanie ma zostać przetestowane, jaki skutek jest niedozwolony i które środowisko może objąć test?", "Jakie systemy są zaangażowane i do kiedy potrzebujesz informacji do decyzji?", "Jakie materiały mogą pomóc odtworzyć przebieg i kto odpowiada za ich udostępnienie?"] },
      { heading: "Pytania dla osoby zatwierdzającej", paragraphs: ["Ustal, kto może upoważnić testy i na jakich zasobach. Przed pracą określ dozwolone czynności, granice skutków, warunki przerwania, odtworzenie stanu i obsługę dowodów. Cena, dostępność, termin i ewentualny limit ponownych testów wymagają uzgodnienia.", "Po otrzymaniu raportu sprawdź źródła, zalecenia i opis niewiadomych. Decyzja o zmianach oraz ich wdrożenie pozostają osobnym działaniem."] },
    ],
    related: [{ label: "Co otrzymasz", href: "/pl/docs/what-you-receive" }, { label: "Co podać w zapytaniu", href: "/pl/docs/what-you-need-to-provide" }],
  },
  "is-witnessops-right-for-this": {
    introduction: "Ten przegląd może być przydatny, gdy zespół chce aktywnie sprawdzić, czy treść kontrolowana przez atakującego może doprowadzić do niedozwolonego działania agenta oraz rzeczywistej zmiany w systemie docelowym.",
    sections: [
      { heading: "Kiedy warto zapytać?", bullets: ["Przed uruchomieniem agenta, który może zwracać płatności, zmieniać dane lub nadawać dostęp.", "Przed przekazaniem rozwiązania innemu zespołowi albo klientowi, gdy potrzebny jest pisemny opis jednego działania i jego ograniczeń."] },
      { heading: "Kiedy potrzebujesz innej usługi?", paragraphs: ["Jeżeli oczekujesz testu penetracyjnego całego środowiska, wdrożenia napraw, ciągłego monitoringu, certyfikatu lub oceny wszystkich działań agenta, ten przegląd nie obejmuje takich prac.", "Możesz opisać potrzebę bez informacji poufnych. Najpierw sprawdzimy, czy da się ją dopasować do zakresu; zapytanie nie jest rezerwacją ani upoważnieniem do pracy."] },
    ],
    related: [{ label: "Zrozum usługę", href: "/pl/docs/understand-the-service" }, { label: "Zapytaj o przegląd", href: "/pl/review/request" }],
  },
  "what-you-need-to-provide": {
    introduction: "Na początku potrzebny jest tylko ogólny opis, który pozwoli ocenić dopasowanie przeglądu.",
    sections: [
      { heading: "W pierwszym zapytaniu", bullets: ["Napisz, jakie jedno działanie ma wykonać agent, na przykład „zwrócić płatność”.", "Nazwij systemy, których dotyczy działanie, oraz podaj przybliżony termin decyzji.", "Podaj służbowy adres e-mail, abyśmy mogli odpowiedzieć po jego potwierdzeniu."] },
      { heading: "Nie wysyłaj materiałów poufnych", paragraphs: ["W pierwszym zapytaniu nie przesyłaj haseł, kluczy API, tokenów, logów, plików konfiguracyjnych, zrzutów ekranu ani danych klientów. Nie są potrzebne do wstępnej oceny.", "Jeśli test będzie odpowiedni, uzgodnimy środowisko, dozwolone działania, pisemne upoważnienie, warunki przerwania, odtworzenie stanu i obsługę dowodów. Ewentualny ograniczony dostęp testowy ustalamy osobno bezpiecznym kanałem. Nie przesyłaj sekretów w zapytaniu ani czacie."] },
    ],
    related: [{ label: "Jak działa przegląd", href: "/pl/docs/how-witnessops-works" }, { label: "Formularz zapytania", href: "/pl/review/request" }],
  },
};
