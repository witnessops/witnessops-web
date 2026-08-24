import assert from "node:assert/strict";
import test from "node:test";

import {
  findDuplicateJsonObjectKey,
  JSON_AMBIGUITY_MAX_DEPTH,
  JsonAmbiguityScanLimitError,
} from "./json-ambiguity";

test("duplicate-key scanning preserves ordinary valid JSON", () => {
  assert.equal(findDuplicateJsonObjectKey('{"outer":{"value":1}}'), null);
});

test("duplicate-key scanning reports a nested duplicate", () => {
  assert.equal(
    findDuplicateJsonObjectKey('{"outer":{"value":1,"value":2}}'),
    "value",
  );
});

test("duplicate-key scanning fails closed before recursive exhaustion", () => {
  const depth = JSON_AMBIGUITY_MAX_DEPTH + 1;
  const source = `${'{"nested":'.repeat(depth)}{"value":1,"value":2}${"}".repeat(depth)}`;
  assert.doesNotThrow(() => JSON.parse(source));
  assert.throws(
    () => findDuplicateJsonObjectKey(source),
    JsonAmbiguityScanLimitError,
  );
});
