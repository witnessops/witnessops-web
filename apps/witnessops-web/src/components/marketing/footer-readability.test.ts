import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("footer keeps readable text contrast and sizing", () => {
  const source = readFileSync(resolve(__dirname, "footer.tsx"), "utf-8");

  assert.match(source, /FOOTER_LINK_CLASS/);
  assert.match(source, /FOOTER_LEGAL_LINK_CLASS/);
  assert.match(source, /text-text-secondary/);
  assert.match(source, /text-xs leading-5 text-text-secondary/);
  assert.match(source, /max-w-\[320px\] text-sm leading-relaxed text-text-secondary/);
  assert.match(source, /mt-5 text-center text-xs leading-5 text-text-secondary sm:mt-6/);

  assert.doesNotMatch(
    source,
    /fontSize:\s*(?:9|10|11)|text-\[(?:9|10|11)px\]/,
    "Footer text should not regress to ultra-small text sizes.",
  );
  assert.doesNotMatch(
    source,
    /color:\s*"var\(--color-surface-border\)"/,
    "Footer text should not use border color as text color.",
  );
});

test("footer provides Polish homepage labels without changing route contracts", () => {
  const source = readFileSync(resolve(__dirname, "footer.tsx"), "utf-8");

  for (const marker of [
    'label: "Usługi", href: "/pl/catalog"',
    'href: "/pl/customer-security-review"',
    'label: "Rozpocznij zgłoszenie", href: "/pl/review/request"',
    'label: "Prywatność", href: "/privacy"',
    'label: "Warunki", href: "/terms"',
    'label: "Bezpieczeństwo", href: "/security"',
    'motto: "Szanuj granice. Przedstaw potwierdzenia."',
  ]) {
    assert.ok(source.includes(marker), `Missing Polish footer marker: ${marker}`);
  }
});
