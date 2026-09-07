import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { PRIMARY_OFFER } from "@/lib/commercial-truth";
import { localizedHref, localizedPath, POLISH_PUBLIC_NAV } from "@/lib/public-i18n";

const navbar = readFileSync(resolve(__dirname, "navbar.tsx"), "utf-8");
const homepageContent = readFileSync(
  resolve(__dirname, "../../../../../content/witnessops/landing/home.yaml"), "utf-8",
);

test("primary buyer navigation contains the approved English destinations", () => {
  for (const marker of [
    'label: "Services"',
    'href: "/catalog"',
    'label: "Sample work"',
    'href: "/catalog/automation-repair"',
    'label: "Our approach"',
    'href: "/why-witnessops"',
    'label: "Docs"',
    'label: "Scope a review"',
  ]) {
    assert.ok(homepageContent.includes(marker), `Missing navigation marker: ${marker}`);
  }

  assert.equal(PRIMARY_OFFER.name.en, "Agent Action Security Review");
  assert.equal(PRIMARY_OFFER.route, "/catalog/workflows");
  assert.match(navbar, /href: reviewRequestHrefForLocation\(/);
});

test("home and inner pages share navigation while preserving the selected enquiry", () => {
  assert.match(navbar, /const effectiveLinks = polish \? \[\.\.\.POLISH_PUBLIC_NAV.links\] : links/);
  assert.doesNotMatch(navbar, /HOME_NAV_LINKS|productJourneyNav/);
  assert.match(navbar, /href: reviewRequestHrefForLocation\(/);
  assert.match(navbar, /label: polish \? "Omów zakres przeglądu" : "Scope a review"/);
  assert.deepEqual(POLISH_PUBLIC_NAV.links.map((link) => link.href), [
    "/pl/catalog", "/review/sample-cases", "/pl/why-witnessops", "/pl/docs",
  ]);
  assert.equal(POLISH_PUBLIC_NAV.links[1].label, "Przykłady (EN)");
});

test("Check a Skill remains absent from shared navigation", () => {
  assert.doesNotMatch(navbar, /\/verify\/skill/);
  assert.doesNotMatch(navbar, /Check a skill/i);
  assert.doesNotMatch(navbar, /productJourneyNav/);
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
    "offerId=bounded-workflow-review&offer=Agent+Workflow+Reconstruction";

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

test("PL-only docs leaves switch to real English routes", () => {
  for (const slug of [
    "understand-the-service",
    "how-witnessops-works",
    "what-you-receive",
    "how-receipts-work",
    "evidence-and-limitations",
    "buyer-approver-guide",
    "is-witnessops-right-for-this",
    "what-you-need-to-provide",
  ]) {
    assert.equal(
      localizedPath(`/pl/docs/${slug}`, "en"),
      "/docs",
      `${slug} must fall back to the real English docs hub`,
    );
    assert.equal(
      localizedHref(`/pl/docs/${slug}`, "source=pl-leaf", "en"),
      "/docs",
      `${slug} fallback must not carry leaf-only query context`,
    );
  }

  for (const slug of ["faq", "glossary"]) {
    assert.equal(localizedPath(`/pl/docs/${slug}`, "en"), `/docs/${slug}`);
    assert.equal(localizedPath(`/docs/${slug}`, "pl"), `/pl/docs/${slug}`);
  }
});

test("Polish chrome keeps its logo on the Polish home route", () => {
  assert.match(navbar, /const logoHref = polish \? "\/pl" : "\/"/);
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
  assert.match(navbar, /aria-label=\{polish \? "WitnessOps: strona główna" : "WitnessOps home"\}/);
  assert.match(navbar, /hidden text-sm[^\n]+lg:inline/);
  assert.match(navbar, /text-\[0\.7rem\] font-semibold[^\n]+lg:hidden/);
  assert.match(navbar, /inline-block -translate-y-px text-\[0\.7rem\]/);
  assert.match(navbar, /px-4 py-2[^\n]+lg:py-4/);
  assert.match(navbar, /mobile-brand-navbar/);
  assert.doesNotMatch(navbar, /max-\[420px\]:hidden/);
});

test("mobile menu is a viewport-bounded scrolling sheet with one orange action", () => {
  const mobileNavbar = readFileSync(
    resolve(__dirname, "mobile-navbar-menu.tsx"),
    "utf-8",
  );

  assert.match(mobileNavbar, /className="contents"/);
  assert.match(mobileNavbar, /absolute inset-x-0 top-full/);
  assert.match(
    mobileNavbar,
    /max-h-\[calc\(100dvh-var\(--app-navbar-height,72px\)\)\]/,
  );
  assert.match(mobileNavbar, /overflow-y-auto overscroll-contain/);
  assert.match(mobileNavbar, /env\(safe-area-inset-bottom\)/);
  assert.match(mobileNavbar, /acquireBodyScrollLock/);
  assert.match(mobileNavbar, /releaseBodyScrollLock\(\)/);
  assert.match(mobileNavbar, /inline-flex h-12 items-center border-l-2/);
  assert.match(mobileNavbar, /inline-flex h-12 items-center border-t/);
  assert.match(navbar, /assistantLink=\{\{ label: "Ask WitnessOps", href: "\/docs\/assistant" \}\}/);
  assert.equal(
    mobileNavbar.match(/!bg-brand-accent/g)?.length,
    1,
    "The mobile sheet must contain exactly one orange primary action",
  );
  assert.equal(
    mobileNavbar.match(/inline-block -translate-y-px/g)?.length,
    4,
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
