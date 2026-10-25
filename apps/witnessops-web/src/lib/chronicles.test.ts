import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import ChroniclesIndexPage from "@/app/(marketing)/chronicles/page";
import { ChronicleBody, ChroniclePager } from "@/components/marketing/chronicle-body";
import {
  PUBLISHED_CHAPTERS,
  RESERVED_CHAPTERS,
  chronicleBodySource,
  chroniclePreviewText,
  readChronicleSource,
  type ChronicleChapter,
} from "@/lib/chronicles";

const BANNED = ["ChatGPT", "Cursor", "Grok", "Slack", "Facebook", "GitHub", "Jira", "Solitaire"];
const ENDING_MARKERS = ["END OF CHAPTER", "Next in", "Next chapter teaser"] as const;

function chapterById(id: ChronicleChapter["id"]): ChronicleChapter {
  const chapter = PUBLISHED_CHAPTERS.find((item) => item.id === id);
  assert.ok(chapter, id);
  return chapter;
}

test("published chapters stay in reading order", () => {
  assert.deepEqual(PUBLISHED_CHAPTERS.map((chapter) => chapter.id), ["001", "002", "003"]);
  assert.deepEqual(
    PUBLISHED_CHAPTERS.map((chapter) => chapter.slug),
    [
      "001-the-unauthorized-feline",
      "002-sir-whiskers-opens-a-pull-request",
      "003-the-meeting-nobody-authorized",
    ],
  );
  assert.deepEqual(RESERVED_CHAPTERS.map((chapter) => chapter.id), ["004"]);
  const chapter = chapterById("002");
  assert.equal(chapter.title, "Sir Whiskers Opens a Pull Request");
  assert.equal(chapter.kicker, "THE SOVEREIGN CHRONICLES · CHAPTER II");
  assert.equal(chapter.meta, "CH-002 · FICTION · 4 MIN READ");
  assert.deepEqual(chapter.dropLines, ["WitnessOps Headquarters · 09:12 · A quiet Wednesday"]);
});

test("chronicle preview drops brand names and corrects the attendance row", () => {
  const chapter = chapterById("003");
  const preview = chroniclePreviewText(readChronicleSource(chapter.sourceFile));
  for (const name of BANNED) {
    assert.equal(preview.includes(name), false, name);
  }
  assert.match(preview, /Sovereign Dot \.+ PRESENT/);
  assert.match(preview, /The researcher \/ Sovereign Dot/);
  assert.doesNotMatch(preview, /Sovereign Bot\s+PRESENT/);
});

test("every published preview drops banned brand names", () => {
  for (const chapter of PUBLISHED_CHAPTERS) {
    const preview = chroniclePreviewText(readChronicleSource(chapter.sourceFile));
    for (const name of BANNED) {
      assert.equal(preview.includes(name), false, `${chapter.id} ${name}`);
    }
  }
});

test("published chapter bodies omit ending blocks", () => {
  for (const chapter of PUBLISHED_CHAPTERS) {
    const raw = readChronicleSource(chapter.sourceFile);
    const body = chronicleBodySource(chapter);
    for (const marker of ENDING_MARKERS) {
      assert.equal(raw.includes(marker), false, `${chapter.id} source ${marker}`);
      assert.equal(body.includes(marker), false, `${chapter.id} body ${marker}`);
    }
  }
});

test("rendered chapter 001 keeps the fiction body and hides the title cat", () => {
  const chapter = chapterById("001");
  const html = renderToStaticMarkup(createElement(ChronicleBody, { chapter }));
  assert.match(html, /Fiction/);
  assert.equal(html.includes("🐈"), false);
  assert.doesNotMatch(chronicleBodySource(chapter), /😈/);
  for (const name of BANNED) assert.equal(html.includes(name), false, name);
  const preview = chroniclePreviewText(readChronicleSource(chapter.sourceFile));
  assert.match(preview, /"The researcher\. Explain\."/);
  assert.match(preview, /Agent: The researcher, social research/);
  assert.match(preview, /Source: The social network/);
  assert.match(preview, /He looked at the researcher\./);
  assert.doesNotMatch(preview, /^the researcher/m);
});

test("rendered chapter 002 shows the fiction label", () => {
  const chapter = chapterById("002");
  const html = renderToStaticMarkup(createElement(ChronicleBody, { chapter }));
  assert.match(html, /Fiction/);
  assert.match(html, /FINAL INCIDENT RECEIPT/);
  assert.match(html, /At 09:31, the review queue was empty again/);
  assert.match(html, /A pull request is a request\. Authority is something else\. Also, lock the laptop\./);
  const receipt = html.split("FINAL INCIDENT RECEIPT")[1] ?? "";
  assert.equal(receipt.includes("</pre>"), true);
  assert.equal(receipt.split("</pre>")[0]?.includes("At 09:31"), false);
  for (const name of BANNED) assert.equal(html.includes(name), false, name);
  assert.equal(chapter.meta.includes("FICTION"), true);
});

test("pager links published chapters only", () => {
  const html = (id: ChronicleChapter["id"]) => renderToStaticMarkup(createElement(ChroniclePager, { chapter: chapterById(id) }));
  const first = html("001");
  assert.match(first, /href="\/chronicles"/);
  assert.match(first, /href="\/chronicles\/002-sir-whiskers-opens-a-pull-request"/);
  assert.doesNotMatch(first, /001-the-unauthorized-feline|coming soon|Not yet linked|Chapter 004/);
  const second = html("002");
  assert.match(second, /href="\/chronicles\/001-the-unauthorized-feline"/);
  assert.match(second, /href="\/chronicles\/003-the-meeting-nobody-authorized"/);
  assert.doesNotMatch(second, /coming soon|Not yet linked|Chapter 004/);
  const third = html("003");
  assert.match(third, /href="\/chronicles\/002-sir-whiskers-opens-a-pull-request"/);
  assert.match(third, /href="\/chronicles"/);
  assert.doesNotMatch(third, /003-the-meeting-nobody-authorized|coming soon|Not yet linked|Chapter 004/);
});

test("chronicles index links published chapters and keeps the chapter IV block", () => {
  const html = renderToStaticMarkup(createElement(ChroniclesIndexPage));
  assert.match(html, /href="\/chronicles\/001-the-unauthorized-feline"/);
  assert.match(html, /href="\/chronicles\/002-sir-whiskers-opens-a-pull-request"/);
  assert.match(html, /href="\/chronicles\/003-the-meeting-nobody-authorized"/);
  assert.match(html, /Up next · Chapter IV · Coming soon · Not linked/);
  assert.match(html, /The Agent Who Scheduled a Meeting With Himself/);
  assert.doesNotMatch(html, /coming soon<\/p>/);
});
