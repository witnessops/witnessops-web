import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("footer keeps readable text contrast and sizing", () => {
  const source = readFileSync(resolve(__dirname, "footer.tsx"), "utf-8");

  assert.match(source, /FOOTER_LINK_CLASS/);
  assert.match(source, /FOOTER_LEGAL_LINK_CLASS/);
  assert.match(source, /text-text-secondary/);
  assert.match(source, /fontSize: 11/);
  assert.match(source, /max-w-\[320px\] text-sm leading-relaxed text-text-secondary/);
  assert.match(source, /className="mt-6 text-center text-\[11px\] text-text-secondary"/);

  assert.doesNotMatch(
    source,
    /fontSize:\s*9|text-\[10px\]/,
    "Footer text should not regress to ultra-small text sizes.",
  );
  assert.doesNotMatch(
    source,
    /color:\s*"var\(--color-surface-border\)"/,
    "Footer text should not use border color as text color.",
  );
});
