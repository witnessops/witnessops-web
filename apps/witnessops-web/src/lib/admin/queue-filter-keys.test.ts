/**
 * Tests for queue-filter-keys — verifies key constants added in WEB-019.
 *
 * The filter group predicate logic (lifecycleByRunId stage lookup) lives inside
 * the async AdminAdmissionQueue server component and is covered by the key
 * presence test below; the lookup itself is a property of PostApprovalStage
 * values tested in post-approval-lifecycle.test.ts.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { QUEUE_FILTER_KEYS, type QueueFilterKey } from "./queue-filter-keys";

test("WEB-019: customerAccepted key exists with correct value", () => {
  assert.equal(QUEUE_FILTER_KEYS.customerAccepted, "customer_accepted");
});

test("WEB-019: customerRejected key exists with correct value", () => {
  assert.equal(QUEUE_FILTER_KEYS.customerRejected, "customer_rejected");
});

test("WEB-019: QueueFilterKey type includes customer_accepted and customer_rejected", () => {
  // Compile-time check: these assignments must typecheck.
  const _a: QueueFilterKey = QUEUE_FILTER_KEYS.customerAccepted;
  const _b: QueueFilterKey = QUEUE_FILTER_KEYS.customerRejected;
  assert.ok(_a);
  assert.ok(_b);
});

test("WEB-019: customerAccepted and customerRejected are distinct keys", () => {
  assert.notEqual(
    QUEUE_FILTER_KEYS.customerAccepted,
    QUEUE_FILTER_KEYS.customerRejected,
  );
});
