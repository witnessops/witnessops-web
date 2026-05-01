import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const webRoot = resolve(__dirname, "../..");
const repoRoot = resolve(webRoot, "../..");

const PUBLIC_CLAIM_SOURCES = [
  "src/app/(library)/library/page.tsx",
  "src/app/access-change-proof-run/page.tsx",
  "src/app/pricing/page.tsx",
  "src/app/review/page.tsx",
  "src/app/review/request/page.tsx",
  "src/app/review/request/confirmed/page.tsx",
  "src/app/review/sample-cases/ai-agent-action-proof-run/page.tsx",
  "src/app/verify/page.tsx",
  "../../content/witnessops/landing/home.yaml",
] as const;

const PROHIBITED_PUBLIC_CLAIMS = [
  "verified compliance",
  "certified compliance",
  "audit-ready",
  "audit opinion provided",
  "proves compliance",
  "guarantees compliance",
  "platform for AI governance",
  "complete AI governance program replacement",
  "whole-environment assurance",
  "production deployment proof",
] as const;

const REQUIRED_BOUNDARY_MARKERS = [
  "not a legal compliance claim",
  "not a production deployment claim",
  "not a complete AI governance program",
  "does not claim production deployment",
  "does not prove production deployment",
  "does not prove the full runtime story",
  "not live customer proof artifacts",
  "receipt-first v1",
  "No proof run starts",
  "No customer evidence",
] as const;

function readPublicClaimSources(): Array<{ path: string; content: string }> {
  return PUBLIC_CLAIM_SOURCES.map((sourcePath) => ({
    path: sourcePath,
    content: readFileSync(resolve(webRoot, sourcePath), "utf-8"),
  }));
}

function normalize(value: string): string {
  return value.toLowerCase();
}

test("public claim surfaces do not contain hard-blocked overclaim phrases", () => {
  const failures: string[] = [];

  for (const source of readPublicClaimSources()) {
    const content = normalize(source.content);
    for (const phrase of PROHIBITED_PUBLIC_CLAIMS) {
      if (content.includes(phrase.toLowerCase())) {
        failures.push(`${source.path}: ${phrase}`);
      }
    }
  }

  assert.deepEqual(failures, []);
});

test("public claim surfaces preserve at least one explicit boundary marker", () => {
  const failures: string[] = [];

  for (const source of readPublicClaimSources()) {
    const content = normalize(source.content);
    const hasBoundary = REQUIRED_BOUNDARY_MARKERS.some((marker) =>
      content.includes(marker.toLowerCase()),
    );
    if (!hasBoundary) {
      failures.push(source.path);
    }
  }

  assert.deepEqual(failures, []);
});

test("claim-boundary guard scans only public presentation sources", () => {
  assert.ok(
    PUBLIC_CLAIM_SOURCES.every(
      (sourcePath) =>
        sourcePath.startsWith("src/app/") ||
        sourcePath === "../../content/witnessops/landing/home.yaml",
    ),
  );
});
