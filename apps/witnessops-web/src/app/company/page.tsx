import type { Metadata } from "next";
import Link from "next/link";

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
      {/* Media kit link moved here from /about (footer bundle B, Design 2026-11-13). */}
      <p className="mt-8 text-text-secondary">
        Press and brand material is in the{" "}
        <Link href="/media-kit" className="inline-flex min-h-11 items-center underline underline-offset-4" data-company-media-kit>media kit</Link>.
      </p>
    </main>
  );
}
