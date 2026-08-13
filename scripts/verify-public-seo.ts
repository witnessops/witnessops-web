import assert from "node:assert/strict";

import { decodeXmlText } from "./verify-public-seo-xml";

type SitemapEntry = {
  url: string;
  languages: Record<string, string>;
};

const canonicalOrigin = "https://witnessops.com";
const defaultBaseUrl = "http://127.0.0.1:3001";

function normalizeBaseUrl(value: string) {
  const url = new URL(value);
  url.pathname = url.pathname.replace(/\/+$/, "");
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

function parseSitemap(xml: string): SitemapEntry[] {
  return [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((match) => {
    const block = match[1];
    const loc = block.match(/<loc>([\s\S]*?)<\/loc>/)?.[1];
    assert.ok(loc, "Every sitemap entry must have a loc");

    const languages = Object.fromEntries(
      [...block.matchAll(/<xhtml:link\s+([^>]*?)\/?\s*>/g)].map((link) => {
        const attributes = link[1];
        const hreflang = attributes.match(/hreflang="([^"]+)"/)?.[1];
        const href = attributes.match(/href="([^"]+)"/)?.[1];
        assert.ok(hreflang && href, `Malformed sitemap alternate in ${loc}`);
        return [hreflang, decodeXmlText(href)];
      }),
    );

    return { url: decodeXmlText(loc.trim()), languages };
  });
}

function htmlAttribute(html: string, elementPattern: RegExp, attribute: string) {
  const element = html.match(elementPattern)?.[0];
  if (!element) return undefined;
  return element.match(new RegExp(`${attribute}=["']([^"']+)["']`, "i"))?.[1];
}

