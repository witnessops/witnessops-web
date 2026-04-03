import { DocsSidebar } from "@/components/docs/docs-sidebar";
import { getDocsSidebar } from "@witnessops/content/sidebar";

export default async function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sidebar = await getDocsSidebar("witnessops");

  return (
    <div className="flex min-h-screen">
      <DocsSidebar sections={sidebar} />

      <div className="min-w-0 flex-1 px-6 py-10 lg:px-12 lg:py-12">
        {children}
      </div>
    </div>
  );
}
