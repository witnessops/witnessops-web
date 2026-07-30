import { DocsNavbar } from "@/components/docs/docs-navbar";
import { DocsSidebar } from "@/components/docs/docs-sidebar";
import { POLISH_DOCS_SECTIONS } from "./docs-navigation";

/** PL utility chrome — stay on /pl/docs; do not point at EN /docs hubs. */
const PL_DOCS_UTILITY_LINKS = [
  { label: "Start", href: "/pl/docs" },
  { label: "FAQ", href: "/pl/docs/faq" },
  { label: "Słownik", href: "/pl/docs/glossary" },
  { label: "EN docs", href: "/docs" },
];

export default function PolishDocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <DocsNavbar docs={[]} utilityLinks={PL_DOCS_UTILITY_LINKS} />
      <div className="flex min-h-screen">
        <DocsSidebar sections={POLISH_DOCS_SECTIONS} />
        <div className="min-w-0 flex-1 px-6 py-10 lg:px-12 lg:py-12">
          {children}
        </div>
      </div>
    </div>
  );
}
