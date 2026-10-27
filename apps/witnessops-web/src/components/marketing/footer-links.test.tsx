import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import {
  PathnameContext,
  SearchParamsContext,
} from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import assert from "node:assert/strict";
import test from "node:test";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { Footer } from "@/components/marketing/footer";
import { buyerRequestHref } from "@/lib/buyer-services";
import { EXTERNAL_ATTACK_SURFACE_OFFER, PUBLIC_AGENT_ACTION_OFFER } from "@/lib/commercial-truth";
import { loadHomeContent } from "@/lib/content";
const appDir = resolve(__dirname, "../../app");

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
        createElement(SearchParamsContext.Provider, { value: new URLSearchParams() }, node),
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

function hrefs(html: string): string[] {
  return [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1].replaceAll("&amp;", "&"));
}

function routeFileExists(href: string): boolean {
  const pathname = href.split(/[?#]/)[0] || "/";
  if (pathname.startsWith("/catalog/") && pathname !== "/catalog/automation-repair") {
    return existsSync(resolve(appDir, "(marketing)/catalog/[skuId]/page.tsx"))
      || existsSync(resolve(appDir, `(marketing)${pathname}/page.tsx`));
  }
  if (pathname.startsWith("/pl/catalog/") && pathname !== "/pl/catalog/automation-repair") {
    return existsSync(resolve(appDir, "pl/catalog/[skuId]/page.tsx"));
  }
  if (pathname === "/docs" || pathname.startsWith("/docs/")) {
    return existsSync(resolve(appDir, "docs/page.tsx"));
  }
  if (pathname === "/pl/docs" || pathname.startsWith("/pl/docs/")) {
    return existsSync(resolve(appDir, "pl/docs/page.tsx"));
  }
  const direct = pathname === "/" ? resolve(appDir, "page.tsx") : resolve(appDir, `${pathname.slice(1)}/page.tsx`);
  return existsSync(direct)
    || existsSync(resolve(appDir, `(marketing)${pathname}/page.tsx`))
    || existsSync(resolve(appDir, `(library)${pathname}/page.tsx`));
}

test("English and Polish footers list the agent review and the footer-linked pages", () => {
  const en = renderFooter("/");
  const pl = renderFooter("/pl");
  const enHrefs = hrefs(en);
  const plHrefs = hrefs(pl);

  assert.ok(en.includes(`>${PUBLIC_AGENT_ACTION_OFFER.name.en}<`));
  assert.ok(pl.includes(`>${PUBLIC_AGENT_ACTION_OFFER.name.pl}<`));
  assert.ok(enHrefs.includes("/reviews/agent-action-security-review"));
  assert.ok(plHrefs.includes("/pl/reviews/agent-action-security-review"));
  assert.ok(enHrefs.includes(buyerRequestHref("en")));
  assert.ok(plHrefs.includes(buyerRequestHref("pl")));
  assert.equal(enHrefs.includes("/reviews/external-attack-surface-review"), false);
  assert.equal(plHrefs.includes("/pl/reviews/external-attack-surface-review"), false);
  assert.equal(enHrefs.includes(EXTERNAL_ATTACK_SURFACE_OFFER.route.en), false);

  for (const href of ["/privacy", "/terms", "/security", "/company", "/media-kit"]) {
    assert.ok(enHrefs.includes(href), `missing EN footer href ${href}`);
  }
  for (const href of ["/pl/privacy", "/pl/terms", "/pl/security", "/pl/company", "/pl/media-kit"]) {
    assert.ok(plHrefs.includes(href), `missing PL footer href ${href}`);
  }
  assert.ok(enHrefs.some((href) => href === "https://github.com/witnessops"));
  assert.ok(plHrefs.some((href) => href === "https://github.com/witnessops"));
  assert.match(en, /engage@mail\.witnessops\.com/);
  assert.match(pl, /engage@mail\.witnessops\.com/);
  assert.doesNotMatch(en, /Karol|Stefańsk|stefanski/i);
  assert.doesNotMatch(pl, /Karol|Stefańsk|stefanski/i);
  assert.doesNotMatch(`${en}\n${pl}`, /AI Agent Tools|Automation Repair|€250|€750|HubSpot|Notion|Google Drive/);

  for (const href of [...enHrefs, ...plHrefs]) {
    if (href.startsWith("mailto:") || href.startsWith("http") || href.startsWith("/brand/") || /\.(?:svg|png|ico|woff2)$/.test(href)) continue;
    assert.equal(routeFileExists(href), true, `footer href has no page: ${href}`);
  }
});
