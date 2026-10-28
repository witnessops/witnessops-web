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
  "email",
  "workflow",
  "approvalBoundary",
  "decisionTiming",
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
    await expect(page.getByRole("button", { name: "Ask WitnessOps" })).toHaveCount(0);

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
      .locator("input:not([type=hidden]), select, textarea, button[type=submit]")
      .evaluateAll((controls) =>
        controls.map((control) => control.getAttribute("name") || control.id || control.tagName.toLowerCase()),
      );
    expect(controlOrder).toEqual(["email", "workflow", "approvalBoundary", "decisionTiming", "button"]);
    await expect(form.locator("#enquiryPath")).toHaveCount(0);
    await expect(form.locator('input[name="intent"]')).toHaveValue("agent-action-security-review");
    for (const fieldName of requiredFields) {
      const field = form.locator(`#${fieldName}`);
      await expect(field).toHaveAttribute("required", "");
      const labelText = await form.locator(`label[for=${fieldName}]`).textContent();
      if (scenario.locale === "pl") expect(labelText?.toLowerCase()).toContain("wymagane");
    }

    const firstField = form.locator("#email");
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

    await expect(page.locator("main")).toContainText("engage@mail.witnessops.com");
    const salesMail = page.locator('main a[href^="mailto:engage@mail.witnessops.com"]');
    await expect(salesMail.first()).toHaveText("engage@mail.witnessops.com");

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
    const errorSummary = form.locator('[role="alert"][tabindex="-1"]');
    await expect(errorSummary).toBeFocused();
    await errorSummary.locator('a[href="#email"]').click();
    await expect(firstField).toBeFocused();

    await form.locator("#email").fill("buyer@example.com");
    await form.locator("#workflow").fill("One bounded technical action");
    await form.locator("#approvalBoundary").fill("Billing system and the approval tool");
    await form.locator("#decisionTiming").fill("Launch decision next Friday");
    await submit.click();

    expect(Object.keys(submittedPayload ?? {}).sort()).toEqual([
      "email",
      "intent",
      "locale",
      "org",
      "scope",
    ]);
    expect(submittedPayload?.intent).toBe("agent-action-security-review");
    expect(submittedPayload?.locale).toBe(scenario.locale);
    expect(submittedPayload?.scope).toContain("Offer: agent-action-security-review");
    expect(submittedPayload?.scope).toContain("Consequential action: One bounded technical action");
    expect(submittedPayload?.scope).toContain("Systems involved: Billing system and the approval tool");
    expect(submittedPayload?.scope).toContain("Decision deadline: Launch decision next Friday");
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

test("historical one-action links do not select a new review", async ({ page }) => {
  for (const path of [
    "/review/request?offerId=bounded-workflow-review",
    "/pl/review/request?offerId=bounded-workflow-review",
  ]) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.locator("main h1")).toContainText(/does not start a new review|nie rozpoczyna nowego przeglądu/);
    await expect(page.locator("main")).toContainText(/keep their original terms|zachowują pierwotne warunki/);
    await expect(page.locator("main form")).toHaveCount(0);
    await expect(page.locator("main a[href*='offerId=agent-tools-access-review']")).toHaveCount(0);
    await expect(page.locator("main a[href*='offerId=agent-action-security-review']")).toBeVisible();
    await expect(page.locator("main a[href*='productId=OFFSEC-EXTERNAL-EXPOSURE']")).toHaveCount(0);
  }
});

