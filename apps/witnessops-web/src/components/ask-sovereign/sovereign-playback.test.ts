import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import manifest from "./sprites.json";
import { CONTRACT_SPRITE_STATES, advancePlayback, playbackStep, spriteAsset } from "./sovereign-playback";

test("sprite frames are 94 by 102 and composing is the even steps loop", () => {
  assert.deepEqual(manifest.frame.css_size_px, [94, 102]);
  assert.deepEqual(Object.keys(manifest.states), [...CONTRACT_SPRITE_STATES]);
  assert.equal(manifest.states.COMPOSING.sequence.length, 4);
  assert.ok(manifest.states.COMPOSING.sequence.every((step) => step.ms === 140));
  assert.equal(manifest.states.COMPOSING.hold_frame, 4);
  assert.equal(playbackStep("COMPOSING", 4).finished, true);
  assert.equal(manifest.states.PROCESSING.cap_ms, 5000);
});

test("finite sequences hold after their loop count and infinite sequences restart", () => {
  assert.equal(advancePlayback("GREETING", 5, 0).finished, true);
  assert.equal(advancePlayback("IDLE", 3, 2).finished, true);
  assert.deepEqual(advancePlayback("PROCESSING", 1, 0), { index: 0, loops: 1, finished: false });
  assert.equal(playbackStep("ERROR", 2).waitMs, null);
  assert.equal(playbackStep("HANDOFF", 2, "desktop").waitMs, null);
  assert.equal(playbackStep("HANDOFF", 1, "mobile").waitMs, null);
});

test("every manifest file sha256 matches the asset bytes", () => {
  const root = resolve(__dirname, "../../../public/ask-sovereign");
  const hashed: Array<[string, string]> = [];
  const visit = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    const record = node as { webp?: string; png?: string; webp_sha256?: string; png_sha256?: string; file?: string; sha256?: string };
    if (typeof record.webp === "string" && typeof record.png === "string") {
      hashed.push([record.webp, record.webp_sha256 ?? ""], [record.png, record.png_sha256 ?? ""]);
    }
    if (typeof record.file === "string" && typeof record.sha256 === "string" && !record.webp) {
      hashed.push([record.file, record.sha256]);
    }
    for (const value of Object.values(record)) visit(value);
  };
  visit(manifest);
  assert.equal(hashed.length, readdirSync(root).filter((name) => /\.(webp|png)$/.test(name)).length);
  for (const [file, hash] of hashed) {
    const digest = createHash("sha256").update(readFileSync(resolve(root, file))).digest("hex");
    assert.equal(hash, digest, file);
  }
});

test("every manifest frame file is present as webp and png", () => {
  const root = resolve(__dirname, "../../../public/ask-sovereign");
  for (const name of Object.keys(manifest.states) as Array<keyof typeof manifest.states>) {
    for (const theme of ["light", "dark"] as const) {
      for (const scale of ["@1x", "@2x"] as const) {
        for (const still of [false, true]) {
          const file = spriteAsset(name, theme, scale, still);
          assert.equal(existsSync(resolve(root, file)), true, file);
          assert.equal(existsSync(resolve(root, file.replace(/\.webp$/, ".png"))), true, file);
        }
      }
    }
  }
});
