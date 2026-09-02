import { expect, test } from "@playwright/test";

const scenarios = [
  { path: "/review/request", locale: "en", width: 1440, height: 1100 },
  { path: "/review/request", locale: "en", width: 768, height: 1024 },
  { path: "/review/request", locale: "en", width: 390, height: 844 },
  { path: "/review/request", locale: "en", width: 320, height: 740 },
  { path: "/pl/review/request", locale: "pl", width: 1440, height: 1100 },
  { path: "/pl/review/request", locale: "pl", width: 768, height: 1024 },
  { path: "/pl/review/request", locale: "pl", width: 390, height: 844 },
  { path: "/pl/review/request", locale: "pl", width: 320, height: 740 },
] as const;

const requiredFields = [
  "name",
  "email",
  "workflow",
  "agentPath",
  "approvalBoundary",
  "evidenceAvailable",
] as const;

test("review request routes remain responsive, accessible, and usable", async ({ browser }) => {
  for (const scenario of scenarios) {
    const context = await browser.newContext({
      viewport: { width: scenario.width, height: scenario.height },
    });
    const page = await context.newPage();
    let submittedPayload: Record<string, unknown> | null = null;
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.route("**/api/review/request", async (route) => {
      submittedPayload = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          issuanceId: "iss_ui_proof",
          email: "buyer@example.com",
          expiresAt: "2026-07-14T22:00:00.000Z",
        }),
      });
    });

    const response = await page.goto(scenario.path, { waitUntil: "networkidle" });
    expect(response?.status(), `${scenario.path} should return 200`).toBe(200);
    await expect(page.locator("main h1")).toBeVisible();
    await expect(page.getByRole("button", { name: "Open Ask WitnessOps" })).toHaveCount(0);

    const viewport = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(viewport.scrollWidth, `${scenario.path} should not overflow`).toBeLessThanOrEqual(
      viewport.clientWidth + 1,
    );

    const form = page.locator("main form");
    await expect(form).toBeVisible();
    await expect(form).toHaveAttribute("method", "post");
    await expect(form).toHaveAttribute("action", "/api/review/request");
    const formBox = await form.boundingBox();
    if (scenario.width === 390) {
      expect(formBox?.width, `${scenario.path} mobile form width`).toBeGreaterThanOrEqual(320);
    }

    const controlOrder = await form
      .locator("input:not([type=hidden]), textarea, button[type=submit]")
      .evaluateAll((controls) =>
        controls.map((control) => control.getAttribute("name") || control.id || control.tagName.toLowerCase()),
      );
    expect(controlOrder).toEqual([
      "name",
      "email",
      "org",
      "workflow",
      "agentPath",
      "approvalBoundary",
      "evidenceAvailable",
      "button",
    ]);

    await expect(form.locator("#org")).not.toHaveAttribute("required", "");
    for (const fieldName of requiredFields) {
      const field = form.locator(`#${fieldName}`);
      await expect(field).toHaveAttribute("required", "");
      const labelText = await form.locator(`label[for=${fieldName}]`).textContent();
      expect(labelText?.toLowerCase()).toContain(scenario.locale === "pl" ? "wymagane" : "required");
    }

    const firstField = form.locator("#name");
    await firstField.focus();
    await expect(firstField).toBeFocused();
    const invalidFieldPosition = await firstField.evaluate((element) => {
      const fieldBox = element.getBoundingClientRect();
      const navBox = document.querySelector("nav")?.getBoundingClientRect();
      return { fieldTop: fieldBox.top, navBottom: navBox?.bottom ?? 0 };
    });
    expect(invalidFieldPosition.fieldTop).toBeGreaterThanOrEqual(
      invalidFieldPosition.navBottom + 8,
    );
    const focusIndicator = await firstField.evaluate((element) => {
      const style = window.getComputedStyle(element);
      return style.outlineStyle !== "none" || style.boxShadow !== "none";
    });
    expect(focusIndicator, `${scenario.path} field focus indicator`).toBe(true);

    const submit = form.locator('button[type="submit"]');
    const submitBox = await submit.boundingBox();
    expect(submitBox?.height, `${scenario.path} submit target height`).toBeGreaterThanOrEqual(44);
    if (scenario.width <= 390) {
      const textareaBox = await form.locator("#workflow").boundingBox();
      expect(textareaBox?.height, `${scenario.path} mobile textarea height`).toBeGreaterThanOrEqual(128);
    }

    if (scenario.locale === "pl") {
      const contactHandoff = page.locator("main [data-public-contact-route]");
      await expect(contactHandoff).toContainText("Agent Workflow Reconstruction");
      await expect(contactHandoff).toContainText("Główny płatny punkt wejścia");
      await expect(contactHandoff.locator("a").first()).toHaveAttribute(
        "href",
        /\/pl\/review\/request\?offerId=bounded-workflow-review/,
      );
      await expect(contactHandoff).toContainText("engage@mail.witnessops.com");
    }

    await submit.click();
    await expect(form.locator("[aria-invalid=true]")).toHaveCount(requiredFields.length);
    for (const fieldName of requiredFields) {
      const field = form.locator(`#${fieldName}`);
      const errorId = `${fieldName}-error`;
      await expect(field).toHaveAttribute("aria-errormessage", errorId);
      const describedBy = await field.getAttribute("aria-describedby");
      expect(describedBy?.split(/\s+/)).toContain(errorId);
      await expect(form.locator(`#${errorId}[role=alert]`)).toContainText(/\S/);
    }
    await expect(firstField).toBeFocused();

    await form.locator("#name").fill("Buyer Name");
    await form.locator("#email").fill("buyer@example.com");
    await form.locator("#workflow").fill("One bounded technical action");
    await form.locator("#agentPath").fill("Issue to reviewed patch");
    await form.locator("#approvalBoundary").fill("Approved action with a named stopping point");
    await form.locator("#evidenceAvailable").fill("Ticket and commit record types only");
    await submit.click();

    expect(Object.keys(submittedPayload ?? {}).sort()).toEqual([
      "email",
      "intent",
      "locale",
      "name",
      "org",
      "scope",
    ]);
    expect(submittedPayload?.intent).toBe("review");
    expect(submittedPayload?.locale).toBe(scenario.locale);
    expect(submittedPayload?.scope).toContain(`Request locale: ${scenario.locale}`);
    expect(submittedPayload?.scope).toContain("First-message boundary: no files, secrets");

    const verificationHeading = scenario.locale === "pl"
      ? "Wpisz kod z wiadomości e-mail"
      : "Enter your email code";
    const verificationTitle = page.getByRole("heading", { name: verificationHeading });
    await expect(verificationTitle).toBeVisible();
    await expect(page.locator("main form")).toHaveAttribute("method", "post");
    await expect(page.locator("main form")).toHaveAttribute("action", "/api/verify-token");
    await expect(verificationTitle).toBeFocused();
    await expect(verificationTitle).toBeInViewport();
    const verificationPosition = await verificationTitle.evaluate((element) => {
      const headingBox = element.getBoundingClientRect();
      const navBox = document.querySelector("nav")?.getBoundingClientRect();
      return {
        headingTop: headingBox.top,
        headingBottom: headingBox.bottom,
        navBottom: navBox?.bottom ?? 0,
        viewportHeight: window.innerHeight,
      };
    });
    expect(verificationPosition.headingTop).toBeGreaterThanOrEqual(
      verificationPosition.navBottom + 8,
    );
    expect(verificationPosition.headingBottom).toBeLessThanOrEqual(
      verificationPosition.viewportHeight,
    );
    await expect(page.locator("#verification-code")).toBeInViewport();
    const confirmButton = page.locator('main form button[type="submit"]');
    await expect(confirmButton).toBeDisabled();
    const confirmationBox = await confirmButton.boundingBox();
    expect(confirmationBox?.height, `${scenario.path} confirmation target height`).toBeGreaterThanOrEqual(44);
    await page.locator('main form input[type="checkbox"]').check();
    await expect(confirmButton).toBeEnabled();

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
    await context.close();
  }
});

