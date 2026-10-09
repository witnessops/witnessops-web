import { expect, test } from "@playwright/test";

const offers = [
  {
    path: "/catalog/workflows",
    service: "agent-tools-access-review",
    name: "AI Agent Tools & Access Review",
    price: "Starting at €2,500 · excluding VAT",
    timing: "Target: 10 working days after accepted scope, authority, payment, handling and required inputs are confirmed",
    request: "/review/request",
  },
  {
    path: "/catalog/offsec-local-audit",
    service: "one-server-security-check",
    name: "One Server Security Check",
    price: "€950 standard · excluding VAT",
    timing: "Within two business days after the authorised collection window",
    request: "/review/request",
  },
  {
    path: "/catalog/offsec-launch-ready",
    service: "launch-readiness-check",
    name: "Launch Readiness Check",
    price: "€2,500–€7,500 · excluding VAT",
    timing: "Four business days after candidate collection",
    request: "/review/request",
  },
  {
    path: "/catalog/offsec-external-exposure",
    service: "external-exposure-assessment",
    name: "External Attack Surface Review",
    price: "€1,900 · excluding VAT",
    timing: "Delivery timing per signed SOW",
    request: "/review/request",
  },
  {
    path: "/catalog/offsec-custody-ops",
    service: "key-access-custody-review",
    name: "Key, Access and Custody Review",
    price: "€3,000–€15,000 · excluding VAT",
    timing: "Confirmed during the non-secret fit check",
    request: "/review/request",
  },
  {
    path: "/catalog/offsec-incident-ready",
    service: "incident-readiness-review",
    name: "Incident Readiness Review",
    price: "€5,000–€25,000 · excluding VAT",
    timing: "Confirmed during the non-secret fit check",
    request: "/review/request",
  },
  {
    path: "/pl/catalog/offsec-local-audit",
    service: "one-server-security-check",
    name: "One Server Security Check",
    price: "Standardowo 4 100 zł (ok. €950) · bez VAT",
    timing: "W ciągu dwóch dni roboczych po autoryzowanym oknie zbierania danych",
    request: "/pl/review/request",
  },
  {
    path: "/pl/catalog/offsec-launch-ready",
    service: "launch-readiness-check",
    name: "Launch Readiness Check",
    price: "11 000–32 000 zł (ok. €2 500–€7 500) · bez VAT",
    timing: "Cztery dni robocze po zebraniu kandydata do wydania",
    request: "/pl/review/request",
  },
  {
    path: "/pl/catalog/offsec-external-exposure",
    service: "external-exposure-assessment",
    name: "External Attack Surface Review",
    price: "€1 900 · bez VAT",
    timing: "Termin realizacji według podpisanego SOW",
    request: "/pl/review/request",
  },
  {
    path: "/pl/catalog/offsec-custody-ops",
    service: "key-access-custody-review",
    name: "Key, Access and Custody Review",
    price: "13 000–65 000 zł (ok. €3 000–€15 000) · bez VAT",
    timing: "Potwierdzany podczas wstępnej oceny bez informacji poufnych",
    request: "/pl/review/request",
  },
  {
    path: "/pl/catalog/offsec-incident-ready",
    service: "incident-readiness-review",
    name: "Incident Readiness Review",
    price: "22 000–108 000 zł (ok. €5 000–€25 000) · bez VAT",
    timing: "Potwierdzany podczas wstępnej oceny bez informacji poufnych",
    request: "/pl/review/request",
  },
  {
    path: "/catalog/professional-public-footprint-audit",
    service: "professional-public-footprint-audit",
    name: "Professional Public Footprint Audit",
    price: "€4,900 · excluding VAT",
    timing: "7–10 working days",
    request: "/review/request",
  },
  {
    path: "/pl/catalog/professional-public-footprint-audit",
    service: "professional-public-footprint-audit",
    name: "Audyt publicznego śladu zawodowego",
    price: "4 900 EUR · bez VAT",
    timing: "7–10 dni roboczych",
    request: "/pl/review/request",
  },
] as const;

