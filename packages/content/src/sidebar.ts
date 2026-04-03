import { getSurfaceUrl } from "@witnessops/config";
import {
  getDocHref,
  getDocSectionDescriptor,
  getDocSectionTitle,
  listDocPages,
  type DocsSurface,
} from "./docs";

export type DocsNavItem = {
  title: string;
  href: string;
  order: number;
};

export type DocsNavSection = {
  id: string;
  title: string;
  description: string;
  items: DocsNavItem[];
};

export type DocsLayer = {
  id: string;
  title: string;
  description: string;
};

type CuratedNavItem =
  | {
      kind: "doc";
      href: string;
      title?: string;
    }
  | {
      kind: "link";
      href: string;
      title: string;
    };

const OFFSEC_DOCS_LAYERS: Array<{
  id: string;
  title: string;
  description: string;
  items: CuratedNavItem[];
}> = [
  {
    id: "getting-started",
    title: "Getting Started",
    description:
      "What WitnessOps is, why it exists, and where each audience should begin.",
    items: [
      { kind: "link", href: "/docs", title: "Docs Home" },
      { kind: "doc", href: "/docs/getting-started" },
      { kind: "link", href: getSurfaceUrl("witnessops", "/why-witnessops"), title: "Why WitnessOps" },
      { kind: "doc", href: "/docs/audiences", title: "Audience Guides" },
      { kind: "doc", href: "/docs/audiences/new-operator" },
      { kind: "doc", href: "/docs/audiences/manager-approver" },
      { kind: "doc", href: "/docs/audiences/defender" },
      { kind: "doc", href: "/docs/audiences/integration-author" },
      { kind: "doc", href: "/docs/faq" },
    ],
  },
  {
    id: "how-it-works",
    title: "How It Works",
    description:
      "The proof story: what gets signed, what gets bundled, and how a third party verifies it.",
    items: [
      { kind: "doc", href: "/docs/how-it-works" },
      { kind: "doc", href: "/docs/how-it-works/proof-model" },
      { kind: "doc", href: "/docs/how-it-works/evidence-bundles" },
      { kind: "doc", href: "/docs/how-it-works/verification" },
      { kind: "doc", href: "/docs/how-it-works/standards" },
    ],
  },
  {
    id: "governed-execution",
    title: "Governed Execution",
    description:
      "How policy gates, scope enforcement, approvals, evidence capture, and receipts fit into a governed path.",
    items: [
      { kind: "doc", href: "/docs/security-systems/governed-execution" },
      { kind: "doc", href: "/docs/security-systems/policy-gates" },
      { kind: "doc", href: "/docs/governance" },
      { kind: "doc", href: "/docs/governance/authorization-model" },
      { kind: "doc", href: "/docs/governance/lab-mode-and-scope-bypass" },
      { kind: "doc", href: "/docs/evidence" },
      { kind: "doc", href: "/docs/evidence/receipts", title: "Receipts" },
      { kind: "doc", href: "/docs/evidence/execution-chains" },
      { kind: "doc", href: "/docs/evidence/sensitive-artifact-handling" },
    ],
  },
  {
    id: "tasks",
    title: "Tasks",
    description:
      "Task-oriented guides for running operations, making decisions, and closing governed workflows safely.",
    items: [
      { kind: "doc", href: "/docs/operations" },
      { kind: "doc", href: "/docs/operations/runbooks" },
      { kind: "doc", href: "/docs/decisions" },
      { kind: "doc", href: "/docs/decisions/scope-check" },
      { kind: "doc", href: "/docs/decisions/escalation" },
      { kind: "doc", href: "/docs/decisions/evidence-required" },
      { kind: "doc", href: "/docs/scenarios" },
      { kind: "doc", href: "/docs/scenarios/phishing-investigation" },
      { kind: "doc", href: "/docs/security-education" },
      { kind: "doc", href: "/docs/security-education/what-if-you-clicked" },
    ],
  },
  {
    id: "reference",
    title: "Reference",
    description:
      "Schemas, receipt fields, commands, policy rules, and external mappings used across the system.",
    items: [
      { kind: "doc", href: "/docs/reference" },
      { kind: "doc", href: "/docs/reference/commands" },
      { kind: "doc", href: "/docs/integrations" },
      { kind: "doc", href: "/docs/integrations/witnessops-catalog" },
      { kind: "doc", href: "/docs/evidence/receipt-spec" },
      { kind: "doc", href: "/docs/glossary" },
      { kind: "doc", href: "/docs/evidence-mapping" },
      { kind: "doc", href: "/docs/evidence-mapping/nist-csf-2-0" },
      { kind: "doc", href: "/docs/evidence-mapping/dora" },
      { kind: "doc", href: "/docs/evidence-mapping/eu-ai-act" },
    ],
  },
  {
    id: "architecture",
    title: "Architecture",
    description:
      "System-level pages that explain how governance, execution, evidence, and verification boundaries fit together.",
    items: [
      { kind: "doc", href: "/docs/security-systems" },
      { kind: "doc", href: "/docs/security-systems/witnessops-architecture" },
      { kind: "doc", href: "/docs/security-systems/three-layer-stack" },
      { kind: "doc", href: "/docs/security-systems/threat-model" },
      { kind: "doc", href: "/docs/security-systems/security-practices" },
    ],
  },
];