function htmlAlternates(html: string) {
  const languages: Record<string, string> = {};
  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = match[0];
    if (!/\brel=["']alternate["']/i.test(tag)) continue;
    const hreflang = tag.match(/\bhreflang=["']([^"']+)["']/i)?.[1];
    const href = tag.match(/\bhref=["']([^"']+)["']/i)?.[1];
    if (hreflang && href) languages[hreflang] = href.replaceAll("&amp;", "&");
  }
  return languages;
}

function assertJsonLdIsSyntactic(html: string, pageUrl: string) {
  let count = 0;
  for (const match of html.matchAll(
    /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    count += 1;
    assert.doesNotThrow(
      () => JSON.parse(match[1]),
      `Malformed JSON-LD on ${pageUrl}`,
    );
  }
  return count;
}

async function fetchWithoutRedirect(baseUrl: string, pathname: string) {
  return fetch(`${baseUrl}${pathname}`, {
    headers: { "user-agent": "WitnessOps remediation verifier/1.0" },
    redirect: "manual",
  });
}

async function verifySitemapEntry(
  baseUrl: string,
  entry: SitemapEntry,
  sitemapEntries: Map<string, SitemapEntry>,
) {
  const publicUrl = new URL(entry.url);
  assert.equal(publicUrl.origin, canonicalOrigin, `Non-apex sitemap URL: ${entry.url}`);
  assert.equal(publicUrl.search, "", `Query string in sitemap URL: ${entry.url}`);
  assert.equal(publicUrl.hash, "", `Fragment in sitemap URL: ${entry.url}`);

  const response = await fetchWithoutRedirect(
    baseUrl,
    `${publicUrl.pathname}${publicUrl.search}`,
  );
  assert.equal(response.status, 200, `${entry.url} returned ${response.status}`);
  const html = await response.text();

  const lang = htmlAttribute(html, /<html\b[^>]*>/i, "lang");
  const expectedLang = publicUrl.pathname === "/pl" || publicUrl.pathname.startsWith("/pl/")
    ? "pl"
    : "en";
  assert.equal(lang, expectedLang, `${entry.url} emitted lang=${String(lang)}`);

  const canonical = htmlAttribute(
    html,
    /<link\b(?=[^>]*\brel=["']canonical["'])[^>]*>/i,
    "href",
  );
  assert.equal(canonical, entry.url, `${entry.url} emitted canonical=${String(canonical)}`);

  const robotsTags = [...html.matchAll(/<meta\b[^>]*>/gi)]
    .map((match) => match[0])
    .filter((tag) => /\bname=["']robots["']/i.test(tag));
  for (const tag of robotsTags) {
    const content = tag.match(/\bcontent=["']([^"']+)["']/i)?.[1] ?? "";
    assert.doesNotMatch(content, /(?:^|,)\s*noindex\b/i, `${entry.url} is noindex`);
  }

  const htmlLanguages = htmlAlternates(html);
  assert.deepEqual(
    htmlLanguages,
    entry.languages,
    `${entry.url} HTML and sitemap alternates differ`,
  );

  for (const [language, target] of Object.entries(entry.languages)) {
    assert.equal(new URL(target).origin, canonicalOrigin, `${entry.url} has non-apex ${language}`);
    if (language === "x-default") {
      assert.equal(target, entry.languages.en, `${entry.url} has an indefensible x-default`);
      continue;
    }
    const reciprocal = sitemapEntries.get(target);
    assert.ok(reciprocal, `${entry.url} alternate ${target} is absent from sitemap`);
    assert.deepEqual(
      reciprocal.languages,
      entry.languages,
      `${entry.url} alternate ${target} is not reciprocal`,
    );
  }

  return {
    language: lang,
    jsonLdBlocks: assertJsonLdIsSyntactic(html, entry.url),
  };
}

async function verifyRouteOutcomes(baseUrl: string) {
  const redirects = [
    ["/catalog/offsec", "/catalog"],
    ["/access-change-proof-run", "/catalog/workflows"],
    ["/catalog/workflow-s", "/catalog/workflows"],
    ["/catalog/workflow-m", "/catalog/workflows"],
    ["/catalog/workflow-l", "/catalog/workflows"],
    ["/catalog/workflow-rerun", "/catalog/workflows"],
  ] as const;
  for (const [source, destination] of redirects) {
    const response = await fetchWithoutRedirect(baseUrl, `${source}?audit=1`);
    assert.equal(response.status, 308, `${source} returned ${response.status}`);
    assert.equal(
      response.headers.get("location"),
      `${destination}?audit=1`,
      `${source} did not preserve the query string`,
    );
  }

  const operatorPreview = await fetchWithoutRedirect(baseUrl, "/catalog/operator-platform");
  assert.equal(operatorPreview.status, 200);
  assert.match(await operatorPreview.text(), /content="noindex, nofollow"/i);

  for (const route of [
    "/catalog/saas-demo",
    "/catalog/saas-operator",
    "/catalog/saas-team",
    "/catalog/saas-fleet",
    "/catalog/addon-seats-10",
    "/catalog/addon-goal0-reader",
    "/catalog/offsec-pilot",
    "/pl/catalog/offsec-pilot",
    "/catalog/offsec-retainer",
    "/catalog/offsec-proof-infra",
    "/catalog/offsec-training-vm-lab",
    "/catalog/sbom-min-elements",
  ]) {
    const response = await fetchWithoutRedirect(baseUrl, route);
    assert.equal(response.status, 404, `${route} returned ${response.status}`);
  }
}

async function main() {
  const baseUrl = normalizeBaseUrl(process.argv[2] ?? defaultBaseUrl);
  const sitemapResponse = await fetchWithoutRedirect(baseUrl, "/sitemap.xml");
  assert.equal(sitemapResponse.status, 200, "Sitemap must return 200");
  const entries = parseSitemap(await sitemapResponse.text());
  assert.ok(entries.length > 0, "Sitemap must contain URLs");
  const entryMap = new Map(entries.map((entry) => [entry.url, entry]));
  assert.equal(entryMap.size, entries.length, "Sitemap must not contain duplicate URLs");

  const results = [];
  for (let index = 0; index < entries.length; index += 8) {
    results.push(
      ...(await Promise.all(
        entries
          .slice(index, index + 8)
          .map((entry) => verifySitemapEntry(baseUrl, entry, entryMap)),
      )),
    );
  }
  await verifyRouteOutcomes(baseUrl);

  const polishCount = results.filter(({ language }) => language === "pl").length;
  const jsonLdBlocks = results.reduce((total, result) => total + result.jsonLdBlocks, 0);
  console.log(
    JSON.stringify(
      {
        baseUrl,
        sitemapUrls: entries.length,
        englishUrls: entries.length - polishCount,
        polishUrls: polishCount,
        hreflangUrls: entries.filter((entry) => Object.keys(entry.languages).length > 0).length,
        jsonLdBlocks,
        staleRouteOutcomes: "passed",
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
