import assert from "node:assert/strict";
import test from "node:test";

import { NEGATED_LIMITATION_STATEMENTS_ARE_EXEMPT } from "./banned-term-exemption";
import { EXTERNAL_ATTACK_SURFACE_OFFER } from "./commercial-truth";

test("negated limitation statements stay on the public offers", () => {
  assert.equal(NEGATED_LIMITATION_STATEMENTS_ARE_EXEMPT, true);
  assert.match(EXTERNAL_ATTACK_SURFACE_OFFER.boundary.en, /not a penetration test/i);
  assert.doesNotMatch(EXTERNAL_ATTACK_SURFACE_OFFER.boundary.en, /certified secure|guarantees your/i);
});
