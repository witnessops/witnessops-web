import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ChronicleBody } from "@/components/marketing/chronicle-body";
import { getChronicleArtwork } from "@/lib/chronicle-illustrations";
import { ALL_CHAPTERS, chronicleBodySource } from "@/lib/chronicles";

function bodyIllustrationCount(id: string): number {
  return id === "006" ? 5 : 4;
}

/** PNG IHDR, or the lossless WebP VP8L canvas. Both reserve layout before paint. */
function rasterSize(bytes: Buffer): { width: number; height: number } {
  if (bytes.length >= 24 && bytes.toString("ascii", 1, 4) === "PNG") {
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  }
  if (
    bytes.toString("ascii", 0, 4) === "RIFF"
    && bytes.toString("ascii", 8, 12) === "WEBP"
    && bytes.toString("ascii", 12, 16) === "VP8L"
    && bytes[20] === 0x2f
  ) {
    const bits = bytes.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  throw new Error("Chronicle artwork must be a PNG or lossless WebP");
}

test("supplied Chronicle artwork preserves its image bytes, dimensions and illustrative labels", () => {
  for (const chapter of ALL_CHAPTERS) {
    const artwork = getChronicleArtwork(chapter);
    assert.ok(artwork);
    assert.equal(artwork.body.length, bodyIllustrationCount(chapter.id));
    for (const image of [artwork.hero, ...artwork.body]) {
      const bytes = readFileSync(resolve(process.cwd(), "public", image.src.slice(1)));
      assert.equal(createHash("sha256").update(bytes).digest("hex"), image.sha256);
      const size = rasterSize(bytes);
      assert.equal(size.width, image.width);
      assert.equal(size.height, image.height);
      assert.match(image.alt, /^Illustrative artwork:/);
      assert.ok(image.caption.length > 0);
    }
  }
});

test("each body illustration has a matching story anchor and renders once", () => {
  for (const chapter of ALL_CHAPTERS) {
    const artwork = getChronicleArtwork(chapter)!;
    const body = chronicleBodySource(chapter);
    const html = renderToStaticMarkup(createElement(ChronicleBody, { chapter }));
    assert.equal((html.match(/data-chronicle-illustration=/g) ?? []).length, bodyIllustrationCount(chapter.id));
    for (const image of artwork.body) {
      if (image.afterParagraph) assert.ok(body.includes(image.afterParagraph), image.src);
      if (image.afterSection) assert.ok(body.includes(`### ${image.afterSection}`), image.src);
      if (image.afterRecord) assert.ok(body.split("```").filter((_, index) => index % 2 === 1).length >= image.afterRecord, image.src);
      assert.equal(html.split(`data-chronicle-illustration="${image.src}"`).length - 1, 1, image.src);
    }
  }
});
