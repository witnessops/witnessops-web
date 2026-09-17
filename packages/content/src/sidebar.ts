import {
  getDocHref,
  getDocSectionDescriptor,
  getDocSectionTitle,
  listDocPages,
  type DocPage,
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

type CuratedDocsLayer = {
  id: string;
  title: string;
  description: string;
  items: CuratedNavItem[];
  /**
   * Path prefixes used only for layer membership (page chrome context).
   * Not expanded into primary sidebar items.
   */
  layerChildPrefixes?: string[];
};

/**
 * Primary docs chrome: hubs only (≤ ~20–24 links after tier-1/2 expansion).
 * Leaf pages stay published and searchable; they are not listed in the
 * primary sidebar. Use `layerChildPrefixes` only for layer context lookup,
 * not for expanding nav items.
 *
 * Session 3 tier-1: FAQ, Audiences, Evidence index, Governance.
 * Session hub tier-2: proof-model, receipt-spec, scope-check, threat-model.
 */
const OFFSEC_DOCS_LAYERS: CuratedDocsLayer[] = [
  {
    id: "start", title: "Start here",
    description: "Free signup, invitations and your first app result.",
    layerChildPrefixes: ["/docs/getting-started", "/docs/faq"],
    items: [
      { kind: "link", href: "/docs", title: "Docs Home" },
      { kind: "doc", href: "/docs/getting-started", title: "Get started" },
      { kind: "doc", href: "/docs/how-it-works", title: "How it works" },
      { kind: "doc", href: "/docs/faq", title: "FAQ" },
    ],
  },
  {
    id: "app", title: "Use the app",
    description: "Assets, observations, reports and access help.",
    layerChildPrefixes: [],
    items: [
      { kind: "doc", href: "/docs/getting-started/first-observation", title: "Your first observation" },
      { kind: "doc", href: "/docs/getting-started/results", title: "Understand results" },
      { kind: "doc", href: "/docs/getting-started/access-help", title: "Account and CLI help" },
    ],
  },
  {
    id: "cli", title: "CLI",
    description: "Optional source setup and browser authentication.",
    layerChildPrefixes: [],
    items: [
      { kind: "doc", href: "/docs/getting-started/cli", title: "CLI setup and authentication" },
      { kind: "doc", href: "/docs/reference/commands", title: "Commands" },
    ],
  },
  {
    id: "reviews", title: "Expert help",
    description: "Separately scoped expert work and review evidence.",
    layerChildPrefixes: [],
    items: [
      { kind: "doc", href: "/docs/getting-started/proof-run-buyer-path", title: "Buyer path" },
      { kind: "doc", href: "/docs/getting-started/review-workflow", title: "Review workflow" },
    ],
  },
  {
    id: "model", title: "Evidence reference",
    description: "Receipt profiles, named checks and their limits.",
    layerChildPrefixes: ["/docs/how-it-works", "/docs/evidence", "/docs/quickstart"],
    items: [
      { kind: "doc", href: "/docs/quickstart/verify-first", title: "Verify a receipt" },
      { kind: "doc", href: "/docs/evidence/receipts", title: "Receipt profiles" },
      { kind: "doc", href: "/docs/how-it-works/verification", title: "Verification" },
      { kind: "doc", href: "/docs/how-it-works/proof-model", title: "Review proof model" },
      { kind: "doc", href: "/docs/evidence/receipt-spec", title: "Receipt specification" },
    ],
  },
  {
    id: "operate", title: "Operator reference",
    description: "Documented workflow models, not a list of app features.",
    layerChildPrefixes: ["/docs/audiences", "/docs/governance", "/docs/operations", "/docs/decisions", "/docs/scenarios", "/docs/security-systems"],
    items: [
      { kind: "doc", href: "/docs/audiences", title: "Operator audiences" },
      { kind: "doc", href: "/docs/governance", title: "Governance model" },
      { kind: "doc", href: "/docs/operations/runbooks", title: "Runbook model" },
      { kind: "doc", href: "/docs/security-systems", title: "Architecture and controls" },
    ],
  },
  {
    id: "reference", title: "More reference",
    description: "App vocabulary, technical reference and education.",
    layerChildPrefixes: ["/docs/reference", "/docs/integrations", "/docs/evidence-mapping", "/docs/glossary", "/docs/man", "/docs/security-education"],
    items: [
      { kind: "doc", href: "/docs/glossary", title: "Glossary" },
      { kind: "doc", href: "/docs/reference", title: "Reference" },
      { kind: "doc", href: "/docs/security-education", title: "Security education" },
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

  return OFFSEC_DOCS_LAYERS.map((section) => {
    const curatedItems = section.items
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
      .filter((item): item is DocsNavItem => item !== null);

    return {
      id: section.id,
      title: section.title,
      description: section.description,
      items: curatedItems,
    };
  });
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
  ) ?? OFFSEC_DOCS_LAYERS.find((candidate) =>
    (candidate.layerChildPrefixes ?? []).some(
      (prefix) => href === prefix || href.startsWith(`${prefix}/`),
    ),
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
