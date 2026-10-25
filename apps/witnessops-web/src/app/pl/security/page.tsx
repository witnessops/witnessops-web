import { LegalDocumentPage, legalPageMetadata } from "@/components/marketing/legal-document-page";

export function generateMetadata() {
  return legalPageMetadata("security", "pl");
}

export default function PolishSecurityPage() {
  return <LegalDocumentPage slug="security" locale="pl" />;
}
