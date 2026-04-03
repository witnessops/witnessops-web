import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { z } from "zod";
import { getCanonicalSurfaceUrl } from "@witnessops/config";

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
const NonEmptyString = z.string().trim().min(1);
const DateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD date string");
const SignalDateSchema = z.preprocess((value) => {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return value;
}, DateString);
const UrlPathOrAbsolute = z
  .string()
  .trim()
  .min(1)
  .refine(
    (value) =>
      value.startsWith("/") ||
      value.startsWith("http://") ||
      value.startsWith("https://"),
    {
      message: "Expected a root-relative path or absolute URL",
    },
  );

export const SignalTypeSchema = z.enum([
  "availability",
  "verification",
  "receipts",
  "bundles",
  "docs",
  "policy",
  "security",
  "legal",
  "incident",
  "deprecation",
]);

export const SignalLinkSchema = z.object({
  label: NonEmptyString,
  href: UrlPathOrAbsolute,
});

export const SignalFrontmatterSchema = z.object({
  title: NonEmptyString,
  date: SignalDateSchema,
  type: SignalTypeSchema,
  summary: NonEmptyString.max(220),
  impact: NonEmptyString,
  invariant: NonEmptyString,
  action: NonEmptyString.optional(),
  published: z.boolean().default(true),
  order: z.number().int().optional(),
  links: z.array(SignalLinkSchema).max(6).optional(),
});

export type SignalType = z.infer<typeof SignalTypeSchema>;
export type SignalLink = z.infer<typeof SignalLinkSchema>;
export type SignalFrontmatter = z.infer<typeof SignalFrontmatterSchema>;

export type SignalEntry = SignalFrontmatter & {
  slug: string;
  body: string;
  sourcePath: string;
  lastModified: string;
};

function getSignalsRoot() {
  const candidates = [
    path.resolve(process.cwd(), "../../content/witnessops/signals"),
    path.resolve(process.cwd(), "content/witnessops/signals"),
  ];

  return (
    candidates.find((candidate) => fs.existsSync(candidate)) ?? candidates[0]
  );
}

function parseSignalDocument(source: string) {
  const match = source.match(FRONTMATTER_PATTERN);

  if (!match) {
    throw new Error("Missing required signal frontmatter block");
  }

  return {
    frontmatter: SignalFrontmatterSchema.parse(yaml.load(match[1])),
    body: source.slice(match[0].length).trim(),
  };
}

function sortSignals(left: SignalEntry, right: SignalEntry) {
  if (left.date !== right.date) {
    return left.date < right.date ? 1 : -1;
  }

  const leftOrder = left.order ?? 0;
  const rightOrder = right.order ?? 0;

  if (leftOrder !== rightOrder) {
    return rightOrder - leftOrder;
  }

  return left.title.localeCompare(right.title);
}

function toSignalEntry(filePath: string): SignalEntry {
  const raw = fs.readFileSync(filePath, "utf-8");
  const stats = fs.statSync(filePath);
  const { frontmatter, body } = parseSignalDocument(raw);
  const fileName = path.basename(filePath);
  const slug = fileName.replace(/\.mdx$/, "");

  return {
    ...frontmatter,
    slug,
    body,
    sourcePath: path.posix.join("content", "witnessops", "signals", fileName),
    lastModified: stats.mtime.toISOString(),
  };
}

export async function listSignals(): Promise<SignalEntry[]> {
  const signalsRoot = getSignalsRoot();

  if (!fs.existsSync(signalsRoot)) {
    return [];
  }

  return fs
    .readdirSync(signalsRoot)
    .filter((fileName) => fileName.endsWith(".mdx"))
    .map((fileName) => toSignalEntry(path.join(signalsRoot, fileName)))
    .filter((entry) => entry.published)
    .sort(sortSignals);
}

export function getSignalsCanonicalUrl() {
  return getCanonicalSurfaceUrl("witnessops", "/signals");
}