test("Agent Workflow Reconstruction starts with one compact non-secret workflow request", async ({ browser }) => {
  for (const scenario of [
    {
      locale: "en",
      path: "/review/request",
      fitTitle: "Start your Agent Workflow Reconstruction.",
      contractMarkers: [
        "Agent Workflow Reconstruction",
        "€2,500 fixed",
        "one named workflow (agentic or automated)",
        "Non-secret fit check first",
        "Within 10 working days after evidence rules are agreed",
      ],
    },
    {
      locale: "pl",
      path: "/pl/review/request",
      fitTitle: "Rozpocznij Agent Workflow Reconstruction.",
      contractMarkers: [
        "Agent Workflow Reconstruction",
        "€2 500 — cena stała",
        "jeden nazwany workflow",
        "bez sekretów",
        "W ciągu 10 dni roboczych po uzgodnieniu zasad dowodowych",
      ],
    },
  ] as const) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    let submittedPayload: Record<string, unknown> | null = null;

    await page.route("**/api/review/request", async (route) => {
      submittedPayload = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          issuanceId: `iss_workflow_reconstruction_${scenario.locale}`,
          email: "buyer@example.com",
          expiresAt: "2026-08-29T22:00:00.000Z",
        }),
      });
    });

    const query = new URLSearchParams({
      offerId: "bounded-workflow-review",
      offer: "Agent Workflow Reconstruction",
    });
    await page.goto(`${scenario.path}?${query.toString()}`, {
      waitUntil: "networkidle",
    });

    const form = page.locator("main form");
    await expect(form.getByText(scenario.fitTitle, { exact: true })).toBeVisible();
    for (const marker of scenario.contractMarkers) {
      await expect(page.locator("main")).toContainText(marker);
    }
    await expect(page.locator("main")).not.toContainText("Agent Risk & Control Review");
    await expect(page.locator("main")).not.toContainText("From €1,500");
    await expect(form.locator('input[name="intent"]')).toHaveValue(
      "bounded-workflow-review",
    );

    const controlOrder = await form
      .locator("input:not([type=hidden]), textarea, button[type=submit]")
      .evaluateAll((controls) =>
        controls.map(
          (control) =>
            control.getAttribute("name") || control.id || control.tagName.toLowerCase(),
        ),
      );
    expect(controlOrder).toEqual(["name", "email", "org", "workflow", "button"]);
    await expect(form.locator("#agentPath")).toHaveCount(0);
    await expect(form.locator("#approvalBoundary")).toHaveCount(0);
    await expect(form.locator("#evidenceAvailable")).toHaveCount(0);
    await expect(form.locator("#org")).not.toHaveAttribute("required", "");

    for (const fieldName of ["name", "email", "workflow"] as const) {
      await expect(form.locator(`#${fieldName}`)).toHaveAttribute("required", "");
    }

    const submit = form.locator('button[type="submit"]');
    await submit.click();
    await expect(form.locator("[aria-invalid=true]")).toHaveCount(3);
    await expect(form.locator("#name")).toBeFocused();

    await form.locator("#name").fill("Synthetic Buyer");
    await form.locator("#email").fill("buyer@example.com");
    await form
      .locator("#workflow")
      .fill("An agent prepares an API-key rotation after a named human approval.");
    await submit.click();

    expect(submittedPayload?.intent).toBe("bounded-workflow-review");
    expect(submittedPayload?.locale).toBe(scenario.locale);
    expect(submittedPayload?.scope).toContain("Request: Agent Workflow Reconstruction");
    expect(submittedPayload?.scope).toContain("Consequential workflow:");
    expect(submittedPayload?.scope).not.toContain("Situation and affected system:");
    expect(submittedPayload?.scope).not.toContain("Boundary and approval:");
    expect(submittedPayload?.scope).not.toContain("Evidence available:");

    await context.close();
  }
});

