import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { ExternalExposureSnapshotPage } from "@/components/marketing/external-exposure-snapshot";
import { BUYER_SERVICES } from "@/lib/buyer-services";
import {
  EXPOSURE_SNAPSHOT_ALLOWED_OFFERS,
  EXPOSURE_SNAPSHOT_CONTACT_EMAIL,
  EXPOSURE_SNAPSHOT_NEEDS_REVIEW,
  EXPOSURE_SNAPSHOT_REVIEW,
  EXPOSURE_SNAPSHOT_ROUTE,
  EXPOSURE_SNAPSHOT_SAMPLE_PLACEHOLDER,
  exposureSnapshotMetadata,
} from "@/lib/external-exposure/catalog";
import { EXTERNAL_ATTACK_SURFACE_OFFER } from "@/lib/commercial-truth";
import sitemap from "@/app/sitemap";
import { canonicalUrl } from "@/lib/public-seo";

const PERSONAL_NAMES = /karol|stefański|stefanski|ks@/i;

function renderPage() {
  return renderToStaticMarkup(<ExternalExposureSnapshotPage />);
}

test("external exposure snapshot landing renders the free entry and locked EASR price", () => {
  const html = renderPage();

  assert.match(html, /<h1\b/);
  assert.match(html, /See what your public edge exposes/);
  assert.match(html, /An enquiry is not authorisation to test\./);
  assert.match(html, new RegExp(EXPOSURE_SNAPSHOT_REVIEW.name));
  assert.match(html, new RegExp(EXPOSURE_SNAPSHOT_REVIEW.price.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(html, new RegExp(EXPOSURE_SNAPSHOT_REVIEW.inclusions.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.equal(html.includes("<form"), false);
  assert.doesNotMatch(html, /\/api\//);
  assert.equal(exposureSnapshotMetadata.alternates.canonical, canonicalUrl(EXPOSURE_SNAPSHOT_ROUTE));
});

test("snapshot landing names only the two allowed offers and their locked prices", () => {
  const html = renderPage();
  const allowedNames = new Set<string>(EXPOSURE_SNAPSHOT_ALLOWED_OFFERS.map((offer) => offer.name));
  const allowedPrices: readonly string[] = EXPOSURE_SNAPSHOT_ALLOWED_OFFERS.map((offer) => offer.price);

  assert.match(html, /data-named-offer="External Attack Surface Review"/);
  assert.match(html, /data-offer-price="€1,900 · excluding VAT"/);
  assert.equal(html.includes("Agent Action Security Review"), false);
  assert.doesNotMatch(html, /€2,500/);
  assert.doesNotMatch(html, /ex VAT|excl\. VAT/);

  for (const service of BUYER_SERVICES) {
    if (!allowedNames.has(service.name.en)) {
      assert.equal(html.includes(service.name.en), false, service.name.en);
    }
    if (!allowedPrices.includes(service.price.en)) {
      assert.equal(html.includes(service.price.en), false, service.price.en);
    }
  }

  assert.equal(html.includes("Public Exposure Review"), false);
  assert.equal(EXTERNAL_ATTACK_SURFACE_OFFER.price.en, "€1,900 · excluding VAT");
});

test("snapshot landing contact, proof placeholder, and needs-review terms stay bounded", () => {
  const html = renderPage();
  const emails = html.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];

  assert.deepEqual([...new Set(emails)], [EXPOSURE_SNAPSHOT_CONTACT_EMAIL]);
  assert.match(html, /href="mailto:engage@mail\.witnessops\.com\?subject=/);
  assert.doesNotMatch(html, PERSONAL_NAMES);
  assert.doesNotMatch(html, /offsec\.global/i);
  assert.match(html, new RegExp(EXPOSURE_SNAPSHOT_SAMPLE_PLACEHOLDER));

  for (const term of EXPOSURE_SNAPSHOT_NEEDS_REVIEW) {
    assert.equal(html.includes(`data-needs-review="${term.id}"`), true, term.id);
    assert.match(html, /Needs review/);
  }

  assert.equal((html.match(/data-needs-review="one-page"/g) ?? []).length, 2);
  assert.equal(html.includes("2 business days"), true);
  assert.equal(html.includes("Up to 3 manually-validated observations"), true);
  assert.equal(html.includes("One page, manually checked."), true);
});

test("sitemap lists the English snapshot landing without a Polish pair", async () => {
  const entries = await sitemap();
  const entry = entries.find((item) => item.url === canonicalUrl(EXPOSURE_SNAPSHOT_ROUTE));

  assert.ok(entry, EXPOSURE_SNAPSHOT_ROUTE);
  assert.equal(entry.alternates, undefined);
  assert.equal(
    entries.some((item) => item.url === canonicalUrl(`/pl${EXPOSURE_SNAPSHOT_ROUTE}`)),
    false,
  );
});
