export const COMPANY_REGISTRY_LINE =
  "KRS: 0001271405, Sąd Rejonowy Lublin-Wschód w Lublinie z siedzibą w Świdniku, VI Wydział Gospodarczy Krajowego Rejestru Sądowego";

export const COMPANY_DETAILS = {
  en: {
    heading: "Company details",
    legalName: "Witnessops P.S.A.",
    address: "ul. Staszica 73A, 08-400 Garwolin, Poland",
    krs: COMPANY_REGISTRY_LINE,
    nip: "NIP: 8262233962",
    regon: "REGON: 54591401100000",
  },
  pl: {
    heading: "Dane spółki",
    legalName: "Witnessops prosta spółka akcyjna",
    address: "ul. Staszica 73A, 08-400 Garwolin, Polska",
    krs: COMPANY_REGISTRY_LINE,
    nip: "NIP: 8262233962",
    regon: "REGON: 54591401100000",
  },
} as const;

export type CompanyDetailsLocale = keyof typeof COMPANY_DETAILS;

export const COMPANY_COPYRIGHT = `© 2026 ${COMPANY_DETAILS.en.legalName}`;

export const COMPANY_DETAILS_HREF = {
  en: "/company",
  pl: "/pl/company",
} as const;
