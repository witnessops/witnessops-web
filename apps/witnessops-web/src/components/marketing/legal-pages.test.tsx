import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import assert from "node:assert/strict";
import test from "node:test";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { LegalEntityNotice } from "@/components/marketing/legal-document-page";
import MediaKitPage from "@/app/media-kit/page";
import { COMPANY_DETAILS } from "@/lib/company-details";
import { loadLegalPage } from "@/lib/content";
import { PUBLIC_CONTACT_EMAIL } from "@/lib/public-contact";

const webRoot = resolve(__dirname, "../../..");

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

const ENGLISH_BLOCK = [
  "Last updated",
  "Site scope",
  "Data we receive",
  "Service description",
  "Vulnerability reporting",
  "Related Legal Documents",
  "entity to be confirmed",
];

test("privacy and terms name the company from the shared record and the public contact", () => {
  for (const [slug, role] of [
    ["privacy", "controller"],
    ["terms", "provider"],
  ] as const) {
    for (const locale of ["en", "pl"] as const) {
      const html = render(createElement(LegalEntityNotice, { locale, role }));
      const company = COMPANY_DETAILS[locale];
      assert.match(html, new RegExp(`data-legal-entity="${role}"`));
      assert.match(html, new RegExp(`data-legal-entity-locale="${locale}"`));
      for (const line of [company.legalName, company.address, company.krs, company.nip, company.regon]) {
        assert.ok(html.includes(line), `${slug} ${locale} missing ${line}`);
      }
      assert.ok(html.includes(PUBLIC_CONTACT_EMAIL));
      assert.match(html, new RegExp(`href="${locale === "pl" ? "/pl/company" : "/company"}"`));
      assert.doesNotMatch(html, /Karol|Stefańsk|stefanski|HubSpot|Notion|Google Drive|entity to be confirmed/i);
    }
  }
});

test("Polish legal pages translate the existing clauses and do not duplicate the registry strings", () => {
  for (const slug of ["privacy", "terms", "security"] as const) {
    const source = readFileSync(
      resolve(webRoot, `../../content/witnessops/legal/pl/${slug}.mdx`),
      "utf8",
    );
    assert.doesNotMatch(source, /8262233962|54591401100000|0001271405|Staszica/);
    assert.doesNotMatch(source, /Karol|Stefańsk|stefanski|HubSpot|Notion|Google Drive|entity to be confirmed/i);
    for (const phrase of ENGLISH_BLOCK) {
      assert.equal(source.includes(phrase), false, `${slug} still shows ${phrase}`);
    }
  }
  const pageSource = readFileSync(
    resolve(__dirname, "legal-document-page.tsx"),
    "utf8",
  );
  assert.match(pageSource, /Granica zaufania/);
  assert.match(pageSource, /data-legal-locale=\{locale\}/);

  const privacy = loadLegalPage("privacy", "pl");
  const terms = loadLegalPage("terms", "pl");
  const security = loadLegalPage("security", "en");
  assert.match(privacy?.body ?? "", /Ostatnia aktualizacja/);
  assert.match(terms?.body ?? "", /Opis usługi/);
  assert.match(security?.body ?? "", /security\+witnessops@witnessops\.com/);
  assert.match(loadLegalPage("security", "pl")?.body ?? "", /security\+witnessops@witnessops\.com/);
});

test("media kit names the brand and the legal entity without withdrawn offers", () => {
  for (const locale of ["en", "pl"] as const) {
    const html = render(createElement(MediaKitPage, { locale }));
    assert.match(html, /data-media-kit-names=""/);
    assert.ok(html.includes("WitnessOps"));
    assert.ok(html.includes(COMPANY_DETAILS[locale].legalName));
    assert.match(html, new RegExp(`href="${locale === "pl" ? "/pl/company" : "/company"}"`));
    assert.ok(html.includes(PUBLIC_CONTACT_EMAIL));
    assert.doesNotMatch(html, /Karol|Stefańsk|stefanski|AI Agent Tools|€250|€750|Start with a question|HubSpot|Notion|Google Drive/i);
  }
  const polish = render(createElement(MediaKitPage, { locale: "pl" }));
  assert.match(polish, />Zestaw dla mediów</);
  assert.doesNotMatch(polish, />Media kit</);
  assert.doesNotMatch(polish, /About WitnessOps|One-sentence description|Download complete ZIP/);
});