function compareItems(left: DocsNavItem, right: DocsNavItem) {
  if (left.order !== right.order) {
    return left.order - right.order;
  }

  return left.title.localeCompare(right.title);
}

async function getCuratedOffsecSidebar(): Promise<DocsNavSection[]> {
  const docs = await listDocPages("witnessops");
  const docsByHref = new Map(docs.map((doc) => [getDocHref(doc.slug), doc]));

  return OFFSEC_DOCS_LAYERS.map((section) => ({
    id: section.id,
    title: section.title,
    description: section.description,
    items: section.items
      .map((item, index) => {
        if (item.kind === "link") {
          return {
            title: item.title,
            href: item.href,
            order: index + 1,
          };
        }

        const doc = docsByHref.get(item.href);
        if (!doc) {
          return null;
        }

        return {
          title: item.title ?? doc.navLabel ?? doc.title,
          href: item.href,
          order: index + 1,
        };
      })
      .filter((item): item is DocsNavItem => item !== null),
  }));
}

export function getDocsLayerForHref(
  surface: DocsSurface,
  href: string,
): DocsLayer | null {
  if (surface !== "witnessops") {
    return null;
  }

  const layer = OFFSEC_DOCS_LAYERS.find((candidate) =>
    candidate.items.some((item) => item.href === href),
  );

  if (!layer) {
    return null;
  }

  return {
    id: layer.id,
    title: layer.title,
    description: layer.description,
  };
}

export function getDocsLayerForSlug(
  surface: DocsSurface,
  slug: string[],
): DocsLayer | null {
  return getDocsLayerForHref(surface, getDocHref(slug));
}

export async function getDocsSidebar(
  surface: DocsSurface,
): Promise<DocsNavSection[]> {
  if (surface === "witnessops") {
    return getCuratedOffsecSidebar();
  }

  const docs = await listDocPages(surface);
  const sections = new Map<string, DocsNavItem[]>();

  for (const doc of docs) {
    const sectionId = doc.slug[0] ?? "root";
    const items = sections.get(sectionId) ?? [];

    items.push({
      title: doc.navLabel ?? doc.title,
      href: getDocHref(doc.slug),
      order: doc.order ?? Number.MAX_SAFE_INTEGER,
    });

    sections.set(sectionId, items);
  }

  return [...sections.entries()]
    .map(([id, items]) => ({
      id,
      title: getDocSectionTitle(id),
      description: getDocSectionDescriptor(id),
      items: items.sort(compareItems),
    }))
    .sort((left, right) => {
      if (left.id === "root") {
        return -1;
      }

      if (right.id === "root") {
        return 1;
      }

      return left.title.localeCompare(right.title);
    });
}
