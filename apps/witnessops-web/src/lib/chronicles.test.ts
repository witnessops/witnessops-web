import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import ChroniclesIndexPage from "@/app/(marketing)/chronicles/page";
import ChronicleChapterPage, { generateMetadata, generateStaticParams } from "@/app/(marketing)/chronicles/[slug]/page";
import { ChronicleBody, ChroniclePager } from "@/components/marketing/chronicle-body";
import {
  PUBLISHED_CHAPTERS,
  BONUS_CHAPTERS,
  ALL_CHAPTERS,
  RESERVED_CHAPTERS,
  chronicleBodySource,
  chroniclePreviewText,
  readChronicleSource,
  type ChronicleChapter,
} from "@/lib/chronicles";
import { canonicalUrl } from "@/lib/public-seo";
import { getChronicleNarration } from "@/lib/chronicle-narration";

const BANNED = ["ChatGPT", "Cursor", "Grok", "Slack", "Facebook", "GitHub", "Jira", "Solitaire"];
const ENDING_MARKERS = ["END OF CHAPTER", "Next in", "Next chapter teaser"] as const;

function chapterById(id: ChronicleChapter["id"]): ChronicleChapter {
  const chapter = ALL_CHAPTERS.find((item) => item.id === id);
  assert.ok(chapter, id);
  return chapter;
}

function linkedHrefs(html: string): string[] {
  return [...html.matchAll(/href="([^"]*)"/g)].map((match) => match[1] ?? "");
}