test("the agent enquiry recovers from request and code errors and confirms through controlled doubles", async ({ browser }) => {
  for (const locale of ["en", "pl"] as const) {
    const context = await browser.newContext({ viewport: { width: 320, height: 740 } });
    const page = await context.newPage();
    const prefix = locale === "pl" ? "/pl" : "";
    let requests = 0;
    let verifications = 0;
    const submitted: Record<string, unknown>[] = [];
    await page.route("**/api/review/request", async (route) => {
      requests += 1;
      submitted.push(route.request().postDataJSON());
      await route.fulfill({
        status: requests === 1 ? 429 : 201,
        contentType: "application/json",
        body: JSON.stringify(requests === 1
          ? { error: "Please try again shortly." }
          : { issuanceId: "iss_synthetic_gate_one", email: "buyer@example.org", expiresAt: "2026-10-28T23:00:00.000Z" }),
      });
    });
    await page.route("**/api/verify-token", async (route) => {
      verifications += 1;
      expect(route.request().postDataJSON()).toEqual({
        issuanceId: "iss_synthetic_gate_one", email: "buyer@example.org", token: "ABCD-EFGH-JKLM",
      });
      await route.fulfill({
        status: verifications === 1 ? 400 : 200,
        contentType: "application/json",
        body: JSON.stringify(verifications === 1
          ? { error: "Invalid or expired code." }
          : {
              channel: "engage", intakeId: "int_synthetic_gate_one", issuanceId: "iss_synthetic_gate_one",
              threadId: null, email: "buyer@example.org", verifiedAt: "2026-10-28T20:00:00.000Z",
              status: "verified", admissionState: "admitted", assessmentRunId: null,
              assessmentStatus: "unavailable", postVerifyPath: `${prefix}/review/request/confirmed`,
            }),
      });
    });

    await page.goto(`${prefix}/contact`, { waitUntil: "networkidle" });
    const form = page.locator("main form");
    await expect(form.locator("select")).toHaveCount(0);
    await form.locator("#email").fill("buyer@example.org");
    await form.locator("#workflow").fill("Synthetic fit check: an agent can issue a refund after approval.");
    await form.locator("#approvalBoundary").fill("Payment provider and customer support tool.");
    await form.locator("#decisionTiming").fill("Before the next release.");
    await form.locator('button[type="submit"]').click();
    const summary = form.locator('[role="alert"][tabindex="-1"]');
    await expect(summary).toBeFocused();
    await expect(form.locator("#workflow")).toHaveValue("Synthetic fit check: an agent can issue a refund after approval.");
    await form.locator('button[type="submit"]').click();
    await expect(page.locator("#verification-code")).toBeVisible();
    expect(requests).toBe(2);
    expect(submitted.every((body) => body.intent === "agent-action-security-review")).toBe(true);

    const code = page.locator("#verification-code");
    await code.fill("abcdefghjklm");
    await expect(code).toHaveValue("ABCD-EFGH-JKLM");
    const confirm = page.locator('main form button[type="submit"]');
    await expect(confirm).toBeDisabled();
    await page.locator('main form input[type="checkbox"]').check();
    await confirm.click();
    await expect(page.locator('#verification-code-error[role="alert"]')).toBeVisible();
    await expect(code).toHaveValue("ABCD-EFGH-JKLM");
    await confirm.click();
    await expect(page).toHaveURL(new RegExp(`${prefix}/review/request/confirmed$`));
    expect(verifications).toBe(2);
    const record = page.locator('[data-ui-proof-id="review-request-record"]');
    await expect(record).toContainText("Agent Action Security Review");
    await expect(record).toContainText("int_synthetic_gate_one");
    const heldRecord = await page.evaluate(() => JSON.parse(window.sessionStorage.getItem("witnessops.review-request-confirmation.v1") ?? "null"));
    expect(heldRecord.requestKind).toBe("agent-action-security-review");
    expect(heldRecord.locale).toBe(locale);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    await context.close();
  }
});

