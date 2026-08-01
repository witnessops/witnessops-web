import "server-only";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { listDocPages } from "@witnessops/content/docs";
import { z } from "zod";

const PUBLIC_ORIGIN = "https://witnessops.com";
const MAX_SEARCH_RESULTS = 10;

export const WITNESSOPS_PUBLIC_DIRECTORY_DOC_SLUGS = [
  "evidence",
  "evidence/receipts",
  "evidence/receipt-spec",
  "how-it-works/verification",
] as const;

const publicDirectoryDocSlugSet = new Set<string>(
  WITNESSOPS_PUBLIC_DIRECTORY_DOC_SLUGS,
);

const readOnlyAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: false,
  idempotentHint: true,
} as const;

const searchOutputSchema = {
  results: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      url: z.string().url(),
    }),
  ),
};

const fetchOutputSchema = {
  id: z.string(),
  title: z.string(),
  text: z.string(),
  url: z.string().url(),
};

type PublicDoc = Awaited<ReturnType<typeof listDocPages>>[number];

function documentSlug(doc: PublicDoc): string {
  return doc.slug.join("/");
}

function documentId(doc: PublicDoc): string {
  return `docs:${documentSlug(doc)}`;
}

function documentUrl(doc: PublicDoc): string {
  return `${PUBLIC_ORIGIN}/docs/${documentSlug(doc)}`;
}

function normalizeTerms(value: string): string[] {
  return [
    ...new Set(
      value
        .toLocaleLowerCase("en-US")
        .split(/[^a-z0-9]+/)
        .filter((term) => term.length >= 2)
        .map((term) =>
          term.length > 4 && term.endsWith("s") ? term.slice(0, -1) : term,
        ),
    ),
  ];
}

function scoreDocument(doc: PublicDoc, terms: readonly string[]): number {
  const title = doc.title.toLocaleLowerCase("en-US");
  const description = (doc.description ?? "").toLocaleLowerCase("en-US");
  const body = doc.body.toLocaleLowerCase("en-US");

  return terms.reduce((score, term) => {
    if (title.includes(term)) score += 8;
    if (description.includes(term)) score += 4;
    if (body.includes(term)) score += 1;
    return score;
  }, 0);
}

async function listPublicDirectoryDocs(): Promise<PublicDoc[]> {
  const docs = await listDocPages("witnessops");
  return docs.filter((doc) =>
    publicDirectoryDocSlugSet.has(documentSlug(doc)),
  );
}

export async function searchWitnessOpsDirectory(query: string) {
  const terms = normalizeTerms(query);
  if (terms.length === 0) return { results: [] };

  const docs = await listPublicDirectoryDocs();
  const results = docs
    .map((doc) => ({ doc, score: scoreDocument(doc, terms) }))
    .filter(({ score }) => score > 0)
    .sort(
      (left, right) =>
        right.score - left.score || left.doc.title.localeCompare(right.doc.title),
    )
    .slice(0, MAX_SEARCH_RESULTS)
    .map(({ doc }) => ({
      id: documentId(doc),
      title: doc.title,
      url: documentUrl(doc),
    }));

  return { results };
}

export async function fetchWitnessOpsDirectoryDoc(id: string) {
  const docs = await listPublicDirectoryDocs();
  const doc = docs.find((candidate) => documentId(candidate) === id);

  if (!doc) {
    throw new Error(
      "Document not found in the public directory. Call search first and use a returned id.",
    );
  }

  return {
    id: documentId(doc),
    title: doc.title,
    text: doc.body,
    url: documentUrl(doc),
  };
}

function compatibleResult<T extends Record<string, unknown>>(value: T) {
  return {
    structuredContent: value,
    content: [{ type: "text" as const, text: JSON.stringify(value) }],
  };
}

export function createWitnessOpsDirectoryMcpServer(): McpServer {
  const server = new McpServer(
    {
      name: "witnessops-public-directory",
      version: "1.0.0",
    },
    {
      instructions:
        "Search and fetch a curated public WitnessOps reference about evidence, receipts, receipt fields, and verification. This directory does not provide pricing, offers, consulting, onboarding, commercial qualification, lead generation, fit checks, or private-system verification.",
    },
  );

  server.registerTool(
    "search",
    {
      title: "Search the WitnessOps public directory",
      description:
        "Use this when the user needs public WitnessOps documentation about evidence, receipts, receipt fields, or verification. Call fetch with a returned id to read the selected document.",
      inputSchema: {
        query: z.string().trim().min(1).max(500),
      },
      outputSchema: searchOutputSchema,
      annotations: readOnlyAnnotations,
    },
    async ({ query }) =>
      compatibleResult(await searchWitnessOpsDirectory(query)),
  );

  server.registerTool(
    "fetch",
    {
      title: "Fetch a WitnessOps public document",
      description:
        "Use this after search when the user needs the full text and canonical URL of one document returned by the WitnessOps public directory.",
      inputSchema: {
        id: z.string().trim().min(1).max(500),
      },
      outputSchema: fetchOutputSchema,
      annotations: readOnlyAnnotations,
    },
    async ({ id }) =>
      compatibleResult(await fetchWitnessOpsDirectoryDoc(id)),
  );

  return server;
}
