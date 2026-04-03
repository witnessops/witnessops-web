import fs from "node:fs";
import path from "node:path";
import { getDocCanonicalUrl } from "./canonical";
import { parseFrontmatterDocument } from "./frontmatter";
import { normalizeMarkdownBody } from "./markdown";
import type { ContentTrustBoundaryVariant } from "./content";

export type DocsSurface = "witnessops";

export type DocPage = {
  slug: string[];
  title: string;
  description?: string;
  section: string;
  order?: number;
  body: string;
  sourcePath: string;
  navLabel?: string;
  lastModified?: string;
  pageAnswer?: {
    question: string;
    links: Array<{ href: string; label: string }>;
  };
  trustBoundaryVariant?: ContentTrustBoundaryVariant;
};

type LoadedDocPage = DocPage & {
  draft: boolean;
  isIndex: boolean;
  filePath: string;
};

const LEGACY_DOC_REDIRECTS: Record<DocsSurface, Record<string, string[]>> = {
  witnessops: {
    overview: ["security-systems"],
    "governed-execution": ["security-systems", "governed-execution"],
    "policy-gates": ["security-systems", "policy-gates"],
    "execution-chains": ["evidence", "execution-chains"],
    "receipt-spec": ["evidence", "receipt-spec"],
  },
};

const DOCS_ROOTS: Record<DocsSurface, string> = {
  witnessops: path.resolve(process.cwd(), "../../content/witnessops/docs"),
};

function getDocsRoot(surface: DocsSurface) {
  return DOCS_ROOTS[surface];
}

function normalizeSlug(slug: string[]) {
  return slug.filter(Boolean);
}

function slugKey(slug: string[]) {
  return normalizeSlug(slug).join("/");
}

function titleize(segment: string) {
  return segment
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

const DOC_SECTION_TITLES: Record<string, string> = {
  root: "Entry Surface",
  architecture: "Architecture Domain",
  "evidence-mapping": "Evidence Mapping",
  faq: "Interpretation Notes",
  "getting-started": "Orientation",
  governance: "Governance Domain",
  glossary: "Terminology Registry",
  operators: "Operator Surface",
  "proof-bundles": "Proof Bundle Specification",
  protocol: "Protocol Core",
  reference: "Reference Registry",
  verification: "Verification Surface",
};

const DOC_SECTION_DESCRIPTORS: Record<string, string> = {
  root: "Entry references, glossary material, and canonical orientation for the verification surface.",
  architecture:
    "Normative topology, proof fabric boundaries, and system composition.",
  "evidence-mapping":
    "Framework-facing templates that map governed execution evidence to external control regimes.",
  faq: "Interpretive guidance and clarification points for protocol readers and reviewers.",
  "getting-started":
    "Entry material and reading order for first-pass implementers and operators.",
  governance:
    "Governance controls, approval rules, and accountable operating contracts.",
  glossary:
    "Canonical protocol terminology, artifact names, and verification language.",
  operators:
    "Operational procedures, execution controls, and protocol-facing operator guidance.",
  "proof-bundles":
    "Normative bundle formats, manifest rules, and portable proof structure.",
  protocol: "Core protocol concepts, invariants, and contract definitions.",
  reference:
    "Canonical registries, field definitions, and implementer reference material.",
  verification:
    "Verification semantics, offline validation, and verifier procedures.",
};

function parseDocument(filePath: string, surface: DocsSurface): LoadedDocPage {
  const raw = fs.readFileSync(filePath, "utf-8");
  const { frontmatter, body } = parseFrontmatterDocument(raw);
  const docsRoot = getDocsRoot(surface);
  const relativePath = path.relative(docsRoot, filePath);
  const segments = relativePath.split(path.sep);
  const fileName = segments.pop();

  if (!fileName) {
    throw new Error(`Unable to resolve document filename for ${filePath}`);
  }

  const stem = fileName.replace(/\.mdx$/, "");
  const isIndex = stem === "index";
  const slug = isIndex ? segments : [...segments, stem];
  const stats = fs.statSync(filePath);

  return {
    slug,
    title: frontmatter.title,
    description: frontmatter.description,
    section: segments[0] ?? "root",
    order: frontmatter.order,
    body: normalizeMarkdownBody(body),
    sourcePath: path.posix.join(
      "content",
      surface,
      "docs",
      ...segments,
      fileName,
    ),
    navLabel: frontmatter.nav_label,
    lastModified: stats.mtime.toISOString(),
    pageAnswer: frontmatter.page_answer,
    trustBoundaryVariant: frontmatter.trust_boundary_variant,
    draft: frontmatter.draft,
    isIndex,
    filePath,
  };
}

function walkDocsDirectory(root: string): string[] {
  if (!fs.existsSync(root)) {
    return [];
  }

  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(root, entry.name);

    if (entry.isDirectory()) {
      return walkDocsDirectory(entryPath);
    }

    if (!entry.name.endsWith(".mdx")) {
      return [];
    }

    return [entryPath];
  });
}

