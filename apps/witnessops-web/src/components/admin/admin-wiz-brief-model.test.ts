import assert from "node:assert/strict";
import test from "node:test";
import { buildAdminWizBrief } from "./admin-wiz-brief-model";

const stableInput = {
  total: 4,
  ready: 0,
  reconciliationPending: 0,
  divergent: 0,
};

test("Wiz boundary state takes precedence over pending and ready work", () => {
  const brief = buildAdminWizBrief({
    total: 7,
    ready: 3,
    reconciliationPending: 2,
    divergent: 1,
  });

  assert.equal(brief.state, "boundary");
  assert.equal(brief.actionHref, "/admin/queue?filter=divergent");
});

test("Wiz uses thinking state for pending reconciliation", () => {
  const brief = buildAdminWizBrief({
    ...stableInput,
    reconciliationPending: 2,
  });

  assert.equal(brief.state, "thinking");
  assert.equal(brief.actionHref, "/admin/queue?filter=pending");
});

test("Wiz recommends ready work when no exception is present", () => {
  const brief = buildAdminWizBrief({
    ...stableInput,
    ready: 2,
  });

  assert.equal(brief.state, "recommending");
  assert.equal(brief.actionHref, "/admin/queue?filter=ready");
});

test("Wiz listens when the queue is empty", () => {
  const brief = buildAdminWizBrief({
    total: 0,
    ready: 0,
    reconciliationPending: 0,
    divergent: 0,
  });

  assert.equal(brief.state, "listening");
  assert.equal(brief.actionHref, "/admin/queue");
});

test("Wiz remains idle when no immediate action is visible", () => {
  const brief = buildAdminWizBrief(stableInput);

  assert.equal(brief.state, "idle");
  assert.match(brief.detail, /does not show divergent, pending, or ready work/);
});
