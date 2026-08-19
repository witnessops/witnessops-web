import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pagePath = new URL("./page.tsx", import.meta.url);

test("payment success page keeps Stripe redirect non-authoritative", async () => {
  const source = await readFile(pagePath, "utf8");

  assert.match(source, /canonical: "\/payment\/success"/);
  assert.match(source, /robots: \{ index: false, follow: false \}/);
  assert.match(source, /does not confirm payment, accepted scope, authority, or the[\s\S]*start of work/);
  assert.match(source, /reconciling the Stripe record with your accepted[\s\S]*engagement/);
  assert.match(source, /Work begins only after payment, accepted SOW, written authority/);
  assert.match(source, /Do not send passwords, private keys, API keys/);
  assert.doesNotMatch(source, /Payment received/);
  assert.doesNotMatch(source, /webhook/i);
});
