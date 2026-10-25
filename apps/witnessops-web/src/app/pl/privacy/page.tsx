import { LegalDocumentPage, legalPageMetadata } from "@/components/marketing/legal-document-page";

export function generateMetadata() {
  return legalPageMetadata("privacy", "pl");
}

export default function PolishPrivacyPage() {
  return <LegalDocumentPage slug="privacy" locale="pl" />;
}
