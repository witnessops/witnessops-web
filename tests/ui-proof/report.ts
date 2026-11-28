import { execSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { HomepageHeroScenario, ScenarioSeverity } from "./scenarios";

export const UI_PROOF_OUTPUT_DIR = path.join(
  process.cwd(),
  "artifacts",
  "ui-proof",
  "homepage-hero",
);

export type CheckStatus = "pass" | "fail";
export type ScenarioStatus = "pass" | "warn" | "fail";
export type ReportStatus = "pass" | "warn" | "fail";

export type CheckResult = {
  name: string;
  status: CheckStatus;
  severity: ScenarioSeverity;
  expected?: string;
  actual?: string | number | boolean | null;
  message?: string;
};

export type Metrics = {
  cls?: number;
  ctaWidth?: number;
  ctaHeight?: number;
  scrollWidth?: number;
  clientWidth?: number;
  activeAnimationCount?: number;
};

export type ScenarioResult = {
  scenario: HomepageHeroScenario;
  status: ScenarioStatus;
  checks: CheckResult[];
  metrics: Metrics;
  screenshotPath: string | null;
};

export type HomepageHeroUiProofReport = {
  schemaVersion: "ui-proof-report.v2";
  proofType: "witnessops.web.homepage-hero.mobile";
  status: ReportStatus;
  repo: "witnessops/witnessops-web";
  route: "/";
  generatedAt: string;
  commitSha: string;
  browser: "chromium";
  artifacts: {
    report: string;
    grid: string;
    screenshotsDir: string;
  };
  scenarios: ScenarioResult[];
};

export function scenarioStatus(
  scenario: HomepageHeroScenario,
  checks: CheckResult[],
): ScenarioStatus {
  const hasFailures = checks.some((check) => check.status === "fail");
  if (!hasFailures) {
    return "pass";
  }
  return scenario.severity === "warning" ? "warn" : "fail";
}

export function reportStatus(results: ScenarioResult[]): ReportStatus {
  if (results.some((result) => result.status === "fail")) {
    return "fail";
  }
  if (results.some((result) => result.status === "warn")) {
    return "warn";
  }
  return "pass";
}

export async function writeHomepageHeroReport(
  results: ScenarioResult[],
  outputDir = UI_PROOF_OUTPUT_DIR,
): Promise<HomepageHeroUiProofReport> {
  await mkdir(outputDir, { recursive: true });
  const report: HomepageHeroUiProofReport = {
    schemaVersion: "ui-proof-report.v2",
    proofType: "witnessops.web.homepage-hero.mobile",
    status: reportStatus(results),
    repo: "witnessops/witnessops-web",
    route: "/",
    generatedAt: new Date().toISOString(),
    commitSha: getCommitSha(),
    browser: "chromium",
    artifacts: {
      report: "artifacts/ui-proof/homepage-hero/latest.json",
      grid: "artifacts/ui-proof/homepage-hero/grid.png",
      screenshotsDir: "artifacts/ui-proof/homepage-hero/screenshots",
    },
    scenarios: results,
  };
  await writeFile(
    path.join(outputDir, "latest.json"),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  return report;
}

function getCommitSha(): string {
  const envSha = process.env.GITHUB_SHA || process.env.VERCEL_GIT_COMMIT_SHA;
  if (envSha) {
    return envSha;
  }
  try {
    return execSync("git rev-parse HEAD", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "unknown";
  }
}
