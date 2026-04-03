import { loadHomeContent } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import { SystemFraming } from "@/components/product/system-framing";
import { ScanHero } from "@/components/product/scan-hero";
import { ScanSteps } from "@/components/product/scan-steps";
import { ScanOutput } from "@/components/product/scan-output";
import { ReceiptPreview } from "@/components/product/receipt-preview";
import { ServicesTier } from "@/components/product/services-tier";
import { DocsPreview } from "@/components/product/docs-preview";
import { FinalCta } from "@/components/marketing/final-cta";

export async function generateMetadata() {
  const content = loadHomeContent();
  return buildMetadata(content.seo);
}

export default function HomePage() {
  const content = loadHomeContent();

  return (
    <main id="main-content" tabIndex={-1}>
      {/* 1. System — establish what WitnessOps is */}
      <SystemFraming />

      {/* 2. Offer — the scan as a demonstration of the system */}
      <ScanHero />
      <ScanSteps />

      {/* 3. Proof — show the receipt early */}
      <ReceiptPreview />
      <ScanOutput />

      {/* 4. Services — depth ladder */}
      <ServicesTier />

      {/* 5. Documentation */}
      <DocsPreview />

      {/* 6. Close */}
      {content.final_cta.enabled && <FinalCta {...content.final_cta} />}
    </main>
  );
}
