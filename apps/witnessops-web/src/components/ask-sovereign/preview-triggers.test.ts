import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  previewChip,
  simErrorAtLoad,
  simFlag,
  thinkingDurationMs,
} from "./preview-triggers";

const saved = {
  node: process.env.NODE_ENV,
  preview: process.env.NEXT_PUBLIC_WO_PREVIEW,
};

function restore() {
  Object.assign(process.env, { NODE_ENV: saved.node });
  if (saved.preview === undefined) delete process.env.NEXT_PUBLIC_WO_PREVIEW;
  else process.env.NEXT_PUBLIC_WO_PREVIEW = saved.preview;
}

test("production builds ignore preview triggers", () => {
  Object.assign(process.env, { NODE_ENV: "production" });
  process.env.NEXT_PUBLIC_WO_PREVIEW = "1";
  try {
    assert.equal(simFlag("?sim=error"), null);
    assert.equal(simFlag("?sim=error&at=load"), null);
    assert.equal(simFlag("?sim=handoff"), null);
    assert.equal(simFlag("?sim=slow"), null);
    assert.equal(simErrorAtLoad("?sim=error&at=load"), false);
    assert.equal(previewChip(simFlag("?sim=error")), null);
    assert.equal(thinkingDurationMs(simFlag("?sim=slow"), 0), 600);
  } finally {
    restore();
  }
});

test("preview triggers stay off unless NEXT_PUBLIC_WO_PREVIEW is 1", () => {
  Object.assign(process.env, { NODE_ENV: "development" });
  delete process.env.NEXT_PUBLIC_WO_PREVIEW;
  try {
    assert.equal(simFlag("?sim=error"), null);
    process.env.NEXT_PUBLIC_WO_PREVIEW = "0";
    assert.equal(simFlag("?sim=handoff"), null);
  } finally {
    restore();
  }
});

test("an enabled preview reads the spec triggers and nothing else", () => {
  Object.assign(process.env, { NODE_ENV: "development" });
  process.env.NEXT_PUBLIC_WO_PREVIEW = "1";
  try {
    assert.equal(simFlag("?sim=error"), "error");
    assert.equal(simFlag("?sim=handoff"), "handoff");
    assert.equal(simFlag("?sim=slow"), "slow");
    assert.equal(simFlag("?sim=other"), null);
    assert.equal(simErrorAtLoad("?sim=error"), false);
    assert.equal(simErrorAtLoad("?sim=error&at=load"), true);
    assert.equal(simErrorAtLoad("?sim=handoff&at=load"), false);
    assert.equal(previewChip("error"), "Preview · simulated error");
    assert.equal(previewChip("handoff"), "Preview · simulated handoff");
    assert.equal(previewChip("slow"), "Preview · simulated slow");
    assert.equal(thinkingDurationMs("slow", 0), 6000);
    assert.ok(thinkingDurationMs("error", 0) >= 400);
    assert.ok(thinkingDurationMs(null, 1) <= 1200);
  } finally {
    restore();
  }
});

test("preview trigger source makes no request and writes no storage", () => {
  const source = readFileSync(resolve(__dirname, "preview-triggers.ts"), "utf8");
  assert.doesNotMatch(source, /fetch\s*\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|indexedDB/);
  assert.match(source, /NEXT_PUBLIC_WO_PREVIEW === "1"/);
  assert.match(source, /NODE_ENV !== "production"/);
});