function compareDocs(left: LoadedDocPage, right: LoadedDocPage) {
  const leftDepth = left.slug.length;
  const rightDepth = right.slug.length;

  if (leftDepth !== rightDepth) {
    return leftDepth - rightDepth;
  }

  const leftOrder = left.order ?? Number.MAX_SAFE_INTEGER;
  const rightOrder = right.order ?? Number.MAX_SAFE_INTEGER;

  if (leftOrder !== rightOrder) {
    return leftOrder - rightOrder;
  }

  return left.title.localeCompare(right.title);
}

function loadAllDocPages(surface: DocsSurface): LoadedDocPage[] {
  const docsRoot = getDocsRoot(surface);

  return walkDocsDirectory(docsRoot)
    .map((filePath) => parseDocument(filePath, surface))
    .filter((doc) => !doc.draft)
    .sort(compareDocs);
}

function toPublicDocPage(doc: LoadedDocPage): DocPage {
  return {
    slug: doc.slug,
    title: doc.title,
    description: doc.description,
    section: doc.section,
    order: doc.order,
    body: doc.body,
    sourcePath: doc.sourcePath,
    navLabel: doc.navLabel,
    lastModified: doc.lastModified,
    pageAnswer: doc.pageAnswer,
    trustBoundaryVariant: doc.trustBoundaryVariant,
  };
}

export async function listDocPages(surface: DocsSurface): Promise<DocPage[]> {
  return loadAllDocPages(surface).map(toPublicDocPage);
}

export async function getDocPage(
  surface: DocsSurface,
  slug: string[],
): Promise<DocPage | null> {
  const normalizedSlug = getCanonicalDocSlug(surface, slug);
  const docs = loadAllDocPages(surface);
  const candidateSlugs = [normalizedSlug];

  if (normalizedSlug.length > 0) {
    candidateSlugs.push([...normalizedSlug, "index"]);
    candidateSlugs.push([...normalizedSlug, "overview"]);
  }

  const matchedDoc = docs.find((doc) =>
    candidateSlugs.some((candidate) => {
      if (doc.slug.length !== candidate.length) {
        return false;
      }

      return doc.slug.every((segment, index) => segment === candidate[index]);
    }),
  );

  return matchedDoc ? toPublicDocPage(matchedDoc) : null;
}

export function getDocHref(slug: string[]) {
  return slug.length === 0 ? "/docs" : `/docs/${slug.join("/")}`;
}

export function getLegacyDocRedirectSlug(
  surface: DocsSurface,
  slug: string[],
): string[] | null {
  const normalizedSlug = normalizeSlug(slug);
  const redirectSlug = LEGACY_DOC_REDIRECTS[surface][slugKey(normalizedSlug)];

  if (!redirectSlug) {
    return null;
  }

  return slugKey(redirectSlug) === slugKey(normalizedSlug)
    ? null
    : redirectSlug;
}

export function getCanonicalDocSlug(surface: DocsSurface, slug: string[]) {
  return getLegacyDocRedirectSlug(surface, slug) ?? normalizeSlug(slug);
}

export function getDocSectionTitle(section: string) {
  return DOC_SECTION_TITLES[section] ?? titleize(section);
}

export function getDocSectionDescriptor(section: string) {
  return (
    DOC_SECTION_DESCRIPTORS[section] ??
    "Canonical specification material for this protocol domain."
  );
}

export { getDocCanonicalUrl };
