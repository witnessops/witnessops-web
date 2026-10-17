import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import {
  PathnameContext,
  SearchParamsContext,
} from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import assert from "node:assert/strict";
import test from "node:test";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import CompanyPage, { metadata as enCompanyMetadata } from "@/app/company/page";
import PolishCompanyPage, {
  metadata as plCompanyMetadata,
} from "@/app/pl/company/page";
import PolishReviewRequestPage from "@/app/pl/review/request/page";
import ReviewRequestPage from "@/app/review/request/page";
import sitemap from "@/app/sitemap";
import { Footer } from "@/components/marketing/footer";
import {
  COMPANY_COPYRIGHT,
  COMPANY_DETAILS,
  COMPANY_DETAILS_HREF,
} from "@/lib/company-details";
import { loadHomeContent } from "@/lib/content";
import { canonicalUrl } from "@/lib/public-seo";

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

const FULL_BLOCK = [
  COMPANY_DETAILS.en.address,
  COMPANY_DETAILS.pl.address,
  COMPANY_DETAILS.en.krs,
  COMPANY_DETAILS.en.nip,
  COMPANY_DETAILS.en.regon,
  COMPANY_DETAILS.pl.legalName,
] as const;

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

function chromeBinary(): string | null {
  for (const candidate of ["google-chrome", "google-chrome-stable", "chromium"]) {
    try {
      execFileSync("which", [candidate], { stdio: "ignore" });
      return candidate;
    } catch {
      continue;
    }
  }
  return null;
}

test("company details render on the company and contact pages, and the footer keeps only the copyright line and link", async () => {
  const appRoot = resolve(__dirname, "../../..");
  const data = readFileSync(resolve(appRoot, "src/lib/company-details.ts"), "utf8");
  for (const line of [...EXACT.en, ...EXACT.pl]) {
    assert.ok(data.includes(line), `shared source missing: ${line}`);
  }
  assert.equal(COMPANY_COPYRIGHT, "© 2026 Witnessops P.S.A.");
  assert.equal(COMPANY_DETAILS.en.krs, COMPANY_DETAILS.pl.krs);

  for (const relative of [
    "src/components/marketing/footer.tsx",
    "src/components/marketing/company-details.tsx",
    "src/app/company/page.tsx",
    "src/app/pl/company/page.tsx",
    "src/app/review/request/page.tsx",
    "src/app/pl/review/request/page.tsx",
    "src/app/(marketing)/contact/page.tsx",
    "src/app/pl/contact/page.tsx",
    "src/components/marketing/legal-document-page.tsx",
    "src/app/privacy/page.tsx",
    "src/app/terms/page.tsx",
    "src/app/pl/privacy/page.tsx",
    "src/app/pl/terms/page.tsx",
    "src/app/media-kit/page.tsx",
    "src/app/pl/media-kit/page.tsx",
    "src/components/marketing/media-kit-content.tsx",
  ]) {
    const source = readFileSync(resolve(appRoot, relative), "utf8");
    assert.doesNotMatch(
      source,
      /Witnessops P\.S\.A\.|Witnessops prosta spółka akcyjna|54591401100000|8262233962|0001271405|Staszica/,
      `${relative} must use the shared company details source`,
    );
  }

  const component = readFileSync(
    resolve(appRoot, "src/components/marketing/company-details.tsx"),
    "utf8",
  );
  assert.match(component, /break-words/);
  assert.match(component, /min-w-0/);
  assert.match(component, /data-company-registry/);

  assert.deepEqual(enCompanyMetadata.robots, { index: false, follow: true });
  assert.deepEqual(plCompanyMetadata.robots, { index: false, follow: true });

  const urls = new Set((await sitemap()).map((entry) => entry.url));
  assert.equal(urls.has(canonicalUrl("/company")), false);
  assert.equal(urls.has(canonicalUrl("/pl/company")), false);

  const enFooter = renderFooter("/");
  const plFooter = renderFooter("/pl");
  for (const [html, locale] of [
    [enFooter, "en"],
    [plFooter, "pl"],
  ] as const) {
    assert.equal(html.includes(COMPANY_COPYRIGHT), true);
    assert.match(html, new RegExp(`data-company-details-link="${locale}"`));
    assert.match(html, new RegExp(`href="${COMPANY_DETAILS_HREF[locale]}"`));
    assert.ok(html.includes(`>${COMPANY_DETAILS[locale].heading}<`));
    assert.doesNotMatch(html, /data-company-details="(?:footer|page|contact)"/);
    assert.doesNotMatch(html, /data-company-registry/);
    for (const line of FULL_BLOCK) {
      assert.equal(html.includes(line), false, `footer must not include ${line}`);
    }
  }
  assert.match(enFooter, /engage@mail\.witnessops\.com/);
  assert.match(plFooter, /engage@mail\.witnessops\.com/);
  assert.doesNotMatch(enFooter, /© WitnessOps</);

  const pages = [
    { locale: "en" as const, node: CompanyPage() },
    { locale: "pl" as const, node: PolishCompanyPage() },
    {
      locale: "en" as const,
      node: await ReviewRequestPage({ searchParams: Promise.resolve({}) }),
    },
    {
      locale: "pl" as const,
      node: await PolishReviewRequestPage({ searchParams: Promise.resolve({}) }),
    },
    {
      locale: "en" as const,
      node: await ReviewRequestPage({
        searchParams: Promise.resolve({ offerId: "agent-action-security-review" }),
      }),
    },
    {
      locale: "pl" as const,
      node: await PolishReviewRequestPage({
        searchParams: Promise.resolve({ productId: "OFFSEC-EXTERNAL-EXPOSURE" }),
      }),
    },
  ];

  for (const pageCase of pages) {
    const html = render(
      pageCase.node,
      pageCase.locale === "pl" ? "/pl/company" : "/company",
    );
    assert.match(
      html,
      new RegExp(`data-company-details-locale="${pageCase.locale}"`),
    );
    assertLines(html, pageCase.locale);
  }

  const enCompany = render(CompanyPage(), "/company");
  const plCompany = render(PolishCompanyPage(), "/pl/company");
  assert.match(enCompany, /data-company-details="page"/);
  assert.match(plCompany, /data-company-details="page"/);
  const enContact = render(
    await ReviewRequestPage({ searchParams: Promise.resolve({}) }),
    "/review/request",
  );
  assert.match(enContact, /data-company-details="contact"/);
  assert.match(enContact, />engage@mail\.witnessops\.com</);

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
  assert.match(priced, /€2,500\u00A0excl.\u00A0VAT/);
  assert.match(external, /€1,900\u00A0excl.\u00A0VAT/);
});

