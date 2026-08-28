import {
  runSkillScan,
  type SkillScanInput,
  type SkillScanOutcome,
} from "./run-scan";

const workerScope = self as unknown as {
  onmessage: ((event: MessageEvent<SkillScanInput>) => void) | null;
  postMessage: (outcome: SkillScanOutcome) => void;
};

workerScope.onmessage = async (event: MessageEvent<SkillScanInput>) => {
  let outcome: SkillScanOutcome;
  try {
    outcome = await runSkillScan(event.data);
  } catch {
    outcome = {
      ok: false,
      code: "WORKER_FAILED",
      message: "The local verification worker failed. The input was not evaluated.",
    };
  }
  workerScope.postMessage(outcome);
};

export {};
