import assert from "node:assert/strict";
import test from "node:test";

import { equalHash, parseClientId } from "./auth";

test("timing-safe compare rejects a different length without throwing", () => {
  assert.equal(equalHash(Buffer.from("aa"), Buffer.from("aaa")), false);
  assert.equal(equalHash(Buffer.from("abcd"), Buffer.from("abcd")), true);
  assert.equal(equalHash(Buffer.from("abcd"), Buffer.from("abce")), false);
});

test("client ids are taken only from the token shape", () => {
  const secret = "a".repeat(43);
  assert.equal(parseClientId(`wo_mcp_reader_${secret}`), "reader");
  assert.equal(parseClientId(`wo_mcp_reader-1_${secret}`), "reader-1");
  assert.equal(parseClientId("wo_mcp_reader_short"), null);
  assert.equal(parseClientId(`wo_mcp_../x_${secret}`), null);
  assert.equal(parseClientId(null), null);
});
