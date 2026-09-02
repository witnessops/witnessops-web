const PRIMARY_OFFER_SAMPLE_PACK = {
  en: "Sample pack with supported receipt JSON to extract and test through /verify",
  pl: "Przykładowy pakiet z obsługiwanym zapisem JSON do wyodrębnienia i sprawdzenia przez /verify",
} as const;

export const PRIMARY_OFFER = {
  id: "bounded-workflow-review",
  route: "/catalog/workflows",
  requestRoute: "/review/request",
  name: {
    en: "Agent Workflow Reconstruction",
    pl: "Agent Workflow Reconstruction",
  },
  commercialContract: {
    price: "eur_2500_fixed",
    timing: "within_ten_working_days_after_evidence_rules_are_agreed",
  },
  price: {
    amount: "2500",
    currency: "EUR",
    en: "€2,500 fixed",
    pl: "€2 500 — cena stała",
  },
  unit: {
    en: "One named workflow (agentic or automated)",
    pl: "Jeden nazwany workflow (agentowy lub zautomatyzowany)",
  },
  fitCheck: {
    en: "Non-secret fit check first",
    pl: "Najpierw wstępna ocena bez informacji poufnych",
  },
  timing: {
    en: "Within 10 working days after evidence rules are agreed",
    pl: "W ciągu 10 dni roboczych po uzgodnieniu zasad dowodowych",
  },
  situation: {
    en: "One consequential agent or automation workflow needs a reconstructable account of what was authorised, executed, observed, and still unresolved.",
    pl: "Jeden istotny workflow agenta lub automatyzacji wymaga odtwarzalnego zapisu tego, co zatwierdzono, wykonano, zaobserwowano i co nadal pozostaje nierozstrzygnięte.",
  },
  result: {
    en: "A scoped reconstruction that separates authorised, executed, observed, and unresolved facts, with a workflow and permission map, evidence gaps, a proposed receipt shape, a sample pack containing supported receipt JSON for /verify, and a readout.",
    pl: "Ograniczona rekonstrukcja oddzielająca fakty zatwierdzone, wykonane, zaobserwowane i nierozstrzygnięte, z mapą workflow i uprawnień, lukami dowodowymi, proponowanym kształtem zapisu, przykładowym pakietem zawierającym obsługiwany zapis JSON dla /verify i omówieniem.",
  },
  samplePack: PRIMARY_OFFER_SAMPLE_PACK,
  included: {
    en: [
      "Non-secret fit check",
      "Scoped reconstruction",
      "Workflow and permission map",
      "Evidence-gap list",
      "Proposed receipt shape",
      PRIMARY_OFFER_SAMPLE_PACK.en,
      "Readout",
    ],
    pl: [
      "Wstępna ocena bez informacji poufnych",
      "Ograniczona rekonstrukcja",
      "Mapa workflow i uprawnień",
      "Lista luk dowodowych",
      "Proponowany kształt zapisu",
      PRIMARY_OFFER_SAMPLE_PACK.pl,
      "Omówienie wyniku",
    ],
  },
  notIncluded: {
    en: [
      "Platform installation",
      "Continuous monitoring",
      "Certification that an agent is safe",
      "Custom protocol development",
      "Multi-workflow programmes",
    ],
    pl: [
      "Instalacja platformy",
      "Ciągłe monitorowanie",
      "Certyfikacja, że agent jest bezpieczny",
      "Tworzenie niestandardowego protokołu",
      "Programy obejmujące wiele workflow",
    ],
  },
} as const;

export type PrimaryOffer = typeof PRIMARY_OFFER;
export type PrimaryOfferName = PrimaryOffer["name"]["en"];
export type PrimaryOfferPriceLabel = PrimaryOffer["price"]["en"];