test("primary request selection canonicalizes aliases and conflicting query text", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();

  for (const query of [
    "offer=Agent+Workflow+Reconstruction",
    "offerId=bounded-workflow-review&offer=Public+Exposure+Review",
    "offerId=bounded-workflow-review&offer=Buyer-edited+title&productId=OFFSEC-EXTERNAL-EXPOSURE",
  ]) {
    const response = await page.goto(`/review/request?${query}`, {
      waitUntil: "networkidle",
    });
    expect(response?.status(), query).toBe(200);
    const main = page.locator("main");
    await expect(
      page.getByText("Selected offer: Agent Workflow Reconstruction"),
    ).toBeVisible();
    await expect(main).toContainText("€2,500 fixed");
    await expect(main).toContainText(
      "Within 10 working days after evidence rules are agreed",
    );
    await expect(main.locator('form input[name="intent"]')).toHaveValue(
      "bounded-workflow-review",
    );
    await expect(main).not.toContainText("Agent Risk & Control Review");
    await expect(main).not.toContainText("From €1,500");
    await expect(main).not.toContainText(
      "Request an AI Agent Action Proof Run",
    );
  }

  await expect(
    page
      .locator("main")
      .getByRole("link", { name: "engage@mail.witnessops.com" })
      .first(),
  ).toHaveAttribute(
    "href",
    "mailto:engage@mail.witnessops.com?subject=WitnessOps%20request%20%E2%80%94%20Agent%20Workflow%20Reconstruction",
  );

  await context.close();
});

