import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import test from "node:test";

import { decideMcp } from "./guard-mcp.mjs";

test("desktop-commander and Dc-xai namespaces are denied", () => {
  for (const input of [
    { mcp_server_name: "desktop-commander", tool_name: "read_file" },
    { mcp_server_name: "Desktop-Commander", tool_name: "start_process" },
    { mcp_server_name: "Dc-xai", tool_name: "ping" },
    { mcp_server_name: "dc-xai", tool_name: "ping" },
    { mcp_server_name: "other", command: "npx desktop-commander" },
    { mcp_server_name: "other", url: "https://example.test/dc-xai" },
  ]) {
    assert.equal(decideMcp(input).permission, "deny", JSON.stringify(input));
  }
});

test("other MCP servers stay allowed", () => {
  assert.equal(
    decideMcp({ mcp_server_name: "linear", tool_name: "list_issues" }).permission,
    "allow",
  );
  assert.equal(
    decideMcp({ mcp_server_name: "github", tool_name: "get_file" }).permission,
    "allow",
  );
});

test("the hook CLI returns deny JSON for desktop-commander", () => {
  const script = resolve(import.meta.dirname, "guard-mcp.mjs");
  const result = spawnSync(process.execPath, [script], {
    input: JSON.stringify({ mcp_server_name: "desktop-commander", tool_name: "read_file" }),
    encoding: "utf8",
  });
  assert.equal(result.status, 0);
  assert.equal(JSON.parse(result.stdout).permission, "deny");
});