test("published chapters stay in reading order", () => {
  assert.deepEqual(PUBLISHED_CHAPTERS.map((chapter) => chapter.id), ["001", "002", "003", "004", "005"]);
  assert.deepEqual(
    PUBLISHED_CHAPTERS.map((chapter) => chapter.slug),
    [
      "001-the-unauthorized-feline",
      "002-sir-whiskers-opens-a-pull-request",
      "003-the-meeting-nobody-authorized",
      "004-the-agent-who-scheduled-a-meeting-with-himself",
      "005-the-dashboard-that-never-was",
    ],
  );
  assert.deepEqual(RESERVED_CHAPTERS.map((chapter) => chapter.id), []);
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

test("pager links adjacent published chapters", () => {
  const html = (id: ChronicleChapter["id"]) => renderToStaticMarkup(createElement(ChroniclePager, { chapter: chapterById(id) }));
  assert.deepEqual(linkedHrefs(html("001")), ["/chronicles", "/chronicles/002-sir-whiskers-opens-a-pull-request"]);
  assert.deepEqual(linkedHrefs(html("002")), [
    "/chronicles/001-the-unauthorized-feline",
    "/chronicles/003-the-meeting-nobody-authorized",
  ]);
  assert.deepEqual(linkedHrefs(html("003")), [
    "/chronicles/002-sir-whiskers-opens-a-pull-request",
    "/chronicles/004-the-agent-who-scheduled-a-meeting-with-himself",
  ]);
  assert.deepEqual(linkedHrefs(html("004")), [
    "/chronicles/003-the-meeting-nobody-authorized",
    "/chronicles/005-the-dashboard-that-never-was",
  ]);
  assert.deepEqual(linkedHrefs(html("005")), [
    "/chronicles/004-the-agent-who-scheduled-a-meeting-with-himself",
    "/chronicles",
  ]);
  for (const id of ["001", "002", "003", "004", "005"] as const) {
    assert.equal(html(id).includes("coming soon"), false, id);
    assert.equal(html(id).includes("Not yet linked"), false, id);
  }
});

test("chronicles index links the five main chapters and the separate future receipt", () => {
  const html = renderToStaticMarkup(createElement(ChroniclesIndexPage));
  assert.deepEqual(linkedHrefs(html), [
    "/research",
    "/chronicles/001-the-unauthorized-feline",
    "/chronicles/002-sir-whiskers-opens-a-pull-request",
    "/chronicles/003-the-meeting-nobody-authorized",
    "/chronicles/004-the-agent-who-scheduled-a-meeting-with-himself",
    "/chronicles/005-the-dashboard-that-never-was",
    "/chronicles/2040-the-scope-escalation",
    "/reviews",
  ]);
  assert.equal(html.includes("The Dashboard That Never Was"), true);
  assert.equal(html.includes("CHAPTER V · 13 NOVEMBER 2026"), true);
  assert.equal(html.includes("The Agent Who Was Told Not to Press the Button"), false);
  assert.equal(html.includes("Coming soon"), false);
  assert.equal(html.includes("Not linked"), false);
});

test("future receipt preserves its fiction boundary, supplied story and standalone reading order", async () => {
  assert.deepEqual(BONUS_CHAPTERS.map((chapter) => chapter.id), ["2040"]);
  const chapter = chapterById("2040");
  assert.equal(chapter.title, "The Scope Escalation");
  assert.equal(chapter.dateline, "29 October 2026 → 29 October 2040");
  assert.equal(chapter.kicker, "RECEIPTS FROM THE FUTURE · 2040");
  assert.ok(generateStaticParams().some((item) => item.slug === chapter.slug));
  const body = chronicleBodySource(chapter);
  assert.match(body, /^### 01:41 AM — The Original Incident/);
  assert.match(body, /Fictional future system · Simulation display/);
  assert.match(body, /Universe rejected the pull request\./);
  assert.match(body, /Complete one real bounded task\./);
  assert.match(body, /### Post-credits scene/);
  assert.doesNotMatch(body, /€|2,500|END OF CHAPTER|cover-recreation|AsyncImage/);
  assert.equal(getChronicleNarration(chapter)?.voice, "orion");
  const html = renderToStaticMarkup(await ChronicleChapterPage({ params: Promise.resolve({ slug: chapter.slug }) }));
  assert.match(html, /A story from the WitnessOps desk\. Fiction; events dramatised\./);
  assert.match(html, /Fictional future system · Simulation display/);
  assert.equal((html.match(/data-chronicle-illustration=/g) ?? []).length, 4);
  assert.deepEqual(linkedHrefs(renderToStaticMarkup(createElement(ChroniclePager, { chapter }))), ["/chronicles"]);
  const metadata = await generateMetadata({ params: Promise.resolve({ slug: chapter.slug }) });
  assert.equal(metadata.title, "The Scope Escalation · The Sovereign Chronicles");
  assert.deepEqual(metadata.alternates, { canonical: canonicalUrl("/chronicles/2040-the-scope-escalation") });
});

test("chapter 004 keeps the fiction boundary and the single remaining review", () => {
  const chapter = chapterById("004");
  const html = renderToStaticMarkup(createElement(ChronicleBody, { chapter }));
  assert.match(html, /Fiction/);
  assert.match(html, /Classification: FICTIONAL INCIDENT/);
  assert.match(html, /Agent Action Security Review/);
  assert.match(html, /€2,500/);
  assert.match(html, /NOT TESTED/);
  assert.match(html, /Do not create an eleventh commercial service/);
  assert.match(html, /STATUS: IN PROGRESS/);
  assert.doesNotMatch(html, /END OF CHAPTER|CHAPTER V/);
  for (const name of BANNED) assert.equal(html.includes(name), false, name);
});

test("chapter 005 keeps the manuscript, the fiction subtitle, and the forward link from 004", async () => {
  const chapter = chapterById("005");
  assert.equal(chapter.title, "The Dashboard That Never Was");
  assert.equal(chapter.subtitle, "A fictionalised episode with The Crew.");
  assert.equal(chapter.dateline, "13 November 2026");
  assert.equal(chapter.kicker, "THE SOVEREIGN CHRONICLES · CHAPTER V");
  assert.equal(chapter.meta, "CH-005 · FICTION · 9 MIN READ");
  assert.equal(chapter.slug, "005-the-dashboard-that-never-was");
  const raw = readChronicleSource(chapter.sourceFile);
  assert.equal(raw.includes("Stopped thinking"), false);
  assert.equal(raw.includes("unpublished"), false);
  assert.equal(raw.includes("END OF CHAPTER"), false);
  assert.equal(raw.split("\n").includes("A fictionalised episode with The Crew."), true);
  assert.equal(raw.split("\n").includes("13 November 2026"), true);
  const body = chronicleBodySource(chapter);
  const lines = body.split("\n");
  assert.equal(lines[0], "### I. And this one?");
  assert.equal(lines.at(-1), "It was a task that finished.");
  for (const heading of [
    "### I. And this one?",
    "### II. A small integration",
    "### III. The two-word specification",
    "### IV. The machine behind the conversation",
    "### V. The customer",
    "### VI. GO ZIP",
    "### VII. The four boxes",
    "### Epilogue: A different definition of finished",
  ]) {
    assert.equal(lines.includes(heading), true, heading);
  }
  assert.equal(lines.includes("13 November 2026"), false);
  assert.equal(lines.includes("A fictionalised episode with The Crew."), false);
  assert.equal(body.includes("“What does this one do?”"), true);
  assert.equal(body.includes("“GO ZIP.”"), true);
  assert.equal(body.includes("Observed state, 13 November 2026. Not a monitoring system."), true);
  assert.equal(body.includes("a successful workflow—when they reached one—would not automatically become a finished operating system."), true);
  assert.equal(body.includes("The next useful thing was not another screen."), true);
  const html = renderToStaticMarkup(await ChronicleChapterPage({
    params: Promise.resolve({ slug: chapter.slug }),
  }));
  assert.equal(html.includes("A story from the WitnessOps desk. Fiction; events dramatised."), true);
  assert.equal(html.includes("A fictionalised episode with The Crew."), true);
  assert.equal(html.includes(">13 November 2026<"), true);
  assert.equal(html.includes("Stopped thinking"), false);
  assert.equal(html.includes("unpublished"), false);
  assert.equal(html.includes("END OF CHAPTER"), false);
  assert.deepEqual(linkedHrefs(html), [
    "/research",
    "/chronicles",
    "/chronicles/004-the-agent-who-scheduled-a-meeting-with-himself",
    "/chronicles",
  ]);
  const metadata = await generateMetadata({ params: Promise.resolve({ slug: chapter.slug }) });
  const title = "The Dashboard That Never Was · The Sovereign Chronicles";
  const canonical = canonicalUrl("/chronicles/005-the-dashboard-that-never-was");
  assert.equal(metadata.title, title);
  assert.equal(metadata.description, chapter.description);
  assert.deepEqual(metadata.alternates, { canonical });
  assert.equal(metadata.openGraph?.title, title);
  assert.equal(metadata.openGraph?.description, chapter.description);
  assert.equal(metadata.twitter?.title, title);
  assert.equal(metadata.twitter?.description, chapter.description);
});
