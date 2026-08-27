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
    'label: "Start a review"',
  ]) {
    assert.ok(navbar.includes(marker), `Missing approved navigation marker: ${marker}`);
  }
});

test("homepage navigation follows the offer, evidence, receipt, and workflow path", () => {
  for (const marker of [
    'label: "Agent Risk & Control Review", href: "/catalog/workflows"',
    'label: "How it works", href: "/#evidence-questions"',
    'label: "Action receipt", href: "/#agent-action-receipt"',
    'label: "Bring one workflow"',
    'Proof beats memory.',
  ]) {
    assert.ok(navbar.includes(marker), `Missing homepage navigation marker: ${marker}`);
  }

  assert.match(navbar, /data-home-nav=\{homeNav \? "true" : undefined\}/);
  assert.match(
    navbar,
    /data-product-journey-nav=\{productJourneyNav \? "true" : undefined\}/,
  );
});

test("Check a Skill remains absent from shared navigation", () => {
  assert.doesNotMatch(navbar, /\/verify\/skill/);
  assert.doesNotMatch(navbar, /Check a skill/i);
  assert.match(navbar, /const productJourneyNav = homeNav/);
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