test("the court line wraps without horizontal overflow at 390, 768 and 1440", (t) => {
  const chrome = chromeBinary();
  if (!chrome) {
    t.skip("Chrome is not available for the overflow measurement");
    return;
  }

  const registry = COMPANY_DETAILS.en.krs;
  const dir = mkdtempSync(join(tmpdir(), "company-overflow-"));
  const htmlPath = join(dir, "overflow.html");
  const frame = (scheme: string) => `<!doctype html><html><head><meta charset="utf-8"><style>
      :root { color-scheme: ${scheme}; }
      html, body { margin: 0; }
      main { box-sizing: border-box; width: 100%; max-width: 48rem; margin: 0 auto; padding: 24px; min-width: 0; }
      p { margin: 0 0 8px; max-width: 100%; min-width: 0; overflow-wrap: break-word; }
    </style></head><body>
      <main><p data-company-registry="">${registry}</p></main>
      <script>
        const root = document.documentElement;
        const line = document.querySelector("[data-company-registry]");
        parent.postMessage({
          overflow: root.scrollWidth > root.clientWidth || line.scrollWidth > line.clientWidth,
          scroll: root.scrollWidth,
          client: root.clientWidth,
          lineScroll: line.scrollWidth,
          lineClient: line.clientWidth,
        }, "*");
      </script>
    </body></html>`;
  const frames = [390, 768, 1440].flatMap((width) =>
    ["light", "dark"].map((scheme) => ({ width, scheme })),
  );
  writeFileSync(
    htmlPath,
    `<!doctype html><html><head><meta charset="utf-8"><style>
      html, body { margin: 0; }
      iframe { display: block; border: 0; height: 200px; }
    </style></head><body>
      ${frames
        .map(
          ({ width, scheme }) =>
            `<iframe data-frame="${width} ${scheme}" style="width:${width}px" srcdoc="${frame(scheme).replaceAll("&", "&amp;").replaceAll('"', "&quot;")}"></iframe>`,
        )
        .join("\n")}
      <pre id="result"></pre>
      <script>
        const results = {};
        const frames = Array.from(document.querySelectorAll("iframe"));
        addEventListener("message", (event) => {
          const source = frames.find((item) => item.contentWindow === event.source);
          if (!source) return;
          results[source.dataset.frame] = event.data;
          document.getElementById("result").textContent = JSON.stringify(results);
        });
      </script>
    </body></html>`,
  );

  // One launch measures every frame; concurrent headless launches starve each other on CI runners.
  const launched: ReturnType<typeof spawnSync> = spawnSync(
    chrome,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--no-first-run",
      `--user-data-dir=${join(dir, "profile")}`,
      "--window-size=1600,1600",
      "--virtual-time-budget=2000",
      "--dump-dom",
      htmlPath,
    ],
    { encoding: "utf8", timeout: 20_000 },
  );
  const dom = String(launched.stdout ?? "");
  const matched = dom.match(/<pre id="result">([\s\S]*?)<\/pre>/);
  assert.ok(matched, `missing overflow result status=${launched.status}`);
  const results = JSON.parse(matched[1].replaceAll("&quot;", '"').replaceAll("&amp;", "&")) as Record<string, { overflow: boolean; client: number }>;
  for (const { width, scheme } of frames) {
    const result = results[`${width} ${scheme}`];
    assert.ok(result, `missing overflow result at ${width} ${scheme}`);
    assert.equal(result.client, width, `frame ${width} ${scheme} did not lay out at its width`);
    assert.equal(
      result.overflow,
      false,
      `court line overflowed at ${width}px ${scheme}: ${JSON.stringify(result)}`,
    );
  }
});
