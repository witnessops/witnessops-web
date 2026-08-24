import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import { BUYER_SERVICES } from "@/lib/buyer-services";

const source = readFileSync(resolve(__dirname, "buyer-homepage.tsx"), "utf8");
const onePagerDir = resolve(__dirname, "../../../public/assets/one-pagers");

test("homepage trust journey states what valid does and does not establish", () => {
  assert.match(source, /Don't take the record on trust\. Check it yourself\./);
  assert.match(source, /A valid result confirms the checks named in the receipt\./);
  assert.match(source, /Wynik ważny potwierdza kontrole wskazane w zapisie\./);
  assert.match(source, /does not prove that a finding is true/);
  assert.match(source, /that the reviewed system is secure/);
  assert.match(source, /does not prove the full runtime story/);
  assert.match(source, /href=\{text\.verifyHref\}/);
  assert.match(source, /https:\/\/www\.linkedin\.com\/in\/karol-s/);
  assert.match(source, /https:\/\/github\.com\/witnessops/);
  assert.doesNotMatch(source, /How it works/);
  assert.doesNotMatch(source, /proves that a finding is true/);
  assert.doesNotMatch(source, /receipt-scoped checks named for that receipt/);
  assert.doesNotMatch(source, /Wynik valid/);
});

test("Public Exposure Review constants stay named, priced, timed, and bounded", () => {
  const offer = BUYER_SERVICES.find(
    (service) => service.id === "external-exposure-assessment",
  );

  assert.equal(offer?.name.en, "Public Exposure Review");
  assert.equal(offer?.name.pl, "Public Exposure Review");
  assert.equal(offer?.productId, "OFFSEC-EXTERNAL-EXPOSURE");
  assert.equal(offer?.price.en, "€1,900 ex VAT — one authorised public-facing system");
  assert.match(offer?.timing.en ?? "", /Within 3 working days after/);
  assert.match(offer?.boundary.en ?? "", /No exploitation/);
  assert.match(offer?.boundary.en ?? "", /Unauthenticated outside-in checks only/);
  assert.match(source, /Public Exposure Review/);
  assert.match(source, /No exploitation · Fixed scope · No credentials/);
  assert.match(source, /Bez eksploatacji · Stały zakres · Bez poświadczeń/);
  assert.match(
    source,
    /€1,900 ex VAT · 3 working days after all start conditions are complete · 1 authorised public-facing system/,
  );
  assert.match(
    source,
    /€1 900 netto · 3 dni robocze po spełnieniu wszystkich warunków startu · 1 autoryzowany system publicznie dostępny/,
  );
  assert.match(source, /one authorised public-facing system/);
  assert.match(
    source,
    /No claim that this is a pentest, certification, or proof the system is secure/,
  );
  assert.doesNotMatch(source, /open-ended pentest/i);
  assert.doesNotMatch(source, /guarantees? (?:that )?the system is secure/i);
  assert.doesNotMatch(source, /€1,900 ex VAT · 3 working days · 1 authorised/);
  assert.doesNotMatch(
    source,
    /€1,900 ex VAT · 3 working days after start conditions · 1 authorised/,
  );
});

test("request-only public footprint audit stays secondary and off the homepage", () => {
  const offer = BUYER_SERVICES.find(
    (service) => service.id === "professional-public-footprint-audit",
  );

  assert.equal(offer?.homepageFeatured, false);
  assert.equal(offer?.pricingVisible, false);
  assert.equal(offer?.productId, undefined);
  assert.match(source, /service\.homepageFeatured !== false/);
  assert.doesNotMatch(source, /Professional Public Footprint Audit/);
});

test("public one-pagers stay the two existing Customer Security Review PDFs", () => {
  const pdfs = readdirSync(onePagerDir)
    .filter((name) => name.endsWith(".pdf"))
    .sort();

  assert.deepEqual(pdfs, ["csr-sprint-en-a4.pdf", "csr-sprint-pl-a4.pdf"]);
  assert.equal(
    BUYER_SERVICES.filter((service) => service.onePagerHref).map((service) => service.id).join(),
    "customer-security-review-sprint",
  );
  assert.equal(
    BUYER_SERVICES.find((service) => service.id === "external-exposure-assessment")
      ?.onePagerHref,
    undefined,
  );
  assert.match(source, /ONE_PAGER_LINK_PROPS/);
  assert.doesNotMatch(source, /public-exposure.*\.pdf|per-.*\.pdf/i);
});
