import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("verify-ui remains a noindex UI-proof presentation surface", () => {
  const source = readFileSync(resolve(__dirname, "page.tsx"), "utf-8");

  assert.match(source, /robots:\s*{\s*\n\s*index:\s*false,\s*\n\s*follow:\s*false,/);
  assert.match(source, /UI proof report/);
  assert.match(source, /homepage hero UI proof/);
  assert.match(source, /not a deployment, release, or broader product\s+assurance claim/);
  assert.match(source, /public["'],\s*\n\s*["']ui-proofs["'],\s*\n\s*["']homepage-hero["'],\s*\n\s*["']latest\.json["']/);
  assert.match(source, /gridPublicPath = \"\/ui-proofs\/homepage-hero\/grid\.png\"/);

  assert.doesNotMatch(source, /verified compliance|certified compliance|audit-ready|guarantees compliance/i);
  assert.doesNotMatch(source, /Request one proof run|Package one security workflow|ContactForm|SupportIntake/);
});