test("Public Exposure Review request preserves SKU, locale, and fit boundary", async ({ browser }) => {
  for (const scenario of [
    { locale: "en", path: "/review/request" },
    { locale: "pl", path: "/pl/review/request" },
  ] as const) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    let submittedPayload: Record<string, unknown> | null = null;

    await page.route("**/api/review/request", async (route) => {
      submittedPayload = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          issuanceId: `iss_external_${scenario.locale}`,
          email: "buyer@example.com",
          expiresAt: "2026-08-06T22:00:00.000Z",
        }),
      });
    });

    const query = new URLSearchParams({
      productId: "OFFSEC-EXTERNAL-EXPOSURE",
      offer: "Public Exposure Review",
    });
    await page.goto(`${scenario.path}?${query.toString()}`, {
      waitUntil: "networkidle",
    });

    await expect(
      page.getByText(
        scenario.locale === "pl" ? /Wybrana oferta:/ : /Selected offer:/,
      ),
    ).toBeVisible();
    const form = page.locator("main form");
    await expect(form.locator('input[name="intent"]')).toHaveValue(
      "OFFSEC-EXTERNAL-EXPOSURE",
    );

    await form.locator("#name").fill("Synthetic Buyer");
    await form.locator("#email").fill("buyer@example.com");
    await form.locator("#workflow").fill("A bounded external exposure fit check");
    await form.locator("#agentPath").fill("One synthetic public application boundary");
    await form.locator("#approvalBoundary").fill("Authority will be confirmed before work");
    await form.locator("#evidenceAvailable").fill("Evidence types only; no files supplied");
    await form.locator('button[type="submit"]').click();

    expect(submittedPayload?.intent).toBe("OFFSEC-EXTERNAL-EXPOSURE");
    expect(submittedPayload?.locale).toBe(scenario.locale);
    expect(submittedPayload?.scope).toContain(
      "Selected product / intent: OFFSEC-EXTERNAL-EXPOSURE",
    );
    expect(submittedPayload?.scope).toContain(`Request locale: ${scenario.locale}`);
    expect(submittedPayload?.scope).toContain(
      "First-message boundary: no files, secrets",
    );

    await context.close();
  }
});

test("product query routes preserve exposure scope and unresolved pilot fallback", async ({ browser }) => {
  const routeScenarios = [
    {
      path: "/review/request?productId=OFFSEC-EXTERNAL-EXPOSURE",
      heading: "Start your Public Exposure Review",
      intent: "OFFSEC-EXTERNAL-EXPOSURE",
      selectedOffer: /Selected offer:/,
      boundary: "No work or target-facing check starts from this form.",
      authorizationBoundary: null,
    },
    {
      path: "/pl/review/request?productId=OFFSEC-EXTERNAL-EXPOSURE",
      heading: "Zgłoś: Public Exposure Review",
      intent: "OFFSEC-EXTERNAL-EXPOSURE",
      selectedOffer: /Wybrana oferta:/,
      boundary: "Samo zgłoszenie nie rozpoczyna pracy.",
      authorizationBoundary:
        "Formularz rozpoczyna akceptację zakresu; nie upoważnia do testów ani nie uruchamia trzydniowego terminu.",
    },
    {
      path: "/review/request?productId=OFFSEC-PILOT",
      heading: "Tell us what you need reviewed",
      intent: "review",
      selectedOffer: null,
      boundary: "No work or target-facing check starts from this form.",
      authorizationBoundary: null,
    },
    {
      path: "/pl/review/request?productId=OFFSEC-PILOT",
      heading: "Opowiedz, co wymaga sprawdzenia",
      intent: "review",
      selectedOffer: null,
      boundary: "Samo zgłoszenie nie rozpoczyna pracy.",
      authorizationBoundary: null,
    },
  ] as const;

  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 390, height: 844 },
  ]) {
    for (const scenario of routeScenarios) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      const consoleErrors: string[] = [];
      const pageErrors: string[] = [];
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });
      page.on("pageerror", (error) => pageErrors.push(error.message));

      const response = await page.goto(scenario.path, { waitUntil: "networkidle" });
      expect(response?.status(), scenario.path).toBe(200);
      await expect(page.locator("main h1")).toContainText(scenario.heading);

      const form = page.locator("main form");
      await expect(form).toBeVisible();
      await expect(form.locator('input[name="intent"]')).toHaveValue(
        scenario.intent,
      );
      await expect(page.locator("main")).toContainText(scenario.boundary);
      if (scenario.authorizationBoundary) {
        await expect(page.locator("main")).toContainText(
          scenario.authorizationBoundary,
        );
      }

      if (scenario.selectedOffer) {
        await expect(page.getByText(scenario.selectedOffer).first()).toBeVisible();
      } else {
        await expect(page.getByText(/Selected offer:|Wybrana oferta:/)).toHaveCount(0);
        await expect(form.locator("#agentPath")).toHaveCount(1);
      }

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, scenario.path).toBeLessThanOrEqual(1);
      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
      await context.close();
    }
  }
});

