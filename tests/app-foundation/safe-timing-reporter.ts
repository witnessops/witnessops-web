import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { FullConfig, FullResult, Reporter, Suite, TestCase, TestResult } from "@playwright/test/reporter";

// No titles, locations, errors, output, attachments, traces, or fixture data.
const testKey = (test: TestCase) => createHash("sha256").update(test.id).digest("hex");
const statuses = new Set(["passed", "failed", "timedOut", "skipped", "interrupted"]);
const count = (value: number) => Number.isSafeInteger(value) && value >= 0 ? value : 0;
export default class SafeTimingReporter implements Reporter {
  private inventory: string[] = [];
  private attempts: Array<{ test_id: string; status: string; duration_ms: number; retry: number }> = [];

  onBegin(_config: FullConfig, suite: Suite) {
    this.inventory = suite.allTests().map(testKey).sort();
  }

  onTestEnd(test: TestCase, result: TestResult) {
    this.attempts.push({
      test_id: testKey(test),
      status: statuses.has(result.status) ? result.status : "unknown",
      duration_ms: count(result.duration),
      retry: count(result.retry),
    });
  }

  onEnd(result: FullResult) {
    if (!process.env.RUNNER_TEMP) return;
    const dir = join(process.env.RUNNER_TEMP, "app-browser-timings");
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    writeFileSync(join(dir, "summary.json"), JSON.stringify({
      schema_version: "app-browser-timings.v1",
      status: new Set(["passed", "failed", "timedout", "interrupted"]).has(result.status) ? result.status : "unknown",
      duration_ms: count(Math.round(result.duration)),
      inventory: this.inventory,
      attempts: this.attempts,
    }, null, 2) + "\n", { mode: 0o600 });
  }
}
