import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import {
  parseContentFrontmatter,
  type ContentFrontmatter,
  type ContentSection,
  type ContentTrustBoundaryVariant,
  parseWitnessOpsHome,
  type WitnessOpsHome,
} from "@witnessops/content";

const CONTENT_ROOT = path.resolve(process.cwd(), "../../content/witnessops");
const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

export interface ContentDocument {
  slug: string;
  title: string;
  navLabel: string;
  description: string;
  order: number;
  draft: boolean;
  body: string;
  section: "docs" | "legal" | "support";
  sourcePath: string;
  lastModified: string;
  trustBoundaryVariant?: ContentTrustBoundaryVariant;
}

export function loadHomeContent(): WitnessOpsHome {
  const raw = fs.readFileSync(
    path.join(CONTENT_ROOT, "landing/home.yaml"),
    "utf-8",
  );
  const data = yaml.load(raw);
  return parseWitnessOpsHome(data);
}

export function loadYaml<T = unknown>(relativePath: string): T {
  const raw = fs.readFileSync(path.join(CONTENT_ROOT, relativePath), "utf-8");
  return yaml.load(raw) as T;
}

function parseFrontmatter(source: string): {
  frontmatter: ContentFrontmatter;
  body: string;
} {
  const match = source.match(FRONTMATTER_PATTERN);

  if (!match) {
    throw new Error("Missing required content frontmatter block");
  }

  const rawFrontmatter = yaml.load(match[1]);
  const body = source.slice(match[0].length).trim();

  return {
    frontmatter: parseContentFrontmatter(rawFrontmatter),
    body,
  };
}

function stripLeadingTitle(body: string): string {
  return body.replace(/^#\s+.+?(?:\r?\n){1,2}/, "").trim();
}

function toDocument(
  section: ContentSection,
  fileName: string,
): ContentDocument {
  const filePath = path.join(CONTENT_ROOT, section, fileName);
  const raw = fs.readFileSync(filePath, "utf-8");
  const stats = fs.statSync(filePath);
  const { frontmatter, body } = parseFrontmatter(raw);
  const slug = fileName.replace(/\.mdx$/, "");
  const validatedFrontmatter = parseContentFrontmatter(frontmatter, section);

  return {
    slug,
    title: validatedFrontmatter.title,
    navLabel: validatedFrontmatter.nav_label,
    description: validatedFrontmatter.description,
    order: validatedFrontmatter.order,
    draft: validatedFrontmatter.draft,
    body: stripLeadingTitle(body),
    section,
    sourcePath: path.posix.join("content/witnessops", section, fileName),
    lastModified: stats.mtime.toISOString(),
    trustBoundaryVariant: validatedFrontmatter.trust_boundary_variant,
  };
}

function sortDocuments(documents: ContentDocument[]): ContentDocument[] {
  return [...documents].sort((left, right) => {
    if (left.order !== right.order) {
      return left.order - right.order;
    }

    return left.navLabel.localeCompare(right.navLabel);
  });
}

function loadCollection(section: ContentSection): ContentDocument[] {
  const directory = path.join(CONTENT_ROOT, section);
  const fileNames = fs
    .readdirSync(directory)
    .filter((fileName) => fileName.endsWith(".mdx"));

  return sortDocuments(
    fileNames
      .map((fileName) => toDocument(section, fileName))
      .filter((document) => !document.draft),
  );
}

function loadDocument(
  section: ContentSection,
  slug: string,
): ContentDocument | null {
  const filePath = path.join(CONTENT_ROOT, section, `${slug}.mdx`);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const document = toDocument(section, `${slug}.mdx`);
  return document.draft ? null : document;
}

export function loadDocsIndex(): ContentDocument[] {
  return loadCollection("docs");
}

export function loadDocBySlug(slug: string): ContentDocument | null {
  return loadDocument("docs", slug);
}

export function loadSupportIndex(): ContentDocument[] {
  return loadCollection("support");
}

export function loadSupportPage(slug: string): ContentDocument | null {
  return loadDocument("support", slug);
}

export function loadLegalIndex(): ContentDocument[] {
  return loadCollection("legal");
}

export function loadLegalPage(slug: string): ContentDocument | null {
  return loadDocument("legal", slug);
}
