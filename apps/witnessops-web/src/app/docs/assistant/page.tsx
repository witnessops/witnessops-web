import type { Metadata } from "next";

import { DocsAssistantPage } from "@/components/docs-assistant/docs-assistant-page";

export const metadata: Metadata = {
  title: "Ask WitnessOps | WitnessOps",
  robots: { index: false, follow: false },
};

export default function DocsAssistantRoute() {
  return (
    <main id="main-content" tabIndex={-1} className="docs-page-enter">
      <DocsAssistantPage />
    </main>
  );
}
