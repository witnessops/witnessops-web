import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { FullConfig, FullResult, Suite, TestCase, TestResult } from "@playwright/test/reporter";
import Reporter from "../app-foundation/safe-timing-reporter";

test("timing artifact keeps inventory, retries and durations without test content", () => {
  const root = mkdtempSync(join(tmpdir(), "browser-timing-"));
  const previous = process.env.RUNNER_TEMP;
  process.env.RUNNER_TEMP = root;
  try {
    const sentinel = "PRIVATE_TITLE_COOKIE_DOCUMENT_ERROR_OUTPUT";
    const entry = {id: sentinel, title: sentinel, location: {file: sentinel}, annotations: [sentinel]} as unknown as TestCase;
    const reporter = new Reporter();
    reporter.onBegin({} as FullConfig, {allTests: () => [entry]} as Suite);
    reporter.onTestEnd(entry, {status: "failed", duration: 123.6, retry: 0, error: {message: sentinel}, stdout: [sentinel], attachments: [sentinel]} as unknown as TestResult);
    reporter.onTestEnd(entry, {status: "passed", duration: 456, retry: 1} as TestResult);
    reporter.onEnd({status: "passed", duration: 600} as FullResult);
    const raw = readFileSync(join(root, "app-browser-timings/summary.json"), "utf8");
    assert.ok(!raw.includes(sentinel));
    const data = JSON.parse(raw);
    assert.match(data.inventory[0], /^[0-9a-f]{64}$/);
    assert.deepEqual(data.attempts, [
      {test_id: data.inventory[0], status: "failed", duration_ms: 124, retry: 0},
      {test_id: data.inventory[0], status: "passed", duration_ms: 456, retry: 1},
    ]);
    assert.equal(data.duration_ms, 600);
    assert.deepEqual(Object.keys(data).sort(), ["attempts", "duration_ms", "inventory", "schema_version", "status"]);
  } finally {
    if (previous === undefined) delete process.env.RUNNER_TEMP; else process.env.RUNNER_TEMP = previous;
    rmSync(root, {recursive: true, force: true});
  }
});
