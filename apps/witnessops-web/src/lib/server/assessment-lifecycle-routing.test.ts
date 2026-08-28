import assert from "node:assert/strict";
import test from "node:test";

import { hasAssessmentLifecycleState } from "./assessment-lifecycle-routing";

test("pending issuances without run state have not entered assessment", () => {
  assert.equal(
    hasAssessmentLifecycleState({
      approvalStatus: "pending",
      assessmentStatus: "unavailable",
    }),
    false,
  );
});

test("any started lifecycle state preserves assessment routing", () => {
  for (const record of [
    { approvalStatus: "approved" as const },
    { assessmentRunId: "run_started" },
    { controlPlaneRunId: "cp_started" },
    { assessmentStatus: "running" as const },
    { assessmentStatus: "completed" as const },
    { assessmentStatus: "failed" as const },
  ]) {
    assert.equal(hasAssessmentLifecycleState(record), true);
  }
});

test("a denied request without run state has not started assessment", () => {
  assert.equal(
    hasAssessmentLifecycleState({
      approvalStatus: "approval_denied",
      assessmentStatus: "unavailable",
    }),
    false,
  );
});
