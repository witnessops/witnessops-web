import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const pageSource = readFileSync(resolve(__dirname, "page.tsx"), "utf-8");

test("media kit uses the homepage-native public shell and approved section structure", () => {
  assert.match(pageSource, /className="public-brand-page"/);
  assert.doesNotMatch(pageSource, /className="buyer-page"/);
  assert.match(pageSource, /SectionShell/);
  assert.match(pageSource, /spacing="spacious"/);
  assert.match(pageSource, /text-brand-accent/);
  assert.match(pageSource, /bg-surface-card/);
  assert.match(pageSource, /<h1[\s\S]*Media kit/);

  for (const heading of [
    "About WitnessOps",
    "Logos and marks",
    "Brand colours and typography",
    "Product screenshots",
    "Usage and contact",
  ]) {
    assert.ok(pageSource.includes(heading), `Missing Media kit section: ${heading}`);
  }
});

test("media kit metadata has the exact title and canonical route", () => {
  assert.match(pageSource, /title: "Media kit"/);
  assert.match(pageSource, /canonicalUrl\("\/media-kit"\)/);
  assert.match(pageSource, /title: "Media kit \| WitnessOps"/);
});

test("media kit preserves the approved description, palette and type wording", () => {
  assert.match(
    pageSource,
    /WitnessOps delivers bounded security and operational reviews with[\s\S]*evidence references, clear limits and a practical handover\./,
  );
  for (const marker of ["#050505", "#F27A3D", "#FAFAF7", "Inter", "IBM Plex Mono"]) {
    assert.ok(pageSource.includes(marker), `Missing Media kit marker: ${marker}`);
  }
  assert.doesNotMatch(pageSource, /Barlow Condensed/);
  assert.doesNotMatch(pageSource, /Download font/i);
});

test("media kit downloads are individual, same-origin and descriptively labelled", () => {
  assert.match(pageSource, /download=\{asset\.fileName\}/);
  assert.match(pageSource, /aria-label=\{`Download \$\{title\}/);
  assert.match(pageSource, /Download \{asset\.format\} · \{asset\.dimensions\}/);
  assert.match(pageSource, /download=\{screenshot\.fileName\}/);
  assert.doesNotMatch(pageSource, /\.zip|ZIP/);
  assert.doesNotMatch(pageSource, /https:\/\/drive\.google\.com|docs\.google\.com/);
});

test("media kit screenshot files exist in the public tree", () => {
  for (const fileName of [
    "witnessops-homepage-desktop.png",
    "witnessops-homepage-mobile.png",
  ]) {
    assert.equal(
      existsSync(resolve(__dirname, `../../../public/media-kit/${fileName}`)),
      true,
      `Missing Media kit screenshot: ${fileName}`,
    );
  }
});

test("media kit avoids unsupported authority and newsroom claims", () => {
  for (const phrase of [
    "independently verified",
    "production-ready",
    "release-ready",
    "customer-ready",
    "press coverage",
    "newsroom",
  ]) {
    assert.doesNotMatch(pageSource.toLowerCase(), new RegExp(phrase));
  }
  assert.match(pageSource, /not a dedicated press inbox/);
});
