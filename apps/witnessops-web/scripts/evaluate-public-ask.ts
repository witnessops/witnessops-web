import { setTimeout as pause } from "node:timers/promises";
import { PUBLIC_ASK_EVALUATION_CASES, scorePublicAskEvaluation } from "../src/lib/server/ask-witnessops/public-answer-evaluation";

async function main() {
  const args = process.argv.slice(2);
  const selectedId = args.find((arg) => arg.startsWith("--case="))?.slice("--case=".length);
  const cases = selectedId ? PUBLIC_ASK_EVALUATION_CASES.filter((item) => item.id === selectedId) : PUBLIC_ASK_EVALUATION_CASES;
  if (!cases.length) throw new Error("Unknown evaluation case.");
  if (!args.includes("--live")) {
    console.info("No requests made. Use --live --base-url=http://127.0.0.1:3007 [--case=timing-follow-up] to evaluate a local preview. Live mode can incur model API usage.");
    console.info(cases.map((item) => item.id).join("\n"));
    return;
  }
  const base = new URL(args.find((arg) => arg.startsWith("--base-url="))?.slice("--base-url=".length) ?? "http://127.0.0.1:3007");
  if (!["127.0.0.1", "localhost", "[::1]"].includes(base.hostname) || base.protocol !== "http:" || base.username || base.password) {
    throw new Error("Evaluation is limited to an HTTP localhost preview.");
  }
  let failed = 0;
  for (const [index, item] of cases.entries()) {
    // Keep sequential evaluation under the public ten-request/minute budget.
    if (index > 0) await pause(7_000);
    const start = Date.now();
    const response = await fetch(new URL("/api/ask-witnessops", base), {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(item.request), signal: AbortSignal.timeout(20_000),
    });
    const payload = await response.json();
    const failures = response.ok ? scorePublicAskEvaluation(item, payload) : [`HTTP ${response.status}`];
    if (failures.length) failed += 1;
    console.info(JSON.stringify({ case: item.id, milliseconds: Date.now() - start, checks: failures.length ? failures : "passed", answer: payload.template?.body ?? null, human_review: item.review }));
  }
  console.info(`${cases.length - failed}/${cases.length} automated checks passed. Review prose against each human_review note; these checks alone do not establish answer quality.`);
  if (failed) process.exitCode = 1;
}

main().catch(() => { console.error("Evaluation did not complete. Check the local preview, selected case and runtime configuration."); process.exitCode = 1; });
