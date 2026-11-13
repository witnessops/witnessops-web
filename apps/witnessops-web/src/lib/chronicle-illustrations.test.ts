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

test("supplied Chronicle artwork preserves its image bytes, dimensions and illustrative labels", () => {
  for (const chapter of ALL_CHAPTERS) {
    const artwork = getChronicleArtwork(chapter);
    assert.ok(artwork);
    assert.equal(artwork.body.length, 4);
    for (const image of [artwork.hero, ...artwork.body]) {
      const bytes = readFileSync(resolve(process.cwd(), "public", image.src.slice(1)));
      assert.equal(createHash("sha256").update(bytes).digest("hex"), image.sha256);
      assert.equal(bytes.readUInt32BE(16), image.width);
      assert.equal(bytes.readUInt32BE(20), image.height);
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
    assert.equal((html.match(/data-chronicle-illustration=/g) ?? []).length, 4);
    for (const image of artwork.body) {
      if (image.afterParagraph) assert.ok(body.includes(image.afterParagraph), image.src);
      if (image.afterSection) assert.ok(body.includes(`### ${image.afterSection}`), image.src);
      if (image.afterRecord) assert.ok(body.split("```").filter((_, index) => index % 2 === 1).length >= image.afterRecord, image.src);
      assert.equal(html.split(`data-chronicle-illustration="${image.src}"`).length - 1, 1, image.src);
    }
  }
});
