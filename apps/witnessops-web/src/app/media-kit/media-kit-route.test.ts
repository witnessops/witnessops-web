import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const pageSource = readFileSync(resolve(__dirname, "page.tsx"), "utf-8");
const contentSource = readFileSync(
  resolve(__dirname, "../../components/marketing/media-kit-content.tsx"),
  "utf-8",
);
const publicRoot = resolve(__dirname, "../../../public");

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

test("media kit uses the homepage-native public shell and approved section structure", () => {
  assert.match(contentSource, /public-brand-page \$\{styles\.mediaPage\}/);
  assert.doesNotMatch(contentSource, /className="buyer-page"/);
  assert.match(contentSource, /SectionShell/);
  assert.match(contentSource, /spacing="spacious"/);
  assert.match(contentSource, /text-brand-accent/);
  assert.match(contentSource, /bg-surface-card/);
  assert.match(contentSource, /<h1[\s\S]*Media kit/);

  for (const heading of [
    "About WitnessOps",
    "Logos and marks",
    "Brand colours and typography",
    "Product screenshots",
    "Usage and contact",
  ]) {
    assert.ok(contentSource.includes(heading), `Missing Media kit section: ${heading}`);
  }
});

test("media kit metadata has the exact title and canonical route", () => {
  assert.match(pageSource, /title: "Media kit"/);
  assert.match(pageSource, /languageAlternates\("\/media-kit"/);
  assert.match(pageSource, /canonicalUrl\("\/media-kit"\)/);
  assert.match(pageSource, /title: "Media kit \| WitnessOps"/);
  assert.match(pageSource, /export default function MediaKitPage\(\) \{\s*return <MediaKitContent locale="en" \/>;/);
});

test("media kit preserves the approved description, palette and type wording", () => {
  assert.match(
    contentSource,
    /WitnessOps delivers bounded security and operational reviews with[\s\S]*evidence references, clear limits and a practical handover\./,
  );
  for (const marker of ["#0B0C0B", "#B89B62", "#F5F1E8", "Inter", "IBM Plex Mono"]) {
    assert.ok(contentSource.includes(marker), `Missing Media kit marker: ${marker}`);
  }
  assert.doesNotMatch(contentSource, /Barlow Condensed/);
  assert.doesNotMatch(contentSource, /Download font/i);
});

test("media kit downloads are same-origin, complete and descriptively labelled", () => {
  assert.match(contentSource, /download=\{asset\.fileName\}/);
  assert.match(contentSource, /aria-label=\{tx\(/);
  assert.match(contentSource, /tx\(locale, "Download", "Pobierz"\)\} \{asset\.format\}/);
  assert.match(contentSource, /download=\{screenshot\.fileName\}/);
  assert.match(contentSource, /Download complete ZIP/);
  assert.match(contentSource, /WitnessOps_Logo_System_v1\.zip/);
  assert.match(contentSource, /Package manifest/);
  assert.match(contentSource, /File checksums/);
  assert.doesNotMatch(contentSource, /https:\/\/drive\.google\.com|docs\.google\.com/);
});

test("canonical logo package and published masters retain their exact bytes", () => {
  const packageRoot = resolve(publicRoot, "media-kit/logo-system-v1");
  const zipPath = resolve(packageRoot, "WitnessOps_Logo_System_v1.zip");
  assert.equal(
    sha256(zipPath),
    "189edcf511639f5bc54f97dadaa011b9747ef81bc7e3879934784b675cdd6d53",
  );
  assert.match(contentSource, /189edcf511639f5bc54f97dadaa011b9747ef81bc7e3879934784b675cdd6d53/);

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
    ["witnessops-primary-stacked-black.svg", "21ab7293f9cac03e617ab4523f97fdc3d7c9d45ff80f477456a924f749e445bc"],
    ["witnessops-primary-stacked-white.svg", "18140eff9932611bc57f9075a42c301c27f31f89ab6ad7a729b3c9100ee400e5"],
    ["witnessops-mark-black.svg", "fa7ca892f67cbcc50b3cbab2b633886b963df34118337eeee679096b7be064a1"],
    ["witnessops-mark-white.svg", "2df4deaf83cb80c30ca066fbb76649d0802670d463232ef59bbb520f9141d5a8"],
    ["witnessops-app-icon-dark.svg", "3a397f211a678b7a73387659ce459d7366fe1e16cf37d0e69ea3a44f50e1464d"],
    ["witnessops-app-icon-light.svg", "204b73fe66f27fb74ca4e15e70f65e29ff8a064dc487d2751cb51fbe70fe59b9"],
  ]);
  for (const [fileName, expected] of masters) {
    assert.equal(sha256(resolve(publicRoot, `brand/witnessops-logo-system-v1/svg/${fileName}`)), expected, fileName);
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
    assert.doesNotMatch(contentSource.toLowerCase(), new RegExp(phrase));
  }
  assert.match(contentSource, /not a dedicated press inbox/);
});
