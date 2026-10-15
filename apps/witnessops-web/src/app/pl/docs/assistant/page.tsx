import type { Metadata } from "next";

import { AskSovereignPreview } from "@/components/ask-sovereign/ask-sovereign-preview";

export const metadata: Metadata = {
  title: "Ask Sovereign | WitnessOps",
  robots: { index: false, follow: false },
};

export default function PolishDocsAssistantRoute() {
  return (
    <main id="main-content" tabIndex={-1} className="docs-page-enter">
      <AskSovereignPreview locale="pl" />
    </main>
  );
}
