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
    introduction: "Agent Action Security Review pomaga zrozumieć zabezpieczenia jednego ważnego działania agenta AI lub automatyzacji, zanim zespół zdecyduje o uruchomieniu albo przekazaniu rozwiązania.",
    sections: [
      { heading: "Jakie działanie?", paragraphs: ["Może to być na przykład zwrot płatności, zmiana danych lub nadanie dostępu. Przegląd dotyczy jednego wybranego działania, a nie wszystkich możliwości agenta."] },
      { heading: "Co sprawdzamy?", bullets: ["Co uruchamia działanie i jaka tożsamość jest używana do jego wykonania, na przykład konto usługi.", "Na co pozwalają uprawnienia tej tożsamości oraz czy działanie wymaga zatwierdzenia i jak ma ono przebiegać — według dostępnych materiałów.", "Jakie materiały i zapisy wykonania są dostępne oraz czego nie da się na ich podstawie ustalić."] },
      { heading: "Przykład: zwrot płatności", paragraphs: ["Załóżmy, że agent ma zlecić zwrot płatności. Warto zapytać: czy zwrot wymaga zatwierdzenia i czy uprawnienia konta używanego przez agenta pozwalają też zwrócić pieniądze niewłaściwej osobie lub w niewłaściwej kwocie?", "Następnie sprawdzamy, co da się ustalić z dostępnych materiałów. Jeśli brakuje informacji, wskazujemy to w raporcie. To przykład, a nie opis rzeczywistego klienta."] },
      { heading: "Czego usługa nie obejmuje?", paragraphs: ["Analizujemy i opisujemy dostępne materiały. Nie wykonujemy badanego działania, nie zmieniamy systemu produkcyjnego i nie wdrażamy poprawek. Nie jest to test penetracyjny, ciągły monitoring ani certyfikacja bezpieczeństwa."] },
    ],
    related: [{ label: "Zakres i cena przeglądu", href: "/pl/reviews/agent-action-security-review" }, { label: "Co otrzymasz", href: "/pl/docs/what-you-receive" }],
  },
  "how-witnessops-works": {
    introduction: "Zaczynamy od pytania o jedno działanie i decyzję, którą musi podjąć Twój zespół. Ustalenia odnosimy do materiałów dostępnych w uzgodnionym zakresie.",
    sections: [
      { heading: "1. Opisz potrzebę", paragraphs: ["W zapytaniu podaj ogólny opis działania, związanych z nim systemów i terminu decyzji. Nie dołączaj haseł, kluczy, logów, zrzutów ekranu ani danych klientów."] },
      { heading: "2. Uzgodnij zakres", paragraphs: ["Przed rozpoczęciem pracy uzgadniamy zakres, upoważnienie, wyłączenia, sposób przekazania materiałów, cenę i termin. Wysłanie zapytania ani potwierdzenie adresu e-mail nie rozpoczyna przeglądu i nie daje upoważnienia do sprawdzania systemów."] },
      { heading: "3. Poznaj ustalenia", paragraphs: ["Analizujemy uzgodnione materiały i na ich podstawie opisujemy przebieg działania w zakresie, który można ustalić. Przekazujemy pisemny raport do omówienia. Wskazujemy źródła ustaleń, zalecenia oraz pytania, na które materiały nie pozwoliły odpowiedzieć."] },
    ],
    related: [{ label: "Co musisz dostarczyć", href: "/pl/docs/what-you-need-to-provide" }, { label: "Zapytaj o przegląd", href: "/pl/review/request" }],
  },
  "what-you-receive": {
    introduction: "Po przeglądzie otrzymasz pisemny raport i omówienie dotyczące jednego uzgodnionego działania.",
    sections: [
      { heading: "Co znajdziesz w raporcie?", bullets: ["Mapę działania na podstawie dostępnych materiałów: co je uruchamia, jaka tożsamość jest używana do jego wykonania, jakie ma uprawnienia oraz czy i jak wymagane jest zatwierdzenie.", "Ustalenia ze wskazaniem źródeł i dostępnych dowodów.", "Zalecenia uporządkowane według ważności oraz opis tego, czego nie udało się ustalić."] },
      { heading: "Jak z tego skorzystać?", paragraphs: ["Raport pomaga zespołowi zdecydować, które kwestie wymagają uwagi. Wniosek należy czytać razem z jego źródłem, zakresem i ograniczeniami. Zalecenia nie oznaczają, że poprawki zostały wdrożone."] },
    ],
    related: [{ label: "Jak działa przegląd", href: "/pl/docs/how-witnessops-works" }, { label: "Pełny zakres przeglądu", href: "/pl/reviews/agent-action-security-review" }],
  },
  faq: {
    introduction: "Odpowiedzi na pytania przed zgłoszeniem przeglądu.",
    sections: [
      { heading: "Ile działań obejmuje przegląd?", paragraphs: ["Jedno uzgodnione istotne działanie agenta lub automatyzacji. Jeśli zgłoszenie obejmuje więcej, zakres należy zawęzić; możemy też odmówić jego przyjęcia."] },
      { heading: "Czy badacie cały system i wykonujecie działanie?", paragraphs: ["Nie. Analizujemy materiały dotyczące uzgodnionego działania. Nie wykonujemy go, nie zmieniamy produkcji ani nie wdrażamy poprawek. Przegląd nie jest testem penetracyjnym ani certyfikatem."] },
      { heading: "Ile kosztuje i jak długo trwa?", paragraphs: ["Aktualną cenę znajdziesz na stronie oferty. Termin realizacji ustalamy w podpisanym zakresie prac; nie zakładamy stałego terminu dla każdego zlecenia."] },
      { heading: "Czy zapytanie rozpoczyna pracę?", paragraphs: ["Nie. Najpierw sprawdzamy dopasowanie. Praca wymaga uzgodnienia zakresu, upoważnienia i sposobu obchodzenia się z materiałami."] },
    ],
    related: [{ label: "Oferta i cena", href: "/pl/reviews/agent-action-security-review" }, { label: "Wyślij zapytanie", href: "/pl/review/request" }],
  },
  "buyer-approver-guide": {
    introduction: "Przed podjęciem decyzji ustal, jakie działanie agenta jest ważne dla organizacji i kto może zatwierdzić zakres przeglądu.",
    sections: [
      { heading: "Pytania dla osoby kupującej", bullets: ["Jakie jedno działanie ma zostać przeanalizowane i co może się stać, jeśli zostanie wykonane niewłaściwie?", "Jakie systemy są zaangażowane i do kiedy potrzebujesz informacji do decyzji?", "Jakie materiały mogą pomóc odtworzyć przebieg i kto odpowiada za ich udostępnienie?"] },
      { heading: "Pytania dla osoby zatwierdzającej", paragraphs: ["Ustal, kto ma prawo upoważnić przegląd, jakie materiały można udostępnić oraz jakie są wyłączenia. Przed pracą uzgadniamy zakres, sposób obsługi materiałów, cenę i termin.", "Po otrzymaniu raportu sprawdź źródła, zalecenia i opis niewiadomych. Decyzja o zmianach oraz ich wdrożenie pozostają osobnym działaniem."] },
    ],
    related: [{ label: "Co otrzymasz", href: "/pl/docs/what-you-receive" }, { label: "Co podać w zapytaniu", href: "/pl/docs/what-you-need-to-provide" }],
  },
  "is-witnessops-right-for-this": {
    introduction: "Ten przegląd może być przydatny, gdy agent lub automatyzacja ma wykonać ważne działanie, a zespół chce poznać związane z nim uprawnienia, zatwierdzenia i dostępne zapisy.",
    sections: [
      { heading: "Kiedy warto zapytać?", bullets: ["Przed uruchomieniem agenta, który może zwracać płatności, zmieniać dane lub nadawać dostęp.", "Przed przekazaniem rozwiązania innemu zespołowi albo klientowi, gdy potrzebny jest pisemny opis jednego działania i jego ograniczeń."] },
      { heading: "Kiedy potrzebujesz innej usługi?", paragraphs: ["Jeżeli oczekujesz testu penetracyjnego, naprawy, ciągłego monitoringu, certyfikatu lub oceny wszystkich działań agenta, ten przegląd nie obejmuje takich prac.", "Możesz opisać potrzebę bez informacji poufnych. Najpierw sprawdzimy, czy da się ją dopasować do zakresu; zapytanie nie jest rezerwacją ani upoważnieniem do pracy."] },
    ],
    related: [{ label: "Zrozum usługę", href: "/pl/docs/understand-the-service" }, { label: "Zapytaj o przegląd", href: "/pl/review/request" }],
  },
  "what-you-need-to-provide": {
    introduction: "Na początku potrzebny jest tylko ogólny opis, który pozwoli ocenić dopasowanie przeglądu.",
    sections: [
      { heading: "W pierwszym zapytaniu", bullets: ["Napisz, jakie jedno działanie ma wykonać agent, na przykład „zwrócić płatność”.", "Nazwij systemy, których dotyczy działanie, oraz podaj przybliżony termin decyzji.", "Podaj służbowy adres e-mail, abyśmy mogli odpowiedzieć po jego potwierdzeniu."] },
      { heading: "Nie wysyłaj materiałów poufnych", paragraphs: ["W pierwszym zapytaniu nie przesyłaj haseł, kluczy API, tokenów, logów, plików konfiguracyjnych, zrzutów ekranu ani danych klientów. Nie są potrzebne do wstępnej oceny.", "Jeśli przegląd będzie odpowiedni, przed rozpoczęciem pracy uzgodnimy zakres, upoważnienie oraz bezpieczny sposób przekazania dopuszczonych materiałów. Nie przesyłaj sekretów."] },
    ],
    related: [{ label: "Jak działa przegląd", href: "/pl/docs/how-witnessops-works" }, { label: "Formularz zapytania", href: "/pl/review/request" }],
  },
};
