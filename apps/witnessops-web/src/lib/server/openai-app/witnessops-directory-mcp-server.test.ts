import assert from "node:assert/strict";
import test from "node:test";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

import {
  createWitnessOpsDirectoryMcpServer,
  fetchWitnessOpsDirectoryDoc,
  searchWitnessOpsDirectory,
  WITNESSOPS_PUBLIC_DIRECTORY_DOC_SLUGS,
} from "./witnessops-directory-mcp-server";

const expectedDocumentIds: readonly string[] = [
  "docs:evidence",
  "docs:evidence/receipts",
  "docs:evidence/receipt-spec",
  "docs:how-it-works/verification",
];

function assertTextResultMatchesStructuredContent(result: unknown) {
  const candidate = result as {
    content?: unknown;
    structuredContent?: unknown;
  };
  assert.ok(Array.isArray(candidate.content));
  assert.equal(candidate.content.length, 1);
  const item = candidate.content[0] as { type?: string; text?: string };
  assert.equal(item.type, "text");
  assert.equal(typeof item.text, "string");
  assert.deepEqual(JSON.parse(item.text!), candidate.structuredContent);
}

test("directory search and fetch expose only the curated public corpus", async () => {
  assert.deepEqual(
    WITNESSOPS_PUBLIC_DIRECTORY_DOC_SLUGS.map((slug) => `docs:${slug}`),
    expectedDocumentIds,
  );
  const curatedDocs = await Promise.all(
    expectedDocumentIds.map((id) => fetchWitnessOpsDirectoryDoc(id)),
  );
  assert.deepEqual(
    curatedDocs.map((doc) => doc.id),
    expectedDocumentIds,
  );

  const search = await searchWitnessOpsDirectory(
    "evidence receipt specification verification",
  );

  assert.ok(search.results.length > 0);
  assert.ok(
    search.results.every((result) => expectedDocumentIds.includes(result.id)),
  );
  assert.ok(
    search.results.every((result) => {
      const url = new URL(result.url);
      return (
        url.origin === "https://witnessops.com" &&
        url.pathname.startsWith("/docs/")
      );
    }),
  );

  const fetched = await fetchWitnessOpsDirectoryDoc(search.results[0]!.id);
  assert.deepEqual(Object.keys(fetched), ["id", "title", "text", "url"]);
  assert.equal(fetched.id, search.results[0]!.id);
  assert.equal(fetched.url, search.results[0]!.url);
  assert.ok(fetched.text.length > 0);
});

test("directory fetch denies documents outside the explicit allowlist", async () => {
  await assert.rejects(
    () =>
      fetchWitnessOpsDirectoryDoc("docs:integrations/witnessops-catalog"),
    /not found in the public directory/i,
  );
  await assert.rejects(
    () =>
      fetchWitnessOpsDirectoryDoc(
        "docs:getting-started/proof-run-buyer-path",
      ),
    /not found in the public directory/i,
  );
});

test("directory MCP server advertises the standard read-only search/fetch contract", async (t) => {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createWitnessOpsDirectoryMcpServer();
  const client = new Client({
    name: "witnessops-directory-test",
    version: "1.0.0",
  });

  t.after(async () => {
    await Promise.allSettled([client.close(), server.close()]);
  });

  await server.connect(serverTransport);
  await client.connect(clientTransport);

  const listed = await client.listTools();
  assert.deepEqual(
    listed.tools.map((tool) => tool.name).sort(),
    ["fetch", "search"],
  );
  assert.ok(
    listed.tools.every(
      (tool) =>
        tool.annotations?.readOnlyHint === true &&
        tool.annotations?.destructiveHint === false &&
        tool.annotations?.openWorldHint === false &&
        tool.annotations?.idempotentHint === true,
    ),
  );

  const searchResult = await client.callTool({
    name: "search",
    arguments: { query: "receipt verification" },
  });
  assert.equal(searchResult.isError, undefined);
  assertTextResultMatchesStructuredContent(searchResult);

  const searchPayload = searchResult.structuredContent as {
    results: Array<{ id: string; title: string; url: string }>;
  };
  assert.deepEqual(Object.keys(searchPayload), ["results"]);
  assert.ok(searchPayload.results.length > 0);
  assert.ok(
    searchPayload.results.every(
      (result) =>
        expectedDocumentIds.includes(result.id) &&
        Object.keys(result).join(",") === "id,title,url",
    ),
  );

  const fetchResult = await client.callTool({
    name: "fetch",
    arguments: { id: searchPayload.results[0]!.id },
  });
  assert.equal(fetchResult.isError, undefined);
  assertTextResultMatchesStructuredContent(fetchResult);
  assert.deepEqual(Object.keys(fetchResult.structuredContent ?? {}), [
    "id",
    "title",
    "text",
    "url",
  ]);

  const excludedResult = await client.callTool({
    name: "fetch",
    arguments: { id: "docs:integrations/witnessops-catalog" },
  });
  assert.equal(excludedResult.isError, true);
});
