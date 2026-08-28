import { SKILL_MAX_WORKER_DURATION_MS } from "./contract";
import type { SkillScanInput, SkillScanOutcome } from "./run-scan";

type ScanWorker = Pick<
  Worker,
  "onerror" | "onmessage" | "onmessageerror" | "postMessage" | "terminate"
>;

type WorkerOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
  workerFactory?: () => ScanWorker;
};

function createWorker(): Worker {
  return new Worker(new URL("./skill-scan.worker.ts", import.meta.url), {
    type: "module",
    name: "witnessops-skill-scan",
  });
}

export function runSkillScanInWorker(
  input: SkillScanInput,
  options: WorkerOptions = {},
): Promise<SkillScanOutcome> {
  const { signal, timeoutMs = SKILL_MAX_WORKER_DURATION_MS } = options;
  if (signal?.aborted) {
    return Promise.resolve({
      ok: false,
      code: "WORKER_FAILED",
      message: "The local verification was cancelled. The input was not evaluated.",
    });
  }

  return new Promise((resolve) => {
    let worker: ScanWorker;
    try {
      worker = options.workerFactory?.() ?? createWorker();
    } catch {
      resolve({
        ok: false,
        code: "WORKER_FAILED",
        message: "The local verification worker could not start. The input was not evaluated.",
      });
      return;
    }

    let settled = false;

    const finish = (outcome: SkillScanOutcome) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      signal?.removeEventListener("abort", abort);
      worker.terminate();
      resolve(outcome);
    };
    const abort = () =>
      finish({
        ok: false,
        code: "WORKER_FAILED",
        message: "The local verification was cancelled. The input was not evaluated.",
      });

    worker.onmessage = (event: MessageEvent<SkillScanOutcome>) => finish(event.data);
    worker.onerror = (event: ErrorEvent) => {
      event.preventDefault();
      finish({
        ok: false,
        code: "WORKER_FAILED",
        message: "The local verification worker failed. The input was not evaluated.",
      });
    };
    worker.onmessageerror = () =>
      finish({
        ok: false,
        code: "WORKER_FAILED",
        message: "The local verification result could not be read. The input was not evaluated.",
      });

    signal?.addEventListener("abort", abort, { once: true });
    const timeout = setTimeout(
      () =>
        finish({
          ok: false,
          code: "SCAN_TIMEOUT",
          message: `The local verification exceeded ${timeoutMs} ms. The input was not evaluated.`,
        }),
      timeoutMs,
    );
    worker.postMessage(input);
  });
}
