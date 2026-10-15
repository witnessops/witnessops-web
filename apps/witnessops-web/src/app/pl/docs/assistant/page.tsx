import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AskSovereignPreview } from "@/components/ask-sovereign/ask-sovereign-preview";
import { sovereignAssistantPublished } from "@/lib/sovereign-release";

export const metadata: Metadata = {
  title: "Ask Sovereign | WitnessOps",
  robots: { index: false, follow: false },
};

export default function PolishDocsAssistantRoute() {
  if (!sovereignAssistantPublished()) notFound();
  return (
    <main id="main-content" tabIndex={-1} className="docs-page-enter">
      <AskSovereignPreview locale="pl" />
    </main>
  );
}