test("confirmation routes fail closed without a browser-held request record", async ({ browser }) => {
  const scenarios = [
    {
      path: "/review/request/confirmed",
      title: "This page alone proves nothing.",
      body: "No confirmed request record is present in this browser session.",
      restart: "/review/request",
    },
    {
      path: "/pl/review/request/confirmed",
      title: "Ta strona sama niczego nie dowodzi.",
      body: "W tej sesji przeglądarki nie ma potwierdzonego zapisu zgłoszenia.",
      restart: "/pl/review/request",
    },
  ] as const;

  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 390, height: 844 },
  ]) {
    for (const scenario of scenarios) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      const response = await page.goto(scenario.path, { waitUntil: "networkidle" });
      expect(response?.status(), scenario.path).toBe(200);

      const missing = page.locator(
        '[data-ui-proof-id="review-request-record-missing"]',
      );
      await expect(missing).toBeVisible();
      await expect(missing.locator("h1")).toHaveText(scenario.title);
      await expect(missing).toContainText(scenario.body);
      await expect(missing.locator("a")).toHaveAttribute("href", scenario.restart);
      await expect(
        page.locator('[data-ui-proof-id="review-request-confirmed"]'),
      ).toHaveCount(0);

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, scenario.path).toBeLessThanOrEqual(1);
      await context.close();
    }
  }
});

test("confirmation routes render a bounded browser-held request record", async ({ browser }) => {
  const scenarios = [
    {
      locale: "en",
      path: "/review/request/confirmed",
      title: "You have the boundary record.",
      status: "Mailbox confirmed",
      reviewStarted: "Review started",
      evidenceAccepted: "Customer evidence accepted",
      no: "No",
      boundary:
        "Do not send secrets or source materials until scope and evidence handling are agreed.",
    },
    {
      locale: "pl",
      path: "/pl/review/request/confirmed",
      title: "Masz zapis granicy zgłoszenia.",
      status: "Skrzynka potwierdzona",
      reviewStarted: "Przegląd rozpoczęty",
      evidenceAccepted: "Materiały klienta przyjęte",
      no: "Nie",
      boundary:
        "Nie wysyłaj sekretów ani materiałów źródłowych, dopóki nie uzgodnimy zakresu i sposobu ich obsługi.",
    },
  ] as const;

  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 390, height: 844 },
  ]) {
    for (const scenario of scenarios) {
      const context = await browser.newContext({ viewport });
      await context.addInitScript(
        ({ storageKey, record }) => {
          window.sessionStorage.setItem(storageKey, JSON.stringify(record));
        },
        {
          storageKey: "witnessops.review-request-confirmation.v1",
          record: {
            schema: "witnessops.review-request-confirmation.v1",
            requestReference: `req_ui_proof_${scenario.locale}`,
            confirmedAt: "2026-08-29T20:00:00.000Z",
            locale: scenario.locale,
            requestKind: "public-exposure-review",
            source: "request-form",
          },
        },
      );
      const page = await context.newPage();
      const response = await page.goto(scenario.path, { waitUntil: "networkidle" });
      expect(response?.status(), scenario.path).toBe(200);

      const confirmed = page.locator(
        '[data-ui-proof-id="review-request-confirmed"]',
      );
      await expect(confirmed).toBeVisible();
      await expect(confirmed.locator("h1")).toHaveText(scenario.title);
      await expect(confirmed).toContainText(scenario.status);
      await expect(confirmed).toContainText(scenario.boundary);
      await expect(confirmed).toContainText(
        scenario.locale === "pl"
          ? "Nie sformułowano żadnych wniosków dotyczących bezpieczeństwa, kwestii prawnych ani zgodności."
          : "No security, legal, or compliance conclusion has been made.",
      );

      const record = confirmed.locator(
        '[data-ui-proof-id="review-request-record"]',
      );
      await expect(record).toContainText(scenario.reviewStarted);
      await expect(record).toContainText(scenario.evidenceAccepted);
      const negativeFacts = await record.locator("dl dd").allTextContents();
      expect(negativeFacts.filter((value) => value.trim() === scenario.no)).toHaveLength(2);
      await expect(
        confirmed.locator(
          'a[href="/review/sample-cases/external-exposure-assessment"]',
        ),
      ).toHaveCount(1);
      await expect(
        page.locator('[data-ui-proof-id="review-request-record-missing"]'),
      ).toHaveCount(0);

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, scenario.path).toBeLessThanOrEqual(1);
      await context.close();
    }
  }
});
