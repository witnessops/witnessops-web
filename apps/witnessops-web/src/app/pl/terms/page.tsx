import { LegalDocumentPage, legalPageMetadata } from "@/components/marketing/legal-document-page";

export function generateMetadata() {
  return legalPageMetadata("terms", "pl");
}

export default function PolishTermsPage() {
  return <LegalDocumentPage slug="terms" locale="pl" />;
}