const viewports = [
  { name: "desktop", width: 1440, height: 1100 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 390, height: 844 },
] as const;

test("reachable offer details use the canonical buyer contract and visual system", async ({ browser }) => {
  test.setTimeout(180_000);

  for (const offer of offers) {
    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport, reducedMotion: "reduce" });
      const page = await context.newPage();
      const consoleErrors: string[] = [];
      const pageErrors: string[] = [];
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });
      page.on("pageerror", (error) => pageErrors.push(error.message));

      const response = await page.goto(offer.path, { waitUntil: "networkidle" });
      expect(response?.status(), `${offer.path} ${viewport.name}`).toBe(200);
      const main = page.locator(`[data-buyer-service-detail="${offer.service}"]`);
      await expect(main).toBeVisible();
      await expect(main).toContainText(offer.name);
      await expect(main.locator("h1")).toBeVisible();
      await expect(main).toHaveAttribute("data-price-contract", /.+/);
      if (offer.service === "agent-tools-access-review") {
        await expect(main.locator('[data-promoted-commercial-contract="agent-tools-access-review"]')).toBeInViewport();
      }
      await main.locator("summary").filter({ hasText: offer.path.startsWith("/pl") ? "Jak przebiega współpraca" : "How the engagement works" }).click();
      const numberedSteps = main.locator("ol").first();
      await expect(numberedSteps).toHaveCSS("list-style-type", "none");
      const firstStep = (await numberedSteps.locator("li").first().innerText()).trim();
      expect(firstStep).toMatch(/^1\.\s+\S/);
      expect(firstStep).not.toMatch(/^1\.\s+1\./);
      await expect(main.locator('[data-one-pager], a[href$=".pdf"]')).toHaveCount(0);
      if (offer.service === "external-exposure-assessment") {
        await expect(main).toContainText(
          offer.path.startsWith("/pl") ? "€1 900 · bez VAT" : "€1,900 · excluding VAT",
        );
        const sampleLink = main.locator(
          'a[href="/review/sample-cases/external-exposure-assessment"]',
        );
        await expect(sampleLink).toHaveCount(1);
        await expect(sampleLink).toContainText(
          offer.path.startsWith("/pl")
            ? "Zobacz przykładowy przegląd (EN)"
            : "See a sample review",
        );
        await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
          "content",
          /External Attack Surface Review \| WitnessOps/,
        );
        await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute(
          "href",
          /\/catalog\/offsec-external-exposure$/,
        );
        await expect(page.locator('link[rel="alternate"][hreflang="pl"]')).toHaveAttribute(
          "href",
          /\/pl\/catalog\/offsec-external-exposure$/,
        );
      }
      if (offer.service === "agent-tools-access-review") {
        const promotedContract = main.locator(
          '[data-promoted-commercial-contract="agent-tools-access-review"]',
        );
        await expect(promotedContract).toBeVisible();
        await expect(promotedContract).toContainText("Starting at €2,500 · excluding VAT");
        await expect(promotedContract).toContainText(
          "Target: 10 working days after accepted scope, authority, payment, handling and required inputs are confirmed",
        );
        await expect(main).toContainText("One agreed device and OS, one dated system-level inventory, one named agent setup, one selected connection and one consequential action");
        await expect(main).toContainText("This review is not offered for new engagements.");
        await expect(main).not.toContainText("Start with a short description. We confirm fit and scope before work begins.");
        await expect(main).toContainText(
          "Target: 10 working days after accepted scope, authority, payment, handling and required inputs are confirmed",
        );
        await expect(main).toContainText("One action path: approval, executing identity, effective downstream permissions and available execution evidence.");
        await expect(main).not.toContainText("Agent Risk & Control Review");
        await expect(main).not.toContainText("From €1,500");
        await expect(main).not.toContainText(
          "Request an AI Agent Action Proof Run",
        );
      }
      await expect(main).toContainText(offer.timing);
      await expect(main).toContainText(offer.price);
      await expect(main.locator("h1")).not.toContainText(/OFFSEC-|Proof packages/i);

      if (offer.service === "professional-public-footprint-audit") {
        await expect(
          main.locator('[data-service-availability="available_by_request"]'),
        ).toHaveCount(0);
        await expect(main.locator(`a[href^="${offer.request}"]`)).toHaveCount(0);
        await expect(main).toContainText(
          offer.path.startsWith("/pl")
            ? "Jedna osoba, która wyraziła zgodę"
            : "One consenting professional",
        );
        await expect(main).toContainText(
          offer.path.startsWith("/pl") ? "Ciągły monitoring" : "Ongoing monitoring",
        );
        await expect(main).toContainText(
          offer.path.startsWith("/pl") ? "Porady prawne" : "Legal advice",
        );
        await expect(
          main.locator('a[href*="buy.stripe.com"], a[href*="checkout.stripe.com"]'),
        ).toHaveCount(0);
      }

      const metrics = await main.evaluate((element) => ({
        background: getComputedStyle(element).backgroundColor,
        color: getComputedStyle(element).color,
        tokens: {
          background: getComputedStyle(element)
            .getPropertyValue("--color-surface-bg")
            .trim()
            .toLowerCase(),
          primary: getComputedStyle(element)
            .getPropertyValue("--color-text-primary")
            .trim()
            .toLowerCase(),
          accent: getComputedStyle(element)
            .getPropertyValue("--color-brand-accent")
            .trim()
            .toLowerCase(),
          inverse: getComputedStyle(element)
            .getPropertyValue("--color-text-inverse")
            .trim()
            .toLowerCase(),
        },
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      }));
      expect(metrics.background).toBe("rgb(11, 12, 11)");
      expect(metrics.color).toBe("rgb(245, 241, 232)");
      expect(metrics.tokens).toEqual({
        background: "#0b0c0b",
        primary: "#f5f1e8",
        accent: "#b89b62",
        inverse: "#151510",
      });
      expect(metrics.overflow).toBeLessThanOrEqual(1);

      if (offer.service === "external-exposure-assessment") {
        const requestLinks = main.locator(`a[href^="${offer.request}"]`);
        expect(await requestLinks.count()).toBeGreaterThanOrEqual(2);
        await expect(requestLinks.first()).toHaveCSS(
          "background-color",
          "rgb(245, 241, 232)",
        );
        await expect(requestLinks.first()).toHaveCSS("color", "rgb(21, 21, 16)");
        for (let index = 0; index < 2; index += 1) {
          const link = requestLinks.nth(index);
          const href = await link.getAttribute("href");
          expect(href).toMatch(new RegExp(`^${offer.request}`));
          expect(new URL(href ?? "", "http://witnessops.test").searchParams.get("productId")).toBe(
            "OFFSEC-EXTERNAL-EXPOSURE",
          );
          expect((await link.boundingBox())?.height).toBeGreaterThanOrEqual(44);
        }
      } else {
        await expect(main.locator(`a[href^="${offer.request}"]`)).toHaveCount(0);
        await expect(main.locator(`[data-legacy-offer-withdrawal="${offer.service}"]`).first()).toBeVisible();
        await expect(main.locator('a[href*="agent-action-security-review"]')).toHaveCount(0);
        await expect(main.locator('a[href*="OFFSEC-EXTERNAL-EXPOSURE"]')).toHaveCount(0);
        await expect(main.locator('a[href*="/catalog/offsec-external-exposure"]')).toHaveCount(0);
        await expect(page).toHaveURL(new RegExp(`${offer.path.replaceAll("/", "\\/")}$`));
      }

      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
      await context.close();
    }
  }
});

