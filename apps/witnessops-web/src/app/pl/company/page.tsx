import type { Metadata } from "next";

import { CompanyDetails } from "@/components/marketing/company-details";
import { COMPANY_DETAILS } from "@/lib/company-details";
import { languageAlternates } from "@/lib/public-seo";

export const metadata: Metadata = {
  title: COMPANY_DETAILS.pl.heading,
  description: `${COMPANY_DETAILS.pl.legalName}. ${COMPANY_DETAILS.pl.address}`,
  robots: { index: false, follow: true },
  alternates: languageAlternates("/pl/company", {
    en: "/company",
    pl: "/pl/company",
  }),
};

export default function PolishCompanyPage() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto w-full min-w-0 max-w-3xl px-6 py-16"
    >
      <CompanyDetails locale="pl" placement="page" />
    </main>
  );
}
