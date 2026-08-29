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
      await expect(contactHandoff).toContainText("Rozpocznij przegląd");
      await expect(contactHandoff.locator("a").first()).toHaveAttribute("href", "/pl/review/request");
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

test("Agent Risk & Control Review starts with one compact non-secret workflow request", async ({ browser }) => {
  for (const scenario of [
    { locale: "en", path: "/review/request", fitTitle: "Start your Agent Risk & Control Review." },
    { locale: "pl", path: "/pl/review/request", fitTitle: "Rozpocznij Agent Risk & Control Review." },
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
          issuanceId: `iss_agent_risk_${scenario.locale}`,
          email: "buyer@example.com",
          expiresAt: "2026-08-29T22:00:00.000Z",
        }),
      });
    });

    const query = new URLSearchParams({
      offerId: "bounded-workflow-review",
      offer: "Agent Risk & Control Review",
    });
    await page.goto(`${scenario.path}?${query.toString()}`, {
      waitUntil: "networkidle",
    });

    const form = page.locator("main form");
    await expect(form.getByText(scenario.fitTitle, { exact: true })).toBeVisible();
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
    expect(submittedPayload?.scope).toContain("Request: Agent Risk & Control Review");
    expect(submittedPayload?.scope).toContain("Consequential workflow:");
    expect(submittedPayload?.scope).not.toContain("Situation and affected system:");
    expect(submittedPayload?.scope).not.toContain("Boundary and approval:");
    expect(submittedPayload?.scope).not.toContain("Evidence available:");

    await context.close();
  }
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
