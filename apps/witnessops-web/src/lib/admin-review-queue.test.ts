import assert from "node:assert/strict";
import test from "node:test";
import { filterReviewQueue } from "./admin-review-queue";

const items = [
  { id: "rr_1", requestText: "CRM permission review", customerName: "Avery", customerEmail: "avery@example.test", state: "triage", nextAction: "Confirm test account", timing: "Friday" },
  { id: "rr_2", requestText: "Repair a workflow", customerName: "Morgan", customerEmail: "morgan@example.test", state: "closed", nextAction: "Complete", timing: "" },
];
test("review filters combine stage with readable customer, email, action and identifier search", () => {
  for (const query of [" AVERY ", "avery@example.test", "test account", "rr_1"]) assert.deepEqual(filterReviewQueue(items, query, "open"), [items[0]]);
  assert.deepEqual(filterReviewQueue(items, "", "all"), items);
  assert.deepEqual(filterReviewQueue(items, "", "closed"), [items[1]]);
  assert.deepEqual(filterReviewQueue(items, "Morgan", "triage"), []);
  assert.equal(items.length, 2);
});
