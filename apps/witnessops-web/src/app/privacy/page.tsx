import { LegalDocumentPage, legalPageMetadata } from "@/components/marketing/legal-document-page";

export function generateMetadata() {
  return legalPageMetadata("privacy", "en");
}

export default function PrivacyPage() {
  return <LegalDocumentPage slug="privacy" locale="en" />;
}
