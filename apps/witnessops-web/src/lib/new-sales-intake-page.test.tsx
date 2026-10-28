import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import assert from "node:assert/strict";
import test from "node:test";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import PolishReviewRequestPage, { generateMetadata as polishMetadata } from "@/app/pl/review/request/page";
import ReviewRequestPage, { generateMetadata as englishMetadata } from "@/app/review/request/page";

function render(node: ReactNode) {
  return renderToStaticMarkup(
    createElement(
      AppRouterContext.Provider,
      {
        value: {
          back() {},
          forward() {},
          refresh() {},
          push() {},
          replace() {},
          prefetch() {},
        },
      },
      node,
    ),
  );
}

test("English and Polish request pages sell only the agent review", async () => {
  const agent = await ReviewRequestPage({
    searchParams: Promise.resolve({
      offerId: "agent-action-security-review",
      offer: "Agent Action Security Review",
    }),
  });
  const agentHtml = render(agent);
  assert.match(agentHtml, /name="intent" value="agent-action-security-review"/);
  assert.match(agentHtml, /€2,500\u00A0excl.\u00A0VAT/);
  assert.match(agentHtml, /One consequential agent or automation action/);
  assert.doesNotMatch(agentHtml, /Starting at €2,500/);
  assert.doesNotMatch(agentHtml, /offerId=agent-tools-access-review/);
  assert.doesNotMatch(agentHtml, /dated system-level inventory/);

  const external = await ReviewRequestPage({
    searchParams: Promise.resolve({ productId: "OFFSEC-EXTERNAL-EXPOSURE" }),
  });
  const externalHtml = render(external);
  assert.match(externalHtml, /External Attack Surface Review is no longer available/);
  assert.match(externalHtml, /It is not the Agent Action Security Review/);
  assert.equal(externalHtml.includes("<form"), false);
  assert.doesNotMatch(externalHtml, /€1,900/);
  assert.doesNotMatch(externalHtml, /name="intent" value="OFFSEC-EXTERNAL-EXPOSURE"/);

  const polishAgent = await PolishReviewRequestPage({
    searchParams: Promise.resolve({ offerId: "agent-action-security-review" }),
  });
  const polishHtml = render(polishAgent);
  assert.match(polishHtml, /name="intent" value="agent-action-security-review"/);
  assert.match(polishHtml, /€2\u00A0500\u00A0bez\u00A0VAT/);
  assert.doesNotMatch(polishHtml, /€\s?[\d\s\u00A0]+\s?·\s?bez VAT/);
  assert.doesNotMatch(polishHtml, /cena stała/);
  assert.match(polishHtml, /Jedno istotne działanie agenta lub automatyzacji/);
  assert.doesNotMatch(polishHtml, /Od €2 500 · bez VAT/);
});

test("legacy, pilot, ambiguous, and display-only request URLs do not open a form", async () => {
  const cases = [
    { offerId: "agent-tools-access-review" },
    { offerId: "bounded-workflow-review" },
    { productId: "OFFSEC-PILOT" },
    { offerId: "OFFSEC-EXTERNAL-EXPOSURE" },
    { productId: "agent-action-security-review" },
    { offer: "Agent Action Security Review" },
    {
      offerId: "agent-action-security-review",
      productId: "OFFSEC-EXTERNAL-EXPOSURE",
    },
  ];

  for (const params of cases) {
    const html = render(await ReviewRequestPage({ searchParams: Promise.resolve(params) }));
    assert.equal(html.includes("<form"), false, JSON.stringify(params));
    const parked = (params.productId === "OFFSEC-EXTERNAL-EXPOSURE" && !params.offerId)
      || (params.offerId === "OFFSEC-EXTERNAL-EXPOSURE" && !params.productId);
    assert.match(html, parked ? /no longer available/ : /This link does not start a new review/);
    assert.match(html, /Existing requests and issued agreements keep their original terms/);
    assert.match(html, /href="\/review\/request\?offerId=agent-action-security-review"/);
    assert.doesNotMatch(html, /href="\/review\/request\?productId=OFFSEC-EXTERNAL-EXPOSURE"/);
    assert.doesNotMatch(html, /offerId=agent-tools-access-review/);
  }

  const polish = render(
    await PolishReviewRequestPage({
      searchParams: Promise.resolve({ offerId: "agent-tools-access-review" }),
    }),
  );
  assert.equal(polish.includes("<form"), false);
  assert.match(polish, /Ten link nie rozpoczyna nowego przeglądu/);
  assert.match(polish, /href="\/pl\/review\/request\?offerId=agent-action-security-review"/);
});

test("the unselected enquiry is the agent review and has no offer selector", async () => {
  const html = render(await ReviewRequestPage({ searchParams: Promise.resolve({}) }));
  assert.doesNotMatch(html, /Which review\?/);
  assert.match(html, /value="agent-action-security-review"/);
  assert.match(html, /Consequential action/);
  assert.match(html, /Systems involved/);
  assert.match(html, /Decision deadline/);
  assert.doesNotMatch(html, /value="OFFSEC-EXTERNAL-EXPOSURE"/);
  assert.doesNotMatch(html, /One Server Security Check|Free check|Not sure|Internet Footprint Review/);

  const earlyBird = render(
    await ReviewRequestPage({
      searchParams: Promise.resolve({ enquiryPath: "early-bird" }),
    }),
  );
  assert.match(earlyBird, /Consequential action/);
  assert.doesNotMatch(earlyBird, /Internet Footprint Review/);

  const polish = render(await PolishReviewRequestPage({ searchParams: Promise.resolve({}) }));
  assert.doesNotMatch(polish, /Który przegląd\?/);
  assert.match(polish, /value="agent-action-security-review"/);
  assert.match(polish, /Istotne działanie/);
  assert.doesNotMatch(polish, /value="OFFSEC-EXTERNAL-EXPOSURE"/);
  assert.match(html, /href="mailto:engage@mail\.witnessops\.com\?subject=WitnessOps%20fit%20check"/);
  assert.match(html, />engage@mail\.witnessops\.com</);
  assert.match(polish, /href="mailto:engage@mail\.witnessops\.com\?subject=WitnessOps%20fit%20check"/);
  assert.match(polish, />engage@mail\.witnessops\.com</);
  assert.doesNotMatch(html, /karol\.stefanski@/);
  assert.doesNotMatch(polish, /karol\.stefanski@/);
});

test("enquiry metadata preserves the canonical contact alias and describes rejected links accurately", async () => {
  for (const [locale, generateMetadata] of [["en", englishMetadata], ["pl", polishMetadata]] as const) {
    const active = await generateMetadata({ searchParams: Promise.resolve({}) });
    assert.match(String(active.title), /Agent Action Security Review/);
    assert.equal(active.alternates?.canonical, `https://witnessops.com${locale === "pl" ? "/pl" : ""}/contact`);
    for (const query of [
      { productId: "OFFSEC-EXTERNAL-EXPOSURE" },
      { offerId: "agent-tools-access-review" },
      { offerId: "unknown" },
    ]) {
      const rejected = await generateMetadata({ searchParams: Promise.resolve(query) });
      assert.match(String(rejected.title), locale === "pl" ? /nie rozpoczyna przeglądu/ : /does not start a new review/);
      assert.doesNotMatch(String(rejected.description), /€|Request Agent|Rozpocznij/);
    }
  }
});
