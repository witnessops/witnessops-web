import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { localizedPath } from "@/lib/public-i18n";

const navbar = readFileSync(resolve(__dirname, "navbar.tsx"), "utf-8");

test("primary buyer navigation contains the approved English destinations", () => {
  for (const marker of [
    'label: "Services", href: "/catalog"',
    'label: "Customer Security Review", href: "/customer-security-review"',
    'label: "Library", href: "/library"',
    'label: "Why WitnessOps", href: "/why-witnessops"',
    'label: "Start a Review"',
  ]) {
    assert.ok(navbar.includes(marker), `Missing approved navigation marker: ${marker}`);
  }
});

test("language switch preserves every approved paired buyer route", () => {
  for (const [english, polish] of [
    ["/", "/pl"],
    ["/catalog", "/pl/catalog"],
    ["/customer-security-review", "/pl/customer-security-review"],
    ["/library", "/pl/library"],
    ["/why-witnessops", "/pl/why-witnessops"],
    ["/review/request", "/pl/review/request"],
  ]) {
    assert.equal(localizedPath(english, "pl"), polish);
    assert.equal(localizedPath(polish, "en"), english);
  }
});

test("tablet uses the compact navigation instead of overflowing desktop links", () => {
  const mobileNavbar = readFileSync(
    resolve(__dirname, "mobile-navbar-menu.tsx"),
    "utf-8",
  );

  assert.match(navbar, /hidden items-center gap-4 lg:flex/);
  assert.match(mobileNavbar, /className="lg:hidden"/);
});
