import { DocsNavbar } from "@/components/docs/docs-navbar";
import { DocsPathExitTracker } from "@/components/docs/docs-path-exit-tracker";
import { DocsSidebar } from "@/components/docs/docs-sidebar";
import {
  getDocHref,
  getDocSectionTitle,
  listDocPages,
} from "@witnessops/content/docs";
import { getDocsSidebar } from "@witnessops/content/sidebar";

type DocsSidebarSection = Awaited<ReturnType<typeof getDocsSidebar>>[number];
type DocsPage = Awaited<ReturnType<typeof listDocPages>>[number];

function buildSearchEntries(sections: DocsSidebarSection[], docs: DocsPage[]) {
  const docsByHref = new Map(docs.map((doc) => [getDocHref(doc.slug), doc]));
  const seenHrefs = new Set<string>();
  const entries: Array<{
    title: string;
    description: string;
    href: string;
    section: string;
    layerTitle: string;
    sectionTitle: string;
  }> = [];

  for (const section of sections) {
    for (const item of section.items) {
      if (!item.href.startsWith("/docs") || seenHrefs.has(item.href)) {
        continue;
      }

      seenHrefs.add(item.href);
      const doc = docsByHref.get(item.href);
      const sectionTitle = doc ? getDocSectionTitle(doc.section) : section.title;

      entries.push({
        title: item.title,
        description: doc?.description ?? section.description,
        href: item.href,
        section: doc?.section ?? section.id,
        layerTitle: section.title,
        sectionTitle,
      });
    }
  }

  for (const doc of docs) {
    const href = getDocHref(doc.slug);
    if (seenHrefs.has(href)) {
      continue;
    }

    const sectionTitle = getDocSectionTitle(doc.section);
    entries.push({
      title: doc.navLabel ?? doc.title,
      description: doc.description ?? sectionTitle,
      href,
      section: doc.section,
      layerTitle: sectionTitle,
      sectionTitle,
    });
  }

  return entries;
}

export default async function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebar, docs] = await Promise.all([
    getDocsSidebar("witnessops"),
    listDocPages("witnessops"),
  ]);
  const searchDocs = buildSearchEntries(sidebar, docs);

  return (
    <div className="min-h-screen">
      <DocsPathExitTracker />
      <DocsNavbar docs={searchDocs} />

      <div className="flex min-h-screen">
        <DocsSidebar sections={sidebar} />

        <div className="min-w-0 flex-1 px-6 py-10 lg:px-12 lg:py-12">
          {children}
        </div>
      </div>
    </div>
  );
}
