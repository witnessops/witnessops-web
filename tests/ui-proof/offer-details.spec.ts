import { expect, test } from "@playwright/test";

const offers = [
  {
    path: "/catalog/workflows",
    service: "bounded-workflow-review",
    name: "Bounded Workflow Review",
    price: "From €1,500",
    timing: "Confirmed during the non-secret fit check",
    request: "/review/request",
  },
  {
    path: "/catalog/offsec-local-audit",
    service: "one-server-security-check",
    name: "One Server Security Check",
    price: "€950 standard after a non-secret fit check",
    timing: "Within two business days after the authorised collection window",
    request: "/review/request",
  },
  {
    path: "/catalog/offsec-launch-ready",
    service: "launch-readiness-check",
    name: "Launch Readiness Check",
    price: "€2,500–€7,500",
    timing: "Four business days after candidate collection",
    request: "/review/request",
  },
  {
    path: "/catalog/offsec-external-exposure",
    service: "external-exposure-assessment",
    name: "External Exposure Assessment",
    price: "€1,900 ex VAT — first three accepted engagements",
    timing: "5–7 business days after authority, scope, inputs, and the check window are confirmed",
    request: "/review/request",
  },
  {
    path: "/catalog/offsec-custody-ops",
    service: "key-access-custody-review",
    name: "Key, Access and Custody Review",
    price: "€3,000–€15,000",
    timing: "Confirmed during the non-secret fit check",
    request: "/review/request",
  },
  {
    path: "/catalog/offsec-incident-ready",
    service: "incident-readiness-review",
    name: "Incident Readiness Review",
    price: "€5,000–€25,000",
    timing: "Confirmed during the non-secret fit check",
    request: "/review/request",
  },
  {
    path: "/pl/catalog/offsec-local-audit",
    service: "one-server-security-check",
    name: "One Server Security Check",
    price: "Standardowo 4 100 zł po wstępnej ocenie bez informacji poufnych (ok. €950)",
    timing: "W ciągu dwóch dni roboczych po autoryzowanym oknie zbierania danych",
    request: "/pl/review/request",
  },
  {
    path: "/pl/catalog/offsec-launch-ready",
    service: "launch-readiness-check",
    name: "Launch Readiness Check",
    price: "11 000–32 000 zł (ok. €2 500–€7 500)",
    timing: "Cztery dni robocze po zebraniu kandydata do wydania",
    request: "/pl/review/request",
  },
  {
    path: "/pl/catalog/offsec-external-exposure",
    service: "external-exposure-assessment",
    name: "External Exposure Assessment",
    price: "€1 900 bez VAT — pierwsze trzy zaakceptowane zlecenia",
    timing: "5–7 dni roboczych po potwierdzeniu upoważnienia, zakresu, materiałów wejściowych i okna kontroli",
    request: "/pl/review/request",
  },
  {
    path: "/pl/catalog/offsec-custody-ops",
    service: "key-access-custody-review",
    name: "Key, Access and Custody Review",
    price: "13 000–65 000 zł (ok. €3 000–€15 000)",
    timing: "Potwierdzany podczas wstępnej oceny bez informacji poufnych",
    request: "/pl/review/request",
  },
  {
    path: "/pl/catalog/offsec-incident-ready",
    service: "incident-readiness-review",
    name: "Incident Readiness Review",
    price: "22 000–108 000 zł (ok. €5 000–€25 000)",
    timing: "Potwierdzany podczas wstępnej oceny bez informacji poufnych",
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
      if (offer.service === "external-exposure-assessment") {
        await expect(main).toContainText(
          offer.path.startsWith("/pl") ? "€1 900 bez VAT" : "€1,900 ex VAT",
        );
      }
      await expect(main).toContainText(offer.timing);
      await expect(main.locator("h1")).not.toContainText(/OFFSEC-|Proof packages/i);

      const metrics = await main.evaluate((element) => ({
        background: getComputedStyle(element).backgroundColor,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      }));
      expect(metrics.background).toBe("rgb(255, 255, 255)");
      expect(metrics.overflow).toBeLessThanOrEqual(1);

      const requestLinks = main.locator(`a[href^="${offer.request}"]`);
      expect(await requestLinks.count()).toBeGreaterThanOrEqual(2);
      for (let index = 0; index < 2; index += 1) {
        const link = requestLinks.nth(index);
        const href = await link.getAttribute("href");
        expect(href).toMatch(new RegExp(`^${offer.request}`));
        if (offer.path.startsWith("/pl")) {
          expect(new URL(href ?? "", "http://witnessops.test").searchParams.get("offer")).toBe(
            offer.name,
          );
        }
        if (offer.service === "external-exposure-assessment") {
          expect(new URL(href ?? "", "http://witnessops.test").searchParams.get("productId")).toBe(
            "OFFSEC-EXTERNAL-EXPOSURE",
          );
        }
        expect((await link.boundingBox())?.height).toBeGreaterThanOrEqual(44);
      }

      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
      await context.close();
    }
  }
});

test("Polish offer handoff keeps the canonical contract on the request page", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/pl/catalog/offsec-custody-ops", { waitUntil: "networkidle" });
  await page.locator('a[href^="/pl/review/request?"]').first().click();
  await expect(page).toHaveURL(/\/pl\/review\/request\?/);
  const selectedOffer = page.getByText(/Wybrana oferta:/).locator("..");
  await expect(selectedOffer).toContainText("Key, Access and Custody Review");
  await expect(selectedOffer).toContainText("€3 000–€15 000");
  await expect(selectedOffer).toContainText(
    "Potwierdzany podczas wstępnej oceny bez informacji poufnych",
  );
  await expect(selectedOffer).not.toContainText("Custody / Wallet-Ops Review");
});
