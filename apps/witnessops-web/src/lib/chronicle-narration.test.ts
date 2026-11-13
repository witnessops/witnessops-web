import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import { chronicleNarrationInputHash, chronicleNarrationText, getChronicleNarration } from "@/lib/chronicle-narration";
import { ALL_CHAPTERS, CHRONICLE_FICTION_LABEL, PUBLISHED_CHAPTERS } from "@/lib/chronicles";

test("narration uses the published fiction text and removes visual markup", () => {
  for (const chapter of ALL_CHAPTERS) {
    const text = chronicleNarrationText(chapter);
    assert.ok(text.includes(chapter.title));
    assert.ok(text.includes(CHRONICLE_FICTION_LABEL));
    assert.ok(text.length > 1000 && text.length <= 60000);
    assert.doesNotMatch(text, /```|^#{1,6}\s|^[─━═_\-]{3,}$/m);
    assert.equal(chronicleNarrationInputHash(chapter, "orion"), chronicleNarrationInputHash(chapter, "orion"));
    assert.notEqual(chronicleNarrationInputHash(chapter, "orion"), chronicleNarrationInputHash(chapter, "eve"));
  }
  const latest = chronicleNarrationText(PUBLISHED_CHAPTERS[4]!);
  assert.ok(latest.includes("“GO ZIP.”"));
  assert.ok(latest.endsWith("It was a task that finished."));
});

test("every admitted narration points to its exact local MP3 bytes", () => {
  for (const chapter of ALL_CHAPTERS) {
    const asset = getChronicleNarration(chapter);
    assert.ok(asset, `Chapter ${chapter.id} has a current narration`);
    assert.ok(asset.durationSeconds > 1);
    assert.ok(["orion", "eve", "rex", "sal"].includes(asset.voice));
    const bytes = readFileSync(resolve(process.cwd(), "public", asset.src.slice(1)));
    assert.ok(bytes.length > 1000);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), asset.audioSha256);
  }
});
