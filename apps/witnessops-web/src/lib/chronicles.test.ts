import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ChronicleBody } from "@/components/marketing/chronicle-body";
import {
  PUBLISHED_CHAPTERS,
  chronicleBodySource,
  chroniclePreviewText,
  readChronicleSource,
} from "@/lib/chronicles";

const BANNED = ["ChatGPT", "Cursor", "Grok", "Slack", "Facebook", "GitHub", "Jira", "Solitaire"];

test("chronicle preview drops brand names and corrects the attendance row", () => {
  const chapter = PUBLISHED_CHAPTERS[1];
  const preview = chroniclePreviewText(readChronicleSource(chapter.sourceFile));
  for (const name of BANNED) {
    assert.equal(preview.includes(name), false, name);
  }
  assert.match(preview, /Sovereign Dot \.+ PRESENT/);
  assert.match(preview, /the researcher \/ Sovereign Dot/);
  assert.doesNotMatch(preview, /Sovereign Bot\s+PRESENT/);
});

test("rendered chapter 001 keeps the fiction body emoji and hides the title cat", () => {
  const chapter = PUBLISHED_CHAPTERS[0];
  const html = renderToStaticMarkup(createElement(ChronicleBody, { chapter }));
  assert.match(html, /Fiction/);
  assert.equal(html.includes("🐈"), false);
  assert.match(chronicleBodySource(chapter), /🙂|😈/);
  for (const name of BANNED) assert.equal(html.includes(name), false, name);
});
