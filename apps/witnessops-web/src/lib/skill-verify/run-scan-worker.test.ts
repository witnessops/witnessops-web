import assert from "node:assert/strict";
import test from "node:test";

import { runSkillScanInWorker } from "./run-scan-in-worker";
import type { SkillScanOutcome } from "./run-scan";

class FakeWorker {
  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessage: ((event: MessageEvent<SkillScanOutcome>) => void) | null = null;
  onmessageerror: (() => void) | null = null;
  posted: unknown[] = [];
  terminations = 0;

  postMessage(value: unknown) {
    this.posted.push(value);
  }

  terminate() {
    this.terminations += 1;
  }
}

function factory(worker: FakeWorker) {
  return () => worker as unknown as Worker;
}

test("worker response is returned once and the worker is terminated", async () => {
  const worker = new FakeWorker();
  const pending = runSkillScanInWorker(
    { content: "---\nname: local\n---\n" },
    { workerFactory: factory(worker), timeoutMs: 1000 },
  );
  const outcome: SkillScanOutcome = {
    ok: false,
    code: "EMPTY_INPUT",
    message: "bounded test outcome",
  };
  worker.onmessage?.({ data: outcome } as MessageEvent<SkillScanOutcome>);
  assert.deepEqual(await pending, outcome);
  assert.equal(worker.posted.length, 1);
  assert.equal(worker.terminations, 1);
});

test("worker timeout terminates and cannot become a pass", async () => {
  const worker = new FakeWorker();
  const outcome = await runSkillScanInWorker(
    { content: "---\nname: timeout\n---\n" },
    { workerFactory: factory(worker), timeoutMs: 1 },
  );
  assert.equal(outcome.ok, false);
  if (!outcome.ok) assert.equal(outcome.code, "SCAN_TIMEOUT");
  assert.equal(worker.terminations, 1);
});

test("aborting an obsolete scan terminates its worker", async () => {
  const worker = new FakeWorker();
  const controller = new AbortController();
  const pending = runSkillScanInWorker(
    { content: "---\nname: obsolete\n---\n" },
    {
      signal: controller.signal,
      workerFactory: factory(worker),
      timeoutMs: 1000,
    },
  );
  controller.abort();
  const outcome = await pending;
  assert.equal(outcome.ok, false);
  if (!outcome.ok) assert.equal(outcome.code, "WORKER_FAILED");
  assert.equal(worker.terminations, 1);
});

test("worker errors terminate and return input-not-evaluated", async () => {
  const worker = new FakeWorker();
  const pending = runSkillScanInWorker(
    { content: "---\nname: error\n---\n" },
    { workerFactory: factory(worker), timeoutMs: 1000 },
  );
  worker.onerror?.({ preventDefault() {} } as ErrorEvent);
  const outcome = await pending;
  assert.equal(outcome.ok, false);
  if (!outcome.ok) assert.equal(outcome.code, "WORKER_FAILED");
  assert.equal(worker.terminations, 1);
});