test("Customer Security Review Sprint keeps the web-first path and clean numbering", async ({ page }) => {
  for (const scenario of [
    {
      path: "/customer-security-review",
      price: "From €1,600 · excluding VAT",
      firstStep: "1. Fit check",
    },
    {
      path: "/pl/customer-security-review",
      price: "Od 7 000 zł (ok. €1 600) · bez VAT",
    },
  ] as const) {
    const response = await page.goto(scenario.path, { waitUntil: "networkidle" });
    expect(response?.status()).toBe(200);
    const main = page.locator("main");
    await expect(main).toContainText(scenario.price);
    await expect(main.locator('[data-one-pager], a[href$=".pdf"]')).toHaveCount(0);

    if ("firstStep" in scenario) {
      const steps = main.locator("ol").first();
      await expect(steps).toHaveCSS("list-style-type", "none");
      await expect(steps.locator("li").first()).toContainText(scenario.firstStep);
    }
  }
});

test("External Attack Surface Review synthetic sample is buyer-safe and responsive", async ({ browser }) => {
  const expectedFiles = [
    "README.md",
    "external-exposure-assessment.md",
    "exposure-map.json",
    "findings.json",
    "evidence-register.json",
    "handover-agenda.md",
    "focused-retest-result.md",
    "synthetic-rehearsal-checklist.md",
    "synthetic-timesheet.md",
    "CLAIM_BOUNDARY.md",
    "evidence-manifest.json",
    "verifier-result.json",
    "MANIFEST.sha256",
  ];

  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport, reducedMotion: "reduce" });
    const page = await context.newPage();
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));

    const response = await page.goto(
      "/review/sample-cases/external-exposure-assessment",
      { waitUntil: "networkidle" },
    );
    expect(response?.status()).toBe(200);
    const main = page.locator(
      '[data-page="external-exposure-assessment-sample"]',
    );
    await expect(main.locator("h1")).toHaveText("External Attack Surface Review");
    await expect(main).toContainText("This is not a penetration test");
    await expect(main).toContainText(
      "Synthetic worked example, not customer evidence.",
    );
    await expect(main).toContainText(
      "Neither result proves that observations are complete",
    );
    await expect(main).not.toContainText("assessment of WitnessOps");

    for (const file of expectedFiles) {
      await expect(
        main.locator(`a[href="/samples/offsec-external-exposure/${file}"]`),
      ).toHaveCount(1);
    }

    const fitLink = main.locator('a[href^="/review/request?"]').first();
    const fitHref = await fitLink.getAttribute("href");
    expect(
      new URL(fitHref ?? "", "http://witnessops.test").searchParams.get(
        "productId",
      ),
    ).toBe("OFFSEC-EXTERNAL-EXPOSURE");
    expect((await fitLink.boundingBox())?.height).toBeGreaterThanOrEqual(44);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
    await context.close();
  }
});

test("Polish custody detail stays on its historical URL without starting another review", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const response = await page.goto("/pl/catalog/offsec-custody-ops", { waitUntil: "networkidle" });
  expect(response?.status()).toBe(200);
  const main = page.locator('[data-buyer-service-detail="key-access-custody-review"]');
  await expect(main).toContainText("Key, Access and Custody Review");
  await expect(main).toContainText("13 000–65 000 zł (ok. €3 000–€15 000) · bez VAT");
  await expect(main).toContainText("Potwierdzany podczas wstępnej oceny bez informacji poufnych");
  await expect(main).toContainText("Ten przegląd nie jest oferowany dla nowych zleceń.");
  await expect(main).not.toContainText("Custody / Wallet-Ops Review");
  await expect(main.locator('a[href*="/review/request"]')).toHaveCount(0);
  await expect(main.locator('a[href*="agent-action-security-review"]')).toHaveCount(0);
  await expect(main.locator('a[href*="OFFSEC-EXTERNAL-EXPOSURE"]')).toHaveCount(0);
  await expect(page).toHaveURL(/\/pl\/catalog\/offsec-custody-ops$/);
});
