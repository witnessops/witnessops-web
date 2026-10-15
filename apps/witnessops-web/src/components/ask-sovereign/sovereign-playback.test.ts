import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import manifest from "./sprites.json";
import { advancePlayback, playbackStep, revealWaitMs, spriteAsset, thinkingWaitMs } from "./sovereign-playback";

test("sprite frames are 94 by 102 and answering is the even steps loop", () => {
  assert.deepEqual(manifest.frame.css_size_px, [94, 102]);
  assert.equal(manifest.states.answering.sequence.length, 4);
  assert.ok(manifest.states.answering.sequence.every((step) => step.ms === 140));
  assert.equal(manifest.states.answering.hold_frame, 4);
  assert.equal(playbackStep("answering", 4).finished, true);
});

test("finite sequences hold after their loop count and infinite sequences restart", () => {
  assert.equal(advancePlayback("greet", 5, 0).finished, true);
  assert.equal(advancePlayback("idle", 3, 2).finished, true);
  assert.deepEqual(advancePlayback("thinking", 1, 0), { index: 0, loops: 1, finished: false });
  assert.equal(playbackStep("error", 2).waitMs, null);
});

test("thinking and reveal waits stay inside the spec caps", () => {
  assert.equal(thinkingWaitMs(0), 600);
  assert.equal(thinkingWaitMs(1), 1200);
  assert.ok(revealWaitMs("x".repeat(40)) >= 140);
  assert.equal(revealWaitMs("x".repeat(4000)), 5000);
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
