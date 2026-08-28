import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const pageSource = readFileSync(resolve(__dirname, "page.tsx"), "utf-8");
const publicRoot = resolve(__dirname, "../../../public");

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

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

test("media kit downloads are same-origin, complete and descriptively labelled", () => {
  assert.match(pageSource, /download=\{asset\.fileName\}/);
  assert.match(pageSource, /aria-label=\{`Download \$\{title\}/);
  assert.match(pageSource, /Download \{asset\.format\} · \{asset\.dimensions\}/);
  assert.match(pageSource, /download=\{screenshot\.fileName\}/);
  assert.match(pageSource, /Download complete ZIP/);
  assert.match(pageSource, /WitnessOps_Logo_System_v1\.zip/);
  assert.match(pageSource, /Package manifest/);
  assert.match(pageSource, /File checksums/);
  assert.doesNotMatch(pageSource, /https:\/\/drive\.google\.com|docs\.google\.com/);
});

test("canonical logo package and published masters retain their exact bytes", () => {
  const packageRoot = resolve(publicRoot, "media-kit/logo-system-v1");
  const zipPath = resolve(packageRoot, "WitnessOps_Logo_System_v1.zip");
  assert.equal(
    sha256(zipPath),
    "189edcf511639f5bc54f97dadaa011b9747ef81bc7e3879934784b675cdd6d53",
  );
  assert.match(pageSource, /189edcf511639f5bc54f97dadaa011b9747ef81bc7e3879934784b675cdd6d53/);

  const manifest = JSON.parse(readFileSync(resolve(packageRoot, "manifest.json"), "utf8"));
  assert.equal(manifest.status, "CANONICAL_PRODUCTION_ASSET_SET");
  assert.equal(manifest.files.length, 46);

  const checksumEntries = readFileSync(resolve(packageRoot, "SHA256SUMS.txt"), "utf8")
    .trim()
    .split("\n");
  assert.equal(checksumEntries.length, 47);

  const companions = new Map([
    ["README.md", "b6e95628104a777403107be8fb11e376148a6e02a6b4d2a36ddd35af17206dcc"],
    ["manifest.json", "4c037e7df12e72736577a81ab11b2d4459b30ee405584249cd89fae5994b863a"],
    ["mark-construction.json", "58d0722e4bffab1b2bd325ac87978508d72609840ec3b1b93a5d8ac0aad4220d"],
    ["witnessops-brand-sheet.png", "88b487d34acb14a84927afe6644df25cb10558a60862f6000ea8c7bfe2edb862"],
    ["witnessops-brand-sheet.svg", "8df28bfdf4b7ccb2b131397ffc3cf2f3ef2badde75d3043cfef89451d0e08655"],
    ["witnessops-clearspace.png", "ce5900467949ca23df25a6e5bfb16d6a142695d88c0303fd8d6911df96a5be0e"],
    ["witnessops-clearspace.svg", "9d219239113634d6ae265b36ea8793fb25960046fb0df886dd8e23d4837d4b3b"],
    ["witnessops-construction-grid.png", "e19b36558955904b4660030f0fc95053636cae2a0127a20c2bd527dab783db6b"],
    ["witnessops-construction-grid.svg", "255945845adc34ff0f7780158cc14b973442f5b8d22d91c845f6505b9a17c739"],
  ]);
  for (const [fileName, expected] of companions) {
    assert.equal(sha256(resolve(packageRoot, fileName)), expected, fileName);
  }

  const masters = new Map([
    ["witnessops-primary-stacked-black.svg", "cdf86853339e9c6b98458e262288b8c355979dd77d1343575847640803b8b84b"],
    ["witnessops-primary-stacked-white.svg", "ab4dd5ad5592a18b750ee8d87b15428c878baab43eed76198ca65e413f611aa2"],
    ["witnessops-mark-black.svg", "5ba79933305de96fea822f6dc501670fdc72a81b5908f5d46fc198e7c2d355fe"],
    ["witnessops-mark-white.svg", "fe6589c60572618c4f07368ab84d467c97a6ee438c42bf4a1987f6acb84a5e8e"],
    ["witnessops-app-icon-dark.svg", "736ec62a21236ba09466b3678c780e731babb9f09cfa6e1fafdc6f38b650e6ef"],
    ["witnessops-app-icon-light.svg", "dd330c2a9f94cffb0eb246a6cd8d1ed4174c388d5ecaf9490d562fc1d0a70eb3"],
  ]);
  for (const [fileName, expected] of masters) {
    assert.equal(sha256(resolve(publicRoot, `brand/${fileName}`)), expected, fileName);
  }
});

test("versioned logo-system artifacts are served with immutable cache headers", () => {
  const nextConfig = readFileSync(resolve(__dirname, "../../../next.config.js"), "utf8");
  assert.match(nextConfig, /source: "\/media-kit\/logo-system-v1\/:asset\*"/);
  assert.match(nextConfig, /public, max-age=31536000, immutable/);
});

test("media kit screenshot files exist in the public tree", () => {
  for (const fileName of [
    "witnessops-homepage-desktop.png",
    "witnessops-homepage-mobile.png",
  ]) {
    assert.equal(
      existsSync(resolve(publicRoot, `media-kit/${fileName}`)),
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
