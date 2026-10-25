import { LegalDocumentPage, legalPageMetadata } from "@/components/marketing/legal-document-page";

export function generateMetadata() {
  return legalPageMetadata("terms", "en");
}

export default function TermsPage() {
  return <LegalDocumentPage slug="terms" locale="en" />;
}
