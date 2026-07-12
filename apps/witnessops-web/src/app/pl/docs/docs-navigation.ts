export const POLISH_DOCS_SECTIONS = [
  {
    id: "start-here", title: "ZACZNIJ TUTAJ", description: "Najważniejsze informacje dla kupującego.", items: [
      ["Strona główna dokumentacji", "/pl/docs"], ["Zrozum usługę", "/pl/docs/understand-the-service"], ["Jak działa WitnessOps", "/pl/docs/how-witnessops-works"], ["Wybierz ofertę", "/pl/catalog"], ["Rozpocznij zgłoszenie", "/pl/review/request"], ["Najczęstsze pytania", "/pl/docs/faq"],
    ],
  },
  {
    id: "deliveries-verification", title: "DOSTAWA I WERYFIKACJA", description: "Dostawa, podpisany zapis wykonania i ograniczenia wyniku.", items: [
      ["Co otrzymasz", "/pl/docs/what-you-receive"], ["Zweryfikuj dostawę", "/pl/verify"], ["Jak działają podpisane zapisy wykonania", "/pl/docs/how-receipts-work"], ["Dowody i ograniczenia", "/pl/docs/evidence-and-limitations"], ["Historia zapisów wykonania", "/pl/docs/receipt-history"], ["Słownik pojęć", "/pl/docs/glossary"],
    ],
  },
  {
    id: "guides", title: "PRZEWODNIKI", description: "Przewodniki dla osób kupujących, zatwierdzających i sprawdzających.", items: [
      ["Przewodnik dla kupującego i osoby zatwierdzającej", "/pl/docs/buyer-approver-guide"], ["Przewodnik dla zespołu bezpieczeństwa", "/pl/docs/security-team-guide"], ["Przewodnik dla recenzenta technicznego", "/pl/docs/technical-reviewer-guide"], ["Przewodnik integracyjny", "/pl/docs/integration-guide"], ["Czy WitnessOps pasuje do tej sytuacji?", "/pl/docs/is-witnessops-right-for-this"], ["Co musisz dostarczyć", "/pl/docs/what-you-need-to-provide"],
    ],
  },
  {
    id: "technical-reference", title: "DOKUMENTACJA TECHNICZNA", description: "Szczegóły dla recenzentów technicznych.", items: [
      ["Katalog produktów", "/pl/docs/product-catalog"], ["Specyfikacja potwierdzeń", "/pl/docs/receipt-specification"], ["Polecenia weryfikacyjne", "/pl/docs/verification-commands"], ["Typy artefaktów dostawy", "/pl/docs/delivery-artifact-types"], ["Mapowanie dowodów", "/pl/docs/evidence-mapping"], ["Integracje", "/pl/docs/integrations"], ["Architektura techniczna", "/pl/docs/technical-architecture"], ["Model zagrożeń", "/pl/docs/threat-model"], ["Standardy i ramy odniesienia", "/pl/docs/standards-and-frameworks"],
    ],
  },
].map((section) => ({ ...section, items: section.items.map(([title, href], order) => ({ title, href, order: order + 1 })) }));

export const POLISH_DOC_LABELS = new Map(POLISH_DOCS_SECTIONS.flatMap((section) => section.items.map((item) => [item.href.replace("/pl/docs/", ""), item.title] as const)));
