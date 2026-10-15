import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import {
  PathnameContext,
  SearchParamsContext,
} from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import PolishReviewRequestPage from "@/app/pl/review/request/page";
import ReviewRequestPage from "@/app/review/request/page";
import { Footer } from "@/components/marketing/footer";
import { COMPANY_DETAILS } from "@/lib/company-details";
import { loadHomeContent } from "@/lib/content";

const EXACT = {
  en: [
    "Company details",
    "Witnessops P.S.A.",
    "ul. Staszica 73A, 08-400 Garwolin, Poland",
    "KRS: 0001271405, Sąd Rejonowy Lublin-Wschód w Lublinie z siedzibą w Świdniku, VI Wydział Gospodarczy Krajowego Rejestru Sądowego",
    "NIP: 8262233962",
    "REGON: 54591401100000",
  ],
  pl: [
    "Dane spółki",
    "Witnessops prosta spółka akcyjna",
    "ul. Staszica 73A, 08-400 Garwolin, Polska",
    "KRS: 0001271405, Sąd Rejonowy Lublin-Wschód w Lublinie z siedzibą w Świdniku, VI Wydział Gospodarczy Krajowego Rejestru Sądowego",
    "NIP: 8262233962",
    "REGON: 54591401100000",
  ],
} as const;

function assertLines(html: string, locale: "en" | "pl") {
  for (const line of EXACT[locale]) {
    assert.ok(html.includes(line), `missing ${locale} company line: ${line}`);
  }
  assert.equal(html.includes("Witnessops P.S.A."), locale === "en");
  assert.equal(
    html.includes("Witnessops prosta spółka akcyjna"),
    locale === "pl",
  );
  assert.equal(html.includes("Garwolin, Poland"), locale === "en");
  assert.equal(html.includes("Garwolin, Polska"), locale === "pl");
  assert.doesNotMatch(html, /Karol|Stefańsk|stefanski/i);
}

function render(node: ReactNode, pathname: string) {
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
      createElement(
        PathnameContext.Provider,
        { value: pathname },
        createElement(
          SearchParamsContext.Provider,
          { value: new URLSearchParams() },
          node,
        ),
      ),
    ),
  );
}

function renderFooter(pathname: "/" | "/pl") {
  const footer = loadHomeContent().footer;
  return render(
    createElement(Footer, {
      brand_line: footer.brand_line,
      subline: footer.subline,
      links: footer.links,
      legal_links: footer.legal_links,
      build_label: footer.build_label,
      copyright: footer.copyright,
    }),
    pathname,
  );
}

test("company details render from one shared source on / and /pl footers and on the contact pages", async () => {
  const appRoot = resolve(__dirname, "../../..");
  const data = readFileSync(resolve(appRoot, "src/lib/company-details.ts"), "utf8");
  for (const line of [...EXACT.en, ...EXACT.pl]) {
    assert.ok(data.includes(line), `shared source missing: ${line}`);
  }
  assert.equal(COMPANY_DETAILS.en.krs, COMPANY_DETAILS.pl.krs);
  assert.equal(
    COMPANY_DETAILS.en.krs,
    "KRS: 0001271405, Sąd Rejonowy Lublin-Wschód w Lublinie z siedzibą w Świdniku, VI Wydział Gospodarczy Krajowego Rejestru Sądowego",
  );

  for (const relative of [
    "src/components/marketing/footer.tsx",
    "src/components/marketing/company-details.tsx",
    "src/app/review/request/page.tsx",
    "src/app/pl/review/request/page.tsx",
    "src/app/(marketing)/contact/page.tsx",
    "src/app/pl/contact/page.tsx",
  ]) {
    const source = readFileSync(resolve(appRoot, relative), "utf8");
    assert.doesNotMatch(
      source,
      /Witnessops P\.S\.A\.|Witnessops prosta spółka akcyjna|54591401100000|8262233962|0001271405|Staszica/,
      `${relative} must use the shared company details source`,
    );
  }

  const enContactRoute = readFileSync(
    resolve(appRoot, "src/app/(marketing)/contact/page.tsx"),
    "utf8",
  );
  const plContactRoute = readFileSync(
    resolve(appRoot, "src/app/pl/contact/page.tsx"),
    "utf8",
  );
  assert.match(enContactRoute, /permanentRedirect\("\/review\/request"\)/);
  assert.match(plContactRoute, /permanentRedirect\("\/pl\/review\/request"\)/);

  const enFooter = renderFooter("/");
  const plFooter = renderFooter("/pl");
  assert.match(enFooter, /data-company-details="footer"/);
  assert.match(enFooter, /data-company-details-locale="en"/);
  assert.match(plFooter, /data-company-details="footer"/);
  assert.match(plFooter, /data-company-details-locale="pl"/);
  assertLines(enFooter, "en");
  assertLines(plFooter, "pl");
  assert.match(enFooter, /engage@mail\.witnessops\.com/);
  assert.match(plFooter, /engage@mail\.witnessops\.com/);

  const contactCases = [
    {
      locale: "en" as const,
      page: await ReviewRequestPage({ searchParams: Promise.resolve({}) }),
    },
    {
      locale: "pl" as const,
      page: await PolishReviewRequestPage({ searchParams: Promise.resolve({}) }),
    },
    {
      locale: "en" as const,
      page: await ReviewRequestPage({
        searchParams: Promise.resolve({ offerId: "agent-action-security-review" }),
      }),
    },
    {
      locale: "pl" as const,
      page: await PolishReviewRequestPage({
        searchParams: Promise.resolve({ productId: "OFFSEC-EXTERNAL-EXPOSURE" }),
      }),
    },
  ];

  for (const contactCase of contactCases) {
    const html = render(contactCase.page, contactCase.locale === "pl" ? "/pl/review/request" : "/review/request");
    assert.match(html, /data-company-details="contact"/);
    assert.match(
      html,
      new RegExp(`data-company-details-locale="${contactCase.locale}"`),
    );
    assertLines(html, contactCase.locale);
    assert.match(html, />engage@mail\.witnessops\.com</);
  }

  const priced = render(
    await ReviewRequestPage({
      searchParams: Promise.resolve({ offerId: "agent-action-security-review" }),
    }),
    "/review/request",
  );
  const external = render(
    await ReviewRequestPage({
      searchParams: Promise.resolve({ productId: "OFFSEC-EXTERNAL-EXPOSURE" }),
    }),
    "/review/request",
  );
  assert.match(priced, /€2,500 fixed · excluding VAT/);
  assert.match(external, /€1,900 · excluding VAT/);
});
