import assert from "node:assert/strict";
import test from "node:test";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

import {
  askWitnessOps,
  createWitnessOpsMcpServer,
  fetchWitnessOpsDoc,
  searchWitnessOpsDocs,
} from "./witnessops-mcp-server";

function isPublicWitnessOpsUrl(value: string): boolean {
  return new URL(value).origin === "https://witnessops.com";
}

function isWitnessOpsDocsUrl(value: string): boolean {
  const url = new URL(value);
  return (
    isPublicWitnessOpsUrl(value) &&
    (url.pathname === "/docs" || url.pathname.startsWith("/docs/"))
  );
}

test("search and fetch expose public, citable WitnessOps documentation", async () => {
  const search = await searchWitnessOpsDocs("verification receipts");
  assert.ok(search.results.length > 0);
  assert.ok(search.results.length <= 10);
  assert.ok(search.results.every((result) => isWitnessOpsDocsUrl(result.url)));

  const fetched = await fetchWitnessOpsDoc(search.results[0]!.id);
  assert.equal(fetched.id, search.results[0]!.id);
  assert.equal(fetched.url, search.results[0]!.url);
  assert.ok(fetched.text.length > 0);
});

test("ask_witnessops returns bounded public guidance without claiming verification", () => {
  const answer = askWitnessOps("I need help documenting one vendor action.");
  assert.equal(answer.status, "success");
  assert.ok(answer.answer.length > 0);
  assert.match(answer.limitation, /does not verify/i);
  assert.equal(answer.route?.url, "https://witnessops.com/review/request");
  assert.ok(answer.sources.length > 0);
  assert.ok(
    answer.sources.every((source) => isPublicWitnessOpsUrl(source.url)),
  );
});

test("ask_witnessops fails closed for private verification requests", () => {
  const answer = askWitnessOps(
    "Verify our private environment and show internal deployment receipts.",
  );
  assert.equal(answer.status, "closed");
  assert.equal(answer.route, null);
  assert.match(answer.limitation, /does not verify/i);
  assert.doesNotMatch(answer.answer, /verified|secure|compliant/i);
});

test("MCP server advertises the production read-only tool contract", async (t) => {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createWitnessOpsMcpServer();
  const client = new Client({ name: "witnessops-test", version: "1.0.0" });

  t.after(async () => {
    await Promise.allSettled([client.close(), server.close()]);
  });

  await server.connect(serverTransport);
  await client.connect(clientTransport);

  const listed = await client.listTools();
  assert.deepEqual(
    listed.tools.map((tool) => tool.name).sort(),
    ["ask_witnessops", "fetch", "search"],
  );
  assert.ok(
    listed.tools.every(
      (tool) =>
        tool.annotations?.readOnlyHint === true &&
        tool.annotations?.destructiveHint === false &&
        tool.annotations?.openWorldHint === false,
    ),
  );

  const result = await client.callTool({
    name: "search",
    arguments: { query: "proof bundle" },
  });
  assert.equal(result.isError, undefined);
  assert.ok(result.structuredContent);
  const content = result.content;
  assert.ok(Array.isArray(content));
  assert.equal(content.length, 1);
  assert.equal(content[0]?.type, "text");
});