test("Agent Action Security Review gathers one non-secret consequential action", async ({ browser }) => {
  for (const scenario of [
    {
      locale: "en",
      path: "/review/request",
      fitTitle: "Start your Agent Action Security Review.",
      contractMarkers: [
        "Agent Action Security Review",
        "€2,500\u00A0excl.\u00A0VAT",
        "One consequential agent or automation action",
        "Submitting this form opens fit review only",
        "Delivery timing agreed in the signed statement of work",
      ],
    },
    {
      locale: "pl",
      path: "/pl/review/request",
      fitTitle: "Rozpocznij Agent Action Security Review.",
      contractMarkers: [
        "Agent Action Security Review",
        "€2\u00A0500\u00A0bez\u00A0VAT",
        "Jedno istotne działanie agenta lub automatyzacji",
        "Na razie bez sekretów i materiałów",
        "Termin realizacji według podpisanego SOW",
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
      offerId: "agent-action-security-review",
      offer: "Agent Action Security Review",
    });
    await page.goto(`${scenario.path}?${query.toString()}`, {
      waitUntil: "networkidle",
    });

    const form = page.locator("main form");
    // Selected-offer forms omit the repeated intro and retain the canonical intent.
    await expect(form.getByText(scenario.fitTitle, { exact: true })).toHaveCount(0);
    for (const marker of scenario.contractMarkers) {
      await expect(page.locator("main")).toContainText(marker);
    }
    await expect(page.locator("main")).not.toContainText("Agent Risk & Control Review");
    await expect(page.locator("main")).not.toContainText("From €1,500");
    await expect(form.locator('input[name="intent"]')).toHaveValue(
      "agent-action-security-review",
    );

    const controlOrder = await form
      .locator("input:not([type=hidden]), textarea, button[type=submit]")
      .evaluateAll((controls) =>
        controls.map(
          (control) =>
            control.getAttribute("name") || control.id || control.tagName.toLowerCase(),
        ),
      );
    expect(controlOrder).toEqual([
      "email",
      "workflow",
      "approvalBoundary",
      "decisionTiming",
      "button",
    ]);
    await expect(form.locator("#org, #agentPath, #evidenceAvailable, #enquiryPath")).toHaveCount(0);

    for (const fieldName of requiredFields) {
      await expect(form.locator(`#${fieldName}`)).toHaveAttribute("required", "");
    }

    const submit = form.locator('button[type="submit"]');
    await submit.click();
    await expect(form.locator("[aria-invalid=true]")).toHaveCount(requiredFields.length);
    const errorSummary = form.locator('[role="alert"][tabindex="-1"]');
    await expect(errorSummary).toBeFocused();
    await errorSummary.locator('a[href="#email"]').click();
    await expect(form.locator("#email")).toBeFocused();

    await form.locator("#email").fill("buyer@example.com");
    await form
      .locator("#workflow")
      .fill("An agent prepares an API-key rotation after a named human approval.");
    await form.locator("#approvalBoundary").fill("Secrets manager, deployment tool, and API provider.");
    await form.locator("#decisionTiming").fill("Customer handover next Friday");
    await submit.click();

    expect(submittedPayload?.intent).toBe("agent-action-security-review");
    expect(submittedPayload?.locale).toBe(scenario.locale);
    expect(submittedPayload?.scope).toContain("Request: Agent Action Security Review");
    expect(submittedPayload?.scope).toContain("Consequential action:");
    expect(submittedPayload?.scope).toContain("Systems involved:");
    expect(submittedPayload?.scope).toContain("Decision deadline:");
    expect(submittedPayload?.scope).not.toContain("Unintended effect:");
    expect(submittedPayload?.scope).not.toContain("dated system-level inventory");

    await context.close();
  }
});

test("supported request identities open a selling form and rejected identities stay closed", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();

  for (const [query, intent] of [
    ["offerId=agent-action-security-review", "agent-action-security-review"],
    ["", "agent-action-security-review"],
  ] as const) {
    const response = await page.goto(`/review/request${query ? `?${query}` : ""}`, {
      waitUntil: "networkidle",
    });
    expect(response?.status(), query || "empty").toBe(200);
    const form = page.locator("main form");
    await expect(form).toBeVisible();
    await expect(form.locator('input[name="intent"]')).toHaveValue(intent);
  }

  const parked = await page.goto("/review/request?productId=OFFSEC-EXTERNAL-EXPOSURE", {
    waitUntil: "networkidle",
  });
  expect(parked?.status()).toBe(200);
  await expect(page.locator("main h1")).toHaveText("External Attack Surface Review is no longer available");
  await expect(page.locator("main form")).toHaveCount(0);
  await expect(page.locator("main")).toContainText("It is not the Agent Action Security Review.");

  for (const query of [
    "offer=AI+Agent+Tools+%26+Access+Review",
    "offer=Agent+Action+Security+Review",
    "offer=External+Attack+Surface+Review",
    "offerId=agent-tools-access-review",
    "offerId=agent-tools-access-review&offer=Public+Exposure+Review",
    "offerId=agent-tools-access-review&offer=Buyer-edited+title&productId=OFFSEC-EXTERNAL-EXPOSURE",
  ]) {
    const response = await page.goto(`/review/request?${query}`, {
      waitUntil: "networkidle",
    });
    expect(response?.status(), query).toBe(200);
    const main = page.locator("main");
    await expect(main.locator("h1")).toContainText("This link does not start a new review");
    await expect(main).toContainText("Existing requests and issued agreements keep their original terms.");
    await expect(main.locator("form")).toHaveCount(0);
    await expect(main.locator('input[name="intent"]')).toHaveCount(0);
    await expect(main).not.toContainText("Selected offer:");
    await expect(main).not.toContainText("Starting at €2,500 · excluding VAT");
    await expect(main).not.toContainText("Agent Risk & Control Review");
    await expect(main).not.toContainText("From €1,500");
  }

  await context.close();
});

