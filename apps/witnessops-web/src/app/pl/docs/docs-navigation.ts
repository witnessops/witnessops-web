import { getDocsUrl } from "@witnessops/config";

/** Always the public EN docs host (not local-dev origin). */
const EN_TECHNICAL_DOCS_HREF = getDocsUrl("witnessops", "/", { mode: "canonical" });

/**
 * Polish docs chrome: buyer-oriented path only.
 * Full technical corpus stays English on docs.witnessops.com (not a deep PL stub tree).
 */
export const POLISH_DOCS_SECTIONS = [
  {
    id: "start-here",
    title: "ZACZNIJ TUTAJ",
    description: "Najważniejsze informacje dla kupującego.",
    items: [
      ["Strona główna dokumentacji", "/pl/docs"],
      ["Zrozum usługę", "/pl/docs/understand-the-service"],
      ["Jak działa WitnessOps", "/pl/docs/how-witnessops-works"],
      ["Wybierz ofertę", "/pl/catalog"],
      ["Rozpocznij przegląd", "/pl/review/request"],
      ["Najczęstsze pytania", "/pl/docs/faq"],
    ],
  },
  {
    id: "deliveries-verification",
    title: "DOSTAWA I WERYFIKACJA",
    description: "Dostawa, podpisany zapis wykonania i ograniczenia wyniku.",
    items: [
      ["Co otrzymasz", "/pl/docs/what-you-receive"],
      ["Zweryfikuj dostawę", "/pl/verify"],
      ["Jak działają podpisane zapisy wykonania", "/pl/docs/how-receipts-work"],
      ["Dowody i ograniczenia", "/pl/docs/evidence-and-limitations"],
      ["Słownik pojęć", "/pl/docs/glossary"],
    ],
  },
  {
    id: "guides",
    title: "PRZEWODNIKI",
    description: "Przewodniki dla osób kupujących, zatwierdzających i sprawdzających.",
    items: [
      [
        "Przewodnik dla kupującego i osoby zatwierdzającej",
        "/pl/docs/buyer-approver-guide",
      ],
      [
        "Czy WitnessOps pasuje do tej sytuacji?",
        "/pl/docs/is-witnessops-right-for-this",
      ],
      ["Co musisz dostarczyć", "/pl/docs/what-you-need-to-provide"],
    ],
  },
  {
    id: "technical-en",
    title: "DOKUMENTACJA TECHNICZNA",
    description:
      "Pełna dokumentacja techniczna (EN) na docs.witnessops.com — nie jest to kopia PL stubów.",
    items: [
      ["Dokumentacja techniczna (EN)", EN_TECHNICAL_DOCS_HREF],
    ],
  },
].map((section) => ({
  ...section,
  items: section.items.map(([title, href], order) => ({
    title,
    href,
    order: order + 1,
  })),
}));

export const POLISH_DOC_LABELS = new Map(
  POLISH_DOCS_SECTIONS.flatMap((section) =>
    section.items
      .filter((item) => item.href.startsWith("/pl/docs/"))
      .map(
        (item) =>
          [item.href.replace("/pl/docs/", ""), item.title] as const,
      ),
  ),
);
