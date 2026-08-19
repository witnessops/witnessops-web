import assert from "node:assert/strict";
import test from "node:test";
import { isFixtureId } from "./fixtures.js";

test("accepts only owned fixture identifiers", () => {
  assert.equal(isFixtureId("DEMO-001"), true);
  assert.equal(isFixtureId("DEMO-004"), true);
  assert.equal(isFixtureId("toString"), false);
  assert.equal(isFixtureId("__proto__"), false);
  assert.equal(isFixtureId(null), false);
});
