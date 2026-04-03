import fs from "node:fs";
import path from "node:path";

type ValidationIssue = {
  severity: "error" | "warning";
  message: string;
};

const repoRoot = path.resolve(__dirname, "..");
const requiredFrontmatterFields = [
  "title",
  "description",
  "section",
  "order",
  "nav_label",
  "draft",
];

function walkFiles(root: string): string[] {
  if (!fs.existsSync(root)) {
    return [];
  }

  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(root, entry.name);

    if (entry.isDirectory()) {
      return walkFiles(entryPath);
    }

    return [entryPath];
  });
}

function extractFrontmatter(source: string) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  return match?.[1] ?? null;
}

function getFieldValue(frontmatter: string, key: string) {
  const match = frontmatter.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
  return match?.[1]?.trim() ?? null;
}

function getDocSlug(relativePath: string) {
  const normalized = relativePath.replace(/\\/g, "/");
  const withoutExtension = normalized.replace(/\.mdx$/, "");
  const segments = withoutExtension.split("/");
  const fileName = segments[segments.length - 1];

  if (fileName === "index") {
    return segments.slice(0, -1).join("/");
  }

  return withoutExtension;
}

function findDocLinks(source: string) {
  const matches = source.match(/\[[^\]]+\]\((\/docs\/[^)]+)\)/g) ?? [];
  return matches.map((match) => {
    const link = match.match(/\((\/docs\/[^)]+)\)/)?.[1] ?? "";
    return link.replace(/^\/docs\//, "").replace(/\/$/, "");
  });
}

function getActiveDocsSurfaces(): string[] {
  const contentRoot = path.join(repoRoot, "content");

  if (!fs.existsSync(contentRoot)) {
    return [];
  }

  return fs
    .readdirSync(contentRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((surface) =>
      fs.existsSync(path.join(contentRoot, surface, "docs")),
    );
}

function validateSurface(surface: string): ValidationIssue[] {
  const docsRoot = path.join(repoRoot, "content", surface, "docs");

  if (!fs.existsSync(docsRoot)) {
    return [];
  }

  const files = walkFiles(docsRoot).filter((filePath) => filePath.endsWith(".mdx"));
  const issues: ValidationIssue[] = [];
  const slugs = new Map<string, string>();
  const inboundCounts = new Map<string, number>();
  const topLevelDirectories = fs
    .readdirSync(docsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  for (const directory of topLevelDirectories) {
    const hasIndex = fs.existsSync(path.join(docsRoot, directory, "index.mdx"));
    const hasOverview = fs.existsSync(path.join(docsRoot, directory, "overview.mdx"));

    if (!hasIndex && !hasOverview) {
      issues.push({
        severity: "error",
        message: `Missing section landing in content/${surface}/docs/${directory} (expected index.mdx or overview.mdx)`,
      });
    }
  }

  for (const filePath of files) {
    const relativePath = path.relative(docsRoot, filePath);
    const source = fs.readFileSync(filePath, "utf-8");
    const frontmatter = extractFrontmatter(source);
    const slug = getDocSlug(relativePath);

    if (!frontmatter) {
      issues.push({
        severity: "error",
        message: `Missing frontmatter: content/${surface}/docs/${relativePath.replace(/\\/g, "/")}`,
      });
      continue;
    }

    for (const field of requiredFrontmatterFields) {
      if (!getFieldValue(frontmatter, field)) {
        issues.push({
          severity: "error",
          message: `Missing ${field} in content/${surface}/docs/${relativePath.replace(/\\/g, "/")}`,
        });
      }
    }

    const section = getFieldValue(frontmatter, "section")?.replaceAll('"', "");

    if (section !== "docs") {
      issues.push({
        severity: "error",
        message: `Invalid section in content/${surface}/docs/${relativePath.replace(/\\/g, "/")} (expected docs)`,
      });
    }

    const priorPath = slugs.get(slug);

    if (priorPath) {
      issues.push({
        severity: "error",
        message: `Duplicate slug ${slug || "/"} in content/${surface}/docs/${priorPath} and content/${surface}/docs/${relativePath.replace(/\\/g, "/")}`,
      });
    } else {
      slugs.set(slug, relativePath.replace(/\\/g, "/"));
    }

    for (const linkedSlug of findDocLinks(source)) {
      inboundCounts.set(linkedSlug, (inboundCounts.get(linkedSlug) ?? 0) + 1);
    }
  }

  for (const [slug, relativePath] of slugs.entries()) {
    const isRootDoc = slug === "" || !slug.includes("/");
    const inboundCount = inboundCounts.get(slug) ?? 0;

    if (!isRootDoc && inboundCount === 0) {
      issues.push({
        severity: "warning",
        message: `Orphan doc slug ${slug} in content/${surface}/docs/${relativePath}`,
      });
    }
  }

  for (const [linkedSlug] of inboundCounts.entries()) {
    if (!slugs.has(linkedSlug)) {
      issues.push({
        severity: "error",
        message: `Broken internal docs link /docs/${linkedSlug}`,
      });
    }
  }

  return issues;
}

const issues = getActiveDocsSurfaces().flatMap((surface) =>
  validateSurface(surface),
);

if (issues.length === 0) {
  console.log("Docs validation passed.");
  process.exit(0);
}

for (const issue of issues) {
  const prefix = issue.severity === "error" ? "ERROR" : "WARN";
  console.log(`${prefix}: ${issue.message}`);
}

if (issues.some((issue) => issue.severity === "error")) {
  process.exit(1);
}

process.exit(0);
