import "server-only";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { listDocPages } from "@witnessops/content/docs";
import { z } from "zod";

import { normalizeAskRequest } from "@/lib/server/ask-witnessops/ask-request-normalizer";
import { classifyQuestion } from "@/lib/server/ask-witnessops/authority-classifier";
import { assembleAnswer } from "@/lib/server/ask-witnessops/authority-answer-assembler";
import { executePolicy } from "@/lib/server/ask-witnessops/authority-policy-executor";

const PUBLIC_ORIGIN = "https://witnessops.com";
const MAX_SEARCH_RESULTS = 10;

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
  metadata: z
    .object({
      section: z.string(),
      last_modified: z.string().optional(),
    })
    .optional(),
};

const askOutputSchema = {
  status: z.enum(["success", "closed"]),
  answer: z.string(),
  route: z
    .object({
      id: z.string(),
      url: z.string().url(),
    })
    .nullable(),
  sources: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      url: z.string().url(),
    }),
  ),
  limitation: z.string(),
};

type PublicDoc = Awaited<ReturnType<typeof listDocPages>>[number];

function documentId(doc: PublicDoc): string {
  return doc.slug.length === 0 ? "docs:index" : `docs:${doc.slug.join("/")}`;
}

function documentUrl(doc: PublicDoc): string {
  const suffix = doc.slug.length === 0 ? "" : `/${doc.slug.join("/")}`;
  return `${PUBLIC_ORIGIN}/docs${suffix}`;
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

export async function searchWitnessOpsDocs(query: string) {
  const terms = normalizeTerms(query);
  if (terms.length === 0) return { results: [] };

  const docs = await listDocPages("witnessops");
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

export async function fetchWitnessOpsDoc(id: string) {
  const docs = await listDocPages("witnessops");
  const doc = docs.find((candidate) => documentId(candidate) === id);

  if (!doc) {
    throw new Error("Document not found. Call search first and use a returned id.");
  }

  return {
    id: documentId(doc),
    title: doc.title,
    text: doc.body,
    url: documentUrl(doc),
    metadata: {
      section: doc.section,
      ...(doc.lastModified ? { last_modified: doc.lastModified } : {}),
    },
  };
}

export function askWitnessOps(question: string) {
  const normalized = normalizeAskRequest({ question });
  if (!normalized.ok) throw new Error(normalized.message);

  const classification = classifyQuestion(normalized.request.question);
  const decision = executePolicy({ classification });
  const assembled = assembleAnswer({ policyDecision: decision });

  return {
    status: assembled.status,
    answer: assembled.template.body,
    route: assembled.route
      ? {
          id: assembled.route.route_id,
          url: new URL(assembled.route.href, PUBLIC_ORIGIN).toString(),
        }
      : null,
    sources: assembled.presented_sources.map((source) => ({
      id: source.source_id,
      title: source.public_label,
      url: source.canonical_href,
    })),
    limitation:
      "Public guidance only. This result does not verify a private system, customer evidence, or receipt.",
  };
}

function compatibleResult<T>(value: T) {
  return {
    structuredContent: value,
    content: [{ type: "text" as const, text: JSON.stringify(value) }],
  };
}

async function observeToolCall<T>(
  tool: string,
  execute: () => T | Promise<T>,
): Promise<T> {
  const startedAt = performance.now();

  try {
    const result = await execute();
    console.info("[witnessops-mcp] tool completed", {
      tool,
      status: "ok",
      duration_ms: Math.round(performance.now() - startedAt),
    });
    return result;
  } catch (error) {
    console.error("[witnessops-mcp] tool failed", {
      tool,
      status: "error",
      error_name: error instanceof Error ? error.name : "UnknownError",
      duration_ms: Math.round(performance.now() - startedAt),
    });
    throw error;
  }
}

export function createWitnessOpsMcpServer(): McpServer {
  const server = new McpServer(
    {
      name: "witnessops-public-knowledge",
      version: "1.0.0",
    },
    {
      instructions:
        "Use search to find public WitnessOps documentation and fetch to read a selected result. Use ask_witnessops for bounded public guidance; if it returns closed, use search and fetch instead. Never treat these tools as verification of a private system, customer evidence, or a receipt, and never send secrets or private evidence.",
    },
  );

  server.registerTool(
    "search",
    {
      title: "Search WitnessOps documentation",
      description:
        "Use this when the user wants to find relevant public WitnessOps documentation. Call fetch with a returned id to read the full document.",
      inputSchema: {
        query: z.string().trim().min(1).max(500),
      },
      outputSchema: searchOutputSchema,
      annotations: readOnlyAnnotations,
    },
    async ({ query }) =>
      observeToolCall("search", async () =>
        compatibleResult(await searchWitnessOpsDocs(query)),
      ),
  );

  server.registerTool(
    "fetch",
    {
      title: "Fetch a WitnessOps document",
      description:
        "Use this after search when the user needs the full text of one public WitnessOps document and a canonical citation URL.",
      inputSchema: {
        id: z.string().trim().min(1).max(500),
      },
      outputSchema: fetchOutputSchema,
      annotations: readOnlyAnnotations,
    },
    async ({ id }) =>
      observeToolCall("fetch", async () =>
        compatibleResult(await fetchWitnessOpsDoc(id)),
      ),
  );

  server.registerTool(
    "ask_witnessops",
    {
      title: "Ask WitnessOps",
      description:
        "Use this only for bounded public WitnessOps fit checks, support or disclosure routing, named proof or receipt guidance, and one explicitly scoped vendor, AI-agent, incident, access, launch, or offline-inspection request. Use search and fetch for general questions or documentation.",
      inputSchema: {
        question: z.string().trim().min(1).max(2000),
      },
      outputSchema: askOutputSchema,
      annotations: readOnlyAnnotations,
    },
    async ({ question }) =>
      observeToolCall("ask_witnessops", () =>
        compatibleResult(askWitnessOps(question)),
      ),
  );

  return server;
}
