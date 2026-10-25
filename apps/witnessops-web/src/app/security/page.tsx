import { LegalDocumentPage, legalPageMetadata } from "@/components/marketing/legal-document-page";

export function generateMetadata() {
  return legalPageMetadata("security", "en");
}

export default function SecurityDetailsPage() {
  return <LegalDocumentPage slug="security" locale="en" />;
}
