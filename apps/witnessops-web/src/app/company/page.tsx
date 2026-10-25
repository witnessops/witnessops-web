import type { Metadata } from "next";

import { CompanyDetails } from "@/components/marketing/company-details";
import { COMPANY_DETAILS } from "@/lib/company-details";
import { languageAlternates } from "@/lib/public-seo";

export const metadata: Metadata = {
  title: COMPANY_DETAILS.en.heading,
  description: `${COMPANY_DETAILS.en.legalName}. ${COMPANY_DETAILS.en.address}`,
  robots: { index: false, follow: true },
  alternates: languageAlternates("/company", {
    en: "/company",
    pl: "/pl/company",
  }),
};

export default function CompanyPage() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto w-full min-w-0 max-w-3xl px-6 py-16"
    >
      <CompanyDetails locale="en" placement="page" />
    </main>
  );
}
