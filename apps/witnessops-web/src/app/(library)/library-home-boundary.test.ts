import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const en = readFileSync(resolve(__dirname, "library/page.tsx"), "utf-8");
const pl = readFileSync(
  resolve(__dirname, "../pl/library/page.tsx"),
  "utf-8",
);

test("EN library is a short map with three starts and correct verify", () => {
  assert.match(en, /Public entry points/);
  assert.match(en, /Browse services/);
  assert.match(en, /Verify a receipt/);
  assert.match(en, /href: "\/verify"/);
  assert.match(en, /Buyer path/);
  assert.match(en, /not a live customer artifact/);
  assert.doesNotMatch(en, /Public verifier/);
  assert.doesNotMatch(en, /Security workflow buyer path/);
  assert.doesNotMatch(en, /border-2 border-black bg-white/);
  assert.doesNotMatch(en, /Example deliverables/);
});

test("PL library mirrors the short map structure", () => {
  assert.match(pl, /Publiczne punkty wejścia/);
  assert.match(pl, /Przeglądaj usługi/);
  assert.match(pl, /Zweryfikuj zapis/);
  assert.match(pl, /href: "\/pl\/verify"/);
  assert.match(pl, /Rozpocznij przegląd/);
  assert.doesNotMatch(pl, /border-2 border-black bg-white/);
});
