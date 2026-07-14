import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const english = readFileSync(resolve(__dirname, "page.tsx"), "utf-8");
const polish = readFileSync(
  resolve(__dirname, "../pl/customer-security-review/page.tsx"),
  "utf-8",
);

test("English and Polish Sprint pages preserve equivalent commercial boundaries", () => {
  for (const [enMarker, plMarker] of [
    ["one questionnaire and one", "kwestionariusza i jednego produktu"],
    ["From €1,600", "Od 1 600 €"],
    ["three working days", "trzech dni roboczych"],
    ["customer owns every outward-facing answer", "Klient odpowiada za każdą odpowiedź przekazywaną na zewnątrz"],
    ["Do not send the questionnaire, files", "Nie wysyłaj"],
    ["SYNTHETIC DEMONSTRATION — NOT CUSTOMER EVIDENCE", "SYNTHETIC DEMONSTRATION — NOT CUSTOMER EVIDENCE"],
  ]) {
    assert.ok(english.includes(enMarker), `Missing English parity marker: ${enMarker}`);
    assert.ok(polish.includes(plMarker), `Missing Polish parity marker: ${plMarker}`);
  }
});

test("paired Sprint routes declare only en, pl and x-default alternates", () => {
  for (const source of [english, polish]) {
    assert.match(source, /en: "\/customer-security-review"/);
    assert.match(source, /pl: "\/pl\/customer-security-review"/);
    assert.match(source, /"x-default": "\/customer-security-review"/);
  }
});

test("paired Sprint layouts preserve responsive hierarchy and accessible actions", () => {
  for (const source of [english, polish]) {
    assert.ok(source.includes("md:text-5xl lg:text-6xl"));
    assert.ok(source.includes("sm:grid sm:grid-cols-2 sm:gap-8 lg:block"));
    assert.ok(source.includes("md:grid-cols-2 md:gap-8 lg:gap-10"));
    assert.ok(source.includes("focus-visible:ring-2"));
  }

  assert.ok(english.includes('aria-label="Synthetic example response table"'));
  assert.ok(english.includes("min-w-[640px]"));
  assert.ok(polish.includes('<PublicContactRoute subject="fit-check" locale="pl" />'));
});
