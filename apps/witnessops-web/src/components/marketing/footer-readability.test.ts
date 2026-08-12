import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import { isLibraryPath } from "./footer";

test("footer keeps readable text contrast and sizing", () => {
  const source = readFileSync(resolve(__dirname, "footer.tsx"), "utf-8");
  const globals = readFileSync(
    resolve(__dirname, "../../app/globals.css"),
    "utf-8",
  );

  assert.match(source, /FOOTER_LINK_CLASS/);
  assert.match(source, /FOOTER_LEGAL_LINK_CLASS/);
  assert.match(source, /text-text-secondary/);
  assert.match(source, /text-xs leading-5 text-text-secondary/);
  assert.match(source, /rounded-full bg-text-muted/);
  assert.match(source, /max-w-\[320px\] text-sm leading-relaxed text-text-secondary/);
  assert.match(source, /data-footer-motto="proof-beats-memory"/);
  assert.match(source, /Proof beats memory\./);
  assert.match(source, /FOOTER_MOTTO/);
  assert.match(source, /public-footer/);
  assert.match(source, /grid-cols-2/);
  assert.match(source, /text-xs font-medium/);
  assert.match(globals, /footer\.public-shell\.public-footer\[data-brand-footer\]/);
  assert.match(globals, /--color-surface-bg: #050505/);
  assert.match(globals, /--color-text-primary: #fafaf7/);
  assert.match(globals, /--color-text-secondary: #d0ccc4/);
  assert.match(globals, /--color-text-muted: #a7a39b/);
  assert.doesNotMatch(source, /bg-signal-green/);
  assert.doesNotMatch(source, /Respect the boundary\. Bring receipts\./);

  assert.doesNotMatch(
    source,
    /fontSize:\s*(?:9|10)|text-\[(?:9|10)px\]/,
    "Footer body text should not regress to ultra-small text sizes.",
  );
  assert.doesNotMatch(
    source,
    /color:\s*"var\(--color-surface-border\)"/,
    "Footer text should not use border color as text color.",
  );
});

test("footer brand lockup uses the approved geometric mark without decorative effects", () => {
  const source = readFileSync(resolve(__dirname, "footer.tsx"), "utf-8");

  assert.match(source, /WitnessOpsMark/);
  assert.match(source, /variant="mark"/);
  assert.match(source, /tone="current"/);
  assert.match(source, /className="shrink-0 text-text-primary"/);
  assert.match(source, /className="public-shell public-footer border-t/);
  assert.match(source, /decorative/);
  assert.match(source, /data-footer-brand-lockup/);
  assert.match(source, /data-brand-footer="approved-2026-07-30"/);
  assert.match(source, /min-h-11/);
  assert.doesNotMatch(source, /Package Security Workflow/);
  assert.doesNotMatch(source, /shadow-\[0_0_6px/);
  assert.doesNotMatch(
    source,
    /drop-shadow|neon|bevel|glowing/i,
    "Footer mark must stay flat and inspectable.",
  );
});

test("footer provides Polish homepage labels without changing route contracts", () => {
  const source = readFileSync(resolve(__dirname, "footer.tsx"), "utf-8");

  for (const marker of [
    'label: "Usługi", href: "/pl/catalog"',
    'href: "/pl/customer-security-review"',
    'label: "Rozpocznij przegląd", href: "/pl/review/request"',
    'label: "Prywatność", href: "/privacy"',
    'label: "Warunki", href: "/terms"',
    'label: "Bezpieczeństwo", href: "/security"',
    'motto: FOOTER_MOTTO',
    "Proof beats memory.",
    "Operacje poparte dowodami",
  ]) {
    assert.ok(source.includes(marker), `Missing Polish footer marker: ${marker}`);
  }
});

test("library surface includes English and Polish library paths", () => {
  assert.equal(isLibraryPath("/library"), true);
  assert.equal(isLibraryPath("/library/extra"), true);
  assert.equal(isLibraryPath("/pl/library"), true);
  assert.equal(isLibraryPath("/pl/library/"), true);
  assert.equal(isLibraryPath("/pl"), false);
  assert.equal(isLibraryPath("/catalog"), false);
  assert.equal(isLibraryPath("/pl/catalog"), false);
});

test("footer suppresses Build STATIC and ships PL library island", () => {
  const source = readFileSync(resolve(__dirname, "footer.tsx"), "utf-8");

  assert.match(source, /LIBRARY_FOOTER_PL/);
  assert.match(source, /Publiczne punkty wejścia/);
  assert.match(source, /isPublicBuildLabel/);
  assert.doesNotMatch(
    source,
    /build_label:\s*"Build: STATIC"|build_label:\s*"Wersja: STATIC"/,
  );
  assert.match(source, /DOCS_PUBLIC_HREF/);
  assert.match(source, /DOCS_PL_HREF/);
  assert.match(source, /href: DOCS_PL_HREF/);
  assert.doesNotMatch(
    source,
    /href === "\/pl\/docs".*return DOCS_PUBLIC_HREF|return DOCS_PUBLIC_HREF.*\/pl\/docs/,
    "Polish /pl/docs must not rewrite to English /docs",
  );
});
