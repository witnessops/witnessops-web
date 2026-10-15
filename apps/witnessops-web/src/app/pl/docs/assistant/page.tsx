import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AskSovereignPreview } from "@/components/ask-sovereign/ask-sovereign-preview";
import { sovereignAssistantPublished } from "@/lib/sovereign-release";

export function generateMetadata(): Metadata {
  if (!sovereignAssistantPublished()) {
    return {
      title: { absolute: "Page not found · WitnessOps" },
      robots: { index: false, follow: false },
    };
  }
  return {
    title: "Ask Sovereign",
    robots: { index: false, follow: false },
  };
}

export default function PolishDocsAssistantRoute() {
  if (!sovereignAssistantPublished()) notFound();
  return (
    <main id="main-content" tabIndex={-1} className="docs-page-enter">
      <AskSovereignPreview locale="pl" />
    </main>
  );
}