test("External Attack Surface Review queries stay closed and do not sell that review", async ({ browser }) => {
  for (const scenario of [
    {
      path: "/review/request?productId=OFFSEC-EXTERNAL-EXPOSURE",
      title: "External Attack Surface Review is no longer available",
      body: "It is not the Agent Action Security Review.",
      href: "/review/request?offerId=agent-action-security-review",
    },
    {
      path: "/pl/review/request?productId=OFFSEC-EXTERNAL-EXPOSURE",
      title: "External Attack Surface Review nie jest już dostępny",
      body: "To nie jest Agent Action Security Review.",
      href: "/pl/review/request?offerId=agent-action-security-review",
    },
  ] as const) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    let submissions = 0;
    await page.route("**/api/review/request", async (route) => {
      submissions += 1;
      await route.abort();
    });
    await page.goto(scenario.path, { waitUntil: "networkidle" });
    const main = page.locator("main");
    await expect(main.locator("h1")).toHaveText(scenario.title);
    await expect(main).toContainText(scenario.body);
    await expect(main.locator("form")).toHaveCount(0);
    await expect(main).not.toContainText("€1,900");
    await expect(main.locator(`a[href="${scenario.href}"]`)).toBeVisible();
    expect(submissions).toBe(0);
    await context.close();
  }
});

test("product query routes preserve exposure scope and unresolved pilot fallback", async ({ browser }) => {
  const routeScenarios = [
    {
      path: "/review/request?productId=OFFSEC-EXTERNAL-EXPOSURE",
      heading: "External Attack Surface Review is no longer available",
      intent: null,
      selectedOffer: null,
      boundary: "No work or target-facing check starts from this page.",
      authorizationBoundary: null,
    },
    {
      path: "/pl/review/request?productId=OFFSEC-EXTERNAL-EXPOSURE",
      heading: "External Attack Surface Review nie jest już dostępny",
      intent: null,
      selectedOffer: null,
      boundary: "Ta strona nie rozpoczyna pracy ani kontroli wobec celu.",
      authorizationBoundary: null,
    },
    {
      path: "/review/request?productId=OFFSEC-PILOT",
      heading: "This link does not start a new review",
      intent: null,
      selectedOffer: null,
      boundary: "No work or target-facing check starts from this page.",
      authorizationBoundary: null,
    },
    {
      path: "/pl/review/request?productId=OFFSEC-PILOT",
      heading: "Ten link nie rozpoczyna nowego przeglądu",
      intent: null,
      selectedOffer: null,
      boundary: "Ta strona nie rozpoczyna pracy ani kontroli wobec celu.",
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
      if (scenario.intent) {
        await expect(form).toBeVisible();
        await expect(form.locator('input[name="intent"]')).toHaveValue(
          scenario.intent,
        );
      } else {
        await expect(form).toHaveCount(0);
      }
      await expect(page.locator("main")).toContainText(scenario.boundary);
      if (scenario.authorizationBoundary) {
        await expect(page.locator("main")).toContainText(
          scenario.authorizationBoundary,
        );
      }

      if (scenario.selectedOffer) {
        await expect(page.getByText(scenario.selectedOffer).first()).toBeVisible();
      } else if (scenario.intent) {
        await expect(page.getByText(/Selected offer:|Wybrana oferta:/)).toHaveCount(0);
        await expect(form.locator(scenario.path.startsWith("/pl/") ? "#agentPath" : "#enquiryPath")).toHaveCount(1);
      } else {
        await expect(page.getByText(/Selected offer:|Wybrana oferta:/)).toHaveCount(0);
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
      title: "No request record in this browser.",
      body: "No confirmed request record is present in this browser session.",
      restart: "/review/request",
    },
    {
      path: "/pl/review/request/confirmed",
      title: "Brak zapisu zgłoszenia w tej przeglądarce.",
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
      title: "Your request is recorded.",
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
      title: "Twoje zgłoszenie zostało zapisane.",
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
