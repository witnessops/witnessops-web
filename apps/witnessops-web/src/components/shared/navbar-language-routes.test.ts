import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { localizedHref, localizedPath } from "@/lib/public-i18n";

const navbar = readFileSync(resolve(__dirname, "navbar.tsx"), "utf-8");

test("primary buyer navigation contains the approved English destinations", () => {
  for (const marker of [
    'label: "Services", href: "/catalog"',
    'label: "Customer Security Review", href: "/customer-security-review"',
    'label: "Skills", href: "/library"',
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
  assert.match(
    navbar,
    /href: buyerPublicOfferRequestHref\("en", "bounded-workflow-review"\)/,
  );
  assert.match(
    navbar,
    /href: buyerPublicOfferRequestHref\("pl", "bounded-workflow-review"\)/,
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

test("request language switch preserves the selected workflow offer query", () => {
  const offerQuery =
    "offerId=bounded-workflow-review&offer=Agent+Risk+%26+Control+Review";

  assert.equal(
    localizedHref("/review/request", offerQuery, "pl"),
    `/pl/review/request?${offerQuery}`,
  );
  assert.equal(
    localizedHref("/pl/review/request", offerQuery, "en"),
    `/review/request?${offerQuery}`,
  );
  assert.match(navbar, /const searchParams = useSearchParams\(\)/);
  assert.match(navbar, /localizedHref\(currentPath, currentSearch, "en"\)/);
  assert.match(navbar, /localizedHref\(currentPath, currentSearch, "pl"\)/);
});

test("tablet uses the compact navigation instead of overflowing desktop links", () => {
  const mobileNavbar = readFileSync(
    resolve(__dirname, "mobile-navbar-menu.tsx"),
    "utf-8",
  );

  assert.match(navbar, /hidden items-center gap-4 lg:flex/);
  assert.match(mobileNavbar, /lg:hidden/);
});

test("mobile header uses the approved mark and compact brand line", () => {
  assert.match(navbar, /const HOME_BRAND_LINE = "Proof beats memory\."/);
  assert.match(navbar, /aria-label=\{polish \? "WitnessOps — strona główna" : "WitnessOps home"\}/);
  assert.match(navbar, /hidden text-\[11px\][^\n]+lg:inline/);
  assert.match(navbar, /text-\[0\.7rem\] font-semibold[^\n]+lg:hidden/);
  assert.match(navbar, /inline-block -translate-y-px text-\[0\.7rem\]/);
  assert.match(navbar, /px-4 py-1\.5[^\n]+lg:py-4/);
  assert.match(navbar, /mobile-brand-navbar/);
  assert.doesNotMatch(navbar, /max-\[420px\]:hidden/);
});

test("mobile menu is an attached 48px-row sheet with one orange action", () => {
  const mobileNavbar = readFileSync(
    resolve(__dirname, "mobile-navbar-menu.tsx"),
    "utf-8",
  );

  assert.match(mobileNavbar, /className="contents"/);
  assert.match(mobileNavbar, /w-\[calc\(100%\+2rem\)\]/);
  assert.match(mobileNavbar, /max-h-\[32rem\]/);
  assert.match(mobileNavbar, /inline-flex h-12 items-center border-l-2/);
  assert.match(mobileNavbar, /inline-flex h-12 items-center border-t/);
  assert.equal(
    mobileNavbar.match(/!bg-brand-accent/g)?.length,
    1,
    "The mobile sheet must contain exactly one orange primary action",
  );
  assert.equal(
    mobileNavbar.match(/inline-block -translate-y-px/g)?.length,
    3,
    "Every mobile menu text treatment must share the optical baseline correction",
  );
  assert.match(mobileNavbar, /labelClassName="inline-block -translate-y-px"/);
});

test("every public route uses the orange primary action chrome", () => {
  assert.doesNotMatch(navbar, /homepageNativeChrome/);
  assert.match(navbar, /getDesktopCtaClassName/);
  assert.match(
    navbar,
    /border border-brand-accent bg-brand-accent text-text-inverse/,
  );
  assert.doesNotMatch(navbar, /bg-text-primary text-surface-bg/);
  assert.doesNotMatch(navbar, /#2b2b25|#37372f/);
});
