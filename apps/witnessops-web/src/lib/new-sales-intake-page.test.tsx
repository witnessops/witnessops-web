import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import assert from "node:assert/strict";
import test from "node:test";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import PolishReviewRequestPage from "@/app/pl/review/request/page";
import ReviewRequestPage from "@/app/review/request/page";

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

test("English and Polish request pages sell only the two accepted identities", async () => {
  const agent = await ReviewRequestPage({
    searchParams: Promise.resolve({
      offerId: "agent-action-security-review",
      offer: "Agent Action Security Review",
    }),
  });
  const agentHtml = render(agent);
  assert.match(agentHtml, /name="intent" value="agent-action-security-review"/);
  assert.match(agentHtml, /€2,500 fixed · excluding VAT/);
  assert.match(agentHtml, /One consequential agent or automation action/);
  assert.doesNotMatch(agentHtml, /Starting at €2,500/);
  assert.doesNotMatch(agentHtml, /offerId=agent-tools-access-review/);
  assert.doesNotMatch(agentHtml, /dated system-level inventory/);

  const external = await ReviewRequestPage({
    searchParams: Promise.resolve({ productId: "OFFSEC-EXTERNAL-EXPOSURE" }),
  });
  const externalHtml = render(external);
  assert.match(externalHtml, /name="intent" value="OFFSEC-EXTERNAL-EXPOSURE"/);
  assert.match(externalHtml, /€1,900 · excluding VAT/);
  assert.match(externalHtml, /This is not a penetration test/);
  assert.doesNotMatch(externalHtml, /agent-action-security-review/);

  const polishAgent = await PolishReviewRequestPage({
    searchParams: Promise.resolve({ offerId: "agent-action-security-review" }),
  });
  const polishHtml = render(polishAgent);
  assert.match(polishHtml, /name="intent" value="agent-action-security-review"/);
  assert.match(polishHtml, /€2 500: cena stała · bez VAT/);
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
    assert.match(html, /This link does not start a new review/);
    assert.match(html, /Existing requests and issued agreements keep their original terms/);
    assert.match(html, /href="\/review\/request\?offerId=agent-action-security-review"/);
    assert.match(html, /href="\/review\/request\?productId=OFFSEC-EXTERNAL-EXPOSURE"/);
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

test("the unselected enquiry offers exactly two review identities", async () => {
  const html = render(await ReviewRequestPage({ searchParams: Promise.resolve({}) }));
  assert.match(html, /Which review\?/);
  assert.match(html, /value="agent-action-security-review"/);
  assert.match(html, /value="OFFSEC-EXTERNAL-EXPOSURE"/);
  assert.doesNotMatch(html, /One Server Security Check|Free check|Not sure|Internet Footprint Review/);

  const earlyBird = render(
    await ReviewRequestPage({
      searchParams: Promise.resolve({ enquiryPath: "early-bird" }),
    }),
  );
  assert.match(earlyBird, /Which review\?/);
  assert.doesNotMatch(earlyBird, /Internet Footprint Review/);

  const polish = render(await PolishReviewRequestPage({ searchParams: Promise.resolve({}) }));
  assert.match(polish, /Który przegląd\?/);
  assert.match(polish, /value="agent-action-security-review"/);
  assert.match(polish, /value="OFFSEC-EXTERNAL-EXPOSURE"/);
  assert.match(html, /href="mailto:karol\.stefanski@mail\.witnessops\.com\?subject=WitnessOps%20fit%20check"/);
  assert.match(html, />karol\.stefanski@mail\.witnessops\.com</);
  assert.match(polish, /href="mailto:karol\.stefanski@mail\.witnessops\.com\?subject=WitnessOps%20fit%20check"/);
  assert.match(polish, />karol\.stefanski@mail\.witnessops\.com</);
  assert.doesNotMatch(html, /engage@mail\.witnessops\.com/);
  assert.doesNotMatch(polish, /engage@mail\.witnessops\.com/);
});
