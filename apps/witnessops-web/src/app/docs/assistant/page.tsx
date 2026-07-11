import type { Metadata } from "next";

import { PublicContactRoute } from "@/components/marketing/public-contact-route";
import { DocsAssistantPage } from "@/components/docs-assistant/docs-assistant-page";

export const metadata: Metadata = {
  title: "Ask WitnessOps | WitnessOps",
  robots: { index: false, follow: false },
};

export default function DocsAssistantRoute() {
  return (
    <main id="main-content" tabIndex={-1} className="docs-page-enter">
      <DocsAssistantPage />
      <div className="mx-auto max-w-3xl px-6 pb-16">
        <PublicContactRoute subject="fit-check" />
      </div>
    </main>
  );
}
