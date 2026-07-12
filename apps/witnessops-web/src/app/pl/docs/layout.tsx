import { DocsNavbar } from "@/components/docs/docs-navbar";
import { DocsSidebar } from "@/components/docs/docs-sidebar";
import { POLISH_DOCS_SECTIONS } from "./docs-navigation";

export default function PolishDocsLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen"><DocsNavbar docs={[]} /><div className="flex min-h-screen"><DocsSidebar sections={POLISH_DOCS_SECTIONS} /><div className="min-w-0 flex-1 px-6 py-10 lg:px-12 lg:py-12">{children}</div></div></div>;
}
