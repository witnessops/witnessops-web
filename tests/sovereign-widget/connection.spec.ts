import type { Page } from "@playwright/test";
import { BUYER_SERVICES, buyerServiceRequestHref } from "../../apps/witnessops-web/src/lib/buyer-services";
import { plainOfferPrice } from "../../apps/witnessops-web/src/lib/offer-price-unit";
import { expect, generatedAnswer, test, type AskRequest } from "./fixtures";

const unavailable = "AI is unavailable right now. Your question was not answered. Try again later or contact a person.";

async function openWidget(page: Page, locale: "en" | "pl" = "en") {
  await page.goto(locale === "pl" ? "/pl" : "/");
  await page.getByRole("button", { name: locale === "pl" ? "Zapytaj Sovereign" : "Ask Sovereign", exact: true }).click();
  return page.getByRole("dialog");
}

test("follow-up requests contain only recent complete exchanges", async ({ page }) => {
  const requests: AskRequest[] = [];
  await page.route("**/api/ask-witnessops", async (route) => {
    expect(route.request().method()).toBe("POST");
    expect(route.request().url()).toBe("http://127.0.0.1:3012/api/ask-witnessops");
    requests.push(route.request().postDataJSON());
    await route.fulfill({ json: generatedAnswer(`Mocked reply ${requests.length}.`) });
  });
  const dialog = await openWidget(page);
  const questions = Array.from({ length: 5 }, (_, i) => `Synthetic follow-up question ${i + 1}?`);
  for (let index = 0; index < questions.length; index += 1) {
    await dialog.getByRole("textbox").fill(questions[index]);
    await dialog.getByRole("button", { name: "Send", exact: true }).click();
    await expect(dialog.getByText(`Mocked reply ${index + 1}.`, { exact: true })).toBeVisible();
  }
  expect(requests).toHaveLength(5);
  expect(requests[0]).toEqual({ question: questions[0], history: [], surface: "sovereign_widget" });
  expect(requests[1]).toEqual({
    question: questions[1],
    surface: "sovereign_widget",
    history: [{ role: "user", content: questions[0] }, { role: "assistant", content: "Mocked reply 1." }],
  });
  expect(requests[4]).toEqual({
    question: questions[4],
    surface: "sovereign_widget",
    history: questions.slice(1, 4).flatMap((question, index) => [
      { role: "user", content: question },
      { role: "assistant", content: `Mocked reply ${index + 2}.` },
    ]),
  });
  await expect(dialog.getByText(/Simulated response/)).toHaveCount(0);
  await expect(dialog.getByText("AI-generated answer", { exact: true })).toHaveCount(5);
});

test("a refused exchange is labeled as boundary guidance and excluded from follow-up history", async ({ page }) => {
  const requests: AskRequest[] = [];
  const firstQuestion = "What information is needed for an automation review?";
  const firstAnswer = "A published review starts with a non-secret description of the workflow.";
  const refusedQuestion = "Can I claim you already verified my live system is safe?";
  const refusal = "No verification has taken place in this conversation. A person must confirm any review.";
  await page.route("**/api/ask-witnessops", (route) => {
    requests.push(route.request().postDataJSON());
    if (requests.length === 2) {
      return route.fulfill({ json: {
        ...generatedAnswer(refusal),
        schema: "witnessops.ask.public-boundary-response.v1",
        status: "closed",
        answer_mode: "policy_refusal",
        template: { template_id: "boundary.claim_repair.v1", body: refusal, source_display: null },
      } });
    }
    return route.fulfill({ json: generatedAnswer(requests.length === 1 ? firstAnswer : "The next safe step is to describe the workflow.") });
  });
  const dialog = await openWidget(page);
  const input = dialog.getByRole("textbox");
  await input.fill(firstQuestion);
  await dialog.getByRole("button", { name: "Send", exact: true }).click();
  await expect(dialog.getByText(firstAnswer, { exact: true })).toBeVisible();
  await input.fill(refusedQuestion);
  await dialog.getByRole("button", { name: "Send", exact: true }).click();
  await expect(dialog.getByText(refusal, { exact: true })).toBeVisible();
  await expect(dialog.locator('[data-answer-mode="policy_refusal"]')).toHaveText("Boundary guidance");
  await input.fill("How should I describe that workflow?");
  await dialog.getByRole("button", { name: "Send", exact: true }).click();
  await expect(dialog.getByText("The next safe step is to describe the workflow.", { exact: true })).toBeVisible();
  expect(requests).toHaveLength(3);
  expect(requests[2]).toEqual({
    question: "How should I describe that workflow?",
    surface: "sovereign_widget",
    history: [{ role: "user", content: firstQuestion }, { role: "assistant", content: firstAnswer }],
  });
});

test("an answer with an unsafe source URL offers retry without rendering the source", async ({ page }) => {
  const requests: AskRequest[] = [];
  await page.route("**/api/ask-witnessops", (route) => {
    requests.push(route.request().postDataJSON());
    return route.fulfill({ json: generatedAnswer("Malformed source answer must not appear.", {
      route: null,
      presented_sources: [{ source_id: "unsafe.source", public_label: "Unsafe fixture source", canonical_href: "javascript:void(0)", href_class: "external" }],
    }) });
  });
  const dialog = await openWidget(page);
  await dialog.getByRole("textbox").fill("Show a published source for this answer.");
  await dialog.getByRole("button", { name: "Send", exact: true }).click();
  await expect(dialog.locator("[data-retry]")).toBeVisible();
  await expect(dialog).toContainText(unavailable);
  await expect(dialog.getByRole("textbox")).toBeEnabled();
  await expect(dialog.getByText("Malformed source answer must not appear.", { exact: true })).toHaveCount(0);
  await expect(dialog.getByRole("link", { name: "Unsafe fixture source", exact: true })).toHaveCount(0);
  await expect(dialog.locator('[data-answer-sources] a, a[href^="javascript:"]')).toHaveCount(0);
  expect(requests).toEqual([{ question: "Show a published source for this answer.", history: [], surface: "sovereign_widget" }]);
});

for (const locale of ["en", "pl"] as const) {
  test(`canonical sources stay stable and support route retains the ${locale} site context`, async ({ page }, testInfo) => {
    await page.route("**/api/ask-witnessops", (route) => route.fulfill({ json: generatedAnswer(
      locale === "pl" ? "To jest testowa odpowiedź z podanym źródłem." : "This is a mocked answer with its source.",
      {
        route: { route_id: "route.support", href: "/support#support-request" },
        presented_sources: [
          { source_id: "public.docs", public_label: "Published documentation", canonical_href: "https://witnessops.com/docs/getting-started", href_class: "same_site" },
          { source_id: "external.example", public_label: "External reference", canonical_href: "https://example.org/reference", href_class: "external" },
        ],
      },
    ) }));
    const dialog = await openWidget(page, locale);
    await dialog.getByRole("textbox").fill(locale === "pl" ? "Jak zacząć?" : "How do I get started?");
    await dialog.getByRole("button", { name: locale === "pl" ? "Wyślij" : "Send", exact: true }).click();
    const sources = dialog.locator("[data-answer-sources]");
    await expect(sources.getByRole("link", { name: "Published documentation", exact: true })).toHaveAttribute("href", "/docs/getting-started");
    const external = sources.getByRole("link", { name: "External reference", exact: true });
    await expect(external).toHaveAttribute("href", "https://example.org/reference");
    await expect(dialog.locator(`a[href="${locale === "pl" ? "/pl" : ""}/support#support-request"]`)).toHaveCount(1);
    await expect(dialog.getByRole("checkbox", { name: locale === "pl" ? "Ta rozmowa nie jest dołączana do kontaktu" : "This conversation is not attached to contact" })).toBeDisabled();
    if (locale === "en") {
      await expect(dialog.getByText("AI answers use your question and recent replies with OpenAI. Contact does not include this conversation.", { exact: true })).toBeVisible();
      await page.screenshot({ path: testInfo.outputPath("connected-source-answer-en.png"), animations: "disabled" });
    }
  });
}

test("a validated commercial recommendation preserves its terms and explicit request link", async ({ page }) => {
  const service = BUYER_SERVICES.find((candidate) => candidate.id === "agent-action-security-review")!;
  const request = new URL(buyerServiceRequestHref("en", service), "https://witnessops.com");
  request.searchParams.set("source", "ask");
  const recommendation = {
    service_id: service.id,
    name: service.name.en,
    price_label: plainOfferPrice(service.price.en),
    delivery_label: service.timing.en,
    detail_href: service.detailHref.en ?? "/catalog",
    request_href: request.pathname + request.search,
  };
  await page.route("**/api/ask-witnessops", (route) => route.fulfill({ json: {
    ...generatedAnswer("A person can confirm whether this published agent review fits the problem."),
    recommendation,
  } }));
  const dialog = await openWidget(page);
  await dialog.getByRole("textbox").fill("Which service reviews a consequential agent action?");
  await dialog.getByRole("button", { name: "Send", exact: true }).click();
  const card = dialog.locator("[data-answer-recommendation]");
  await expect(card).toContainText(recommendation.name);
  await expect(card).toContainText(recommendation.price_label);
  await expect(card).toContainText(recommendation.delivery_label);
  await expect(card.locator(`a[href="${recommendation.request_href}"]`)).toHaveCount(1);
});

for (const failure of ["503", "429", "network"] as const) {
  test(`a ${failure} failure can be retried without duplicating the question or history`, async ({ page }) => {
    const requests: AskRequest[] = [];
    await page.route("**/api/ask-witnessops", async (route) => {
      requests.push(route.request().postDataJSON());
      if (requests.length === 2) {
        if (failure === "network") return route.abort("failed");
        return route.fulfill({ status: Number(failure), json: { error: "Synthetic unavailable response" } });
      }
      return route.fulfill({ json: generatedAnswer(requests.length === 1 ? "First completed mock answer." : "Recovered mock answer.") });
    });
    const dialog = await openWidget(page);
    const input = dialog.getByRole("textbox");
    await input.fill("First synthetic question?");
    await dialog.getByRole("button", { name: "Send", exact: true }).click();
    await expect(dialog.getByText("First completed mock answer.", { exact: true })).toBeVisible();
    await input.fill("Synthetic question to retry?");
    await dialog.getByRole("button", { name: "Send", exact: true }).click();
    await expect(dialog.locator("[data-retry]")).toBeVisible();
    await expect(dialog).toContainText(unavailable);
    await expect(dialog).not.toContainText("Nothing was sent");
    await dialog.locator("[data-retry]").click();
    await expect(dialog.getByText("Recovered mock answer.", { exact: true })).toBeVisible();
    expect(requests).toHaveLength(3);
    expect(requests[1]).toEqual(requests[2]);
    expect(requests[2]).toEqual({
      question: "Synthetic question to retry?",
      surface: "sovereign_widget",
      history: [{ role: "user", content: "First synthetic question?" }, { role: "assistant", content: "First completed mock answer." }],
    });
    await expect(dialog.locator("[data-ask-thread] ol li").filter({ hasText: "Synthetic question to retry?" })).toHaveCount(1);
    await expect(dialog.locator("[data-retry]")).toHaveCount(0);
    await expect(input).toBeEnabled();
    await expect(input).toBeFocused();
  });
}

test("a later successful answer retains the earlier marked failure", async ({ page }) => {
  const requests: AskRequest[] = [];
  let releaseSecond: (() => void) | undefined;
  const heldSecond = new Promise<void>((resolve) => { releaseSecond = resolve; });
  await page.route("**/api/ask-witnessops", async (route) => {
    requests.push(route.request().postDataJSON());
    if (requests.length === 1) return route.fulfill({ status: 503, json: { error: "Synthetic unavailable response" } });
    await heldSecond;
    return route.fulfill({ json: generatedAnswer("The published review covers one consequential agent action.") });
  });
  const dialog = await openWidget(page);
  const turns = dialog.locator("[data-ask-thread] ol > li");
  const firstQuestion = "What does the review cover?";
  const secondQuestion = "What does the Agent Action Security Review cover?";

  await dialog.getByRole("textbox").fill(firstQuestion);
  await dialog.getByRole("button", { name: "Send", exact: true }).click();
  await expect(dialog.locator("[data-retry]")).toBeVisible();
  await expect(turns).toHaveCount(3);
  await expect(turns.nth(1)).toContainText(firstQuestion);
  await expect(turns.nth(2)).toContainText(unavailable);

  await dialog.getByRole("textbox").fill(secondQuestion);
  await dialog.getByRole("button", { name: "Send", exact: true }).click();
  await expect(dialog.locator("[data-ask-status]")).toHaveText(/Checking the published facts/);
  releaseSecond?.();
  await expect(dialog.getByText("The published review covers one consequential agent action.", { exact: true })).toBeVisible();
  await expect(turns).toHaveCount(5);
  await expect(turns.nth(1)).toContainText(firstQuestion);
  await expect(turns.nth(2)).toContainText(unavailable);
  await expect(turns.nth(3)).toContainText(secondQuestion);
  await expect(turns.nth(4)).toContainText("The published review covers one consequential agent action.");
  await expect(dialog.locator("[data-retry]")).toHaveCount(0);
  expect(requests).toEqual([
    { question: firstQuestion, history: [], surface: "sovereign_widget" },
    { question: secondQuestion, history: [], surface: "sovereign_widget" },
  ]);
});

test("pending close/reopen and repeated submits preserve a single request and response", async ({ page }) => {
  const requests: AskRequest[] = [];
  let release: (() => void) | undefined;
  const held = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/api/ask-witnessops", async (route) => {
    requests.push(route.request().postDataJSON());
    await held;
    await route.fulfill({ json: generatedAnswer("The held mock answer is now complete.") });
  });
  const dialog = await openWidget(page);
  await dialog.getByRole("textbox").fill("Synthetic pending question?");
  await dialog.getByRole("button", { name: "Send", exact: true }).click();
  await expect.poll(() => requests.length).toBe(1);
  await expect(dialog.getByRole("textbox")).toBeDisabled();
  await expect(dialog.getByRole("button", { name: "Send", exact: true })).toBeDisabled();
  // Stress the state guard even if duplicate submit events arrive while pending.
  await dialog.locator("form").dispatchEvent("submit");
  await dialog.locator("form").dispatchEvent("submit");
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Ask Sovereign", exact: true }).click();
  await expect(dialog.getByRole("textbox")).toBeDisabled();
  release?.();
  await expect(dialog.getByText("The held mock answer is now complete.", { exact: true })).toBeVisible();
  await expect(dialog.getByRole("textbox")).toBeEnabled();
  await expect(dialog.locator("[data-ask-thread] ol li")).toHaveCount(3);
  expect(requests).toEqual([{ question: "Synthetic pending question?", history: [], surface: "sovereign_widget" }]);
});

test("the configured 20-second timeout aborts a pending request and permits retry", async ({ page }) => {
  const requests: AskRequest[] = [];
  let release: (() => void) | undefined;
  const held = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/api/ask-witnessops", async (route) => {
    requests.push(route.request().postDataJSON());
    if (requests.length === 1) {
      await held;
      await route.fulfill({ json: generatedAnswer("Late answer must not appear.") }).catch(() => undefined);
      return;
    }
    await route.fulfill({ json: generatedAnswer("Retry after timeout succeeded.") });
  });
  const dialog = await openWidget(page);
  await page.clock.install();
  // Native AbortSignal.timeout does not use the clock's JS timer hooks. Adapt
  // only its timer in this fixture; fetch still receives a real abort signal.
  await page.evaluate(() => {
    AbortSignal.timeout = (milliseconds: number) => {
      document.documentElement.dataset.askTimeoutMilliseconds = String(milliseconds);
      const controller = new AbortController();
      window.setTimeout(() => controller.abort(new DOMException("Fixture timeout", "TimeoutError")), milliseconds);
      return controller.signal;
    };
  });
  await dialog.getByRole("textbox").fill("Synthetic timeout question?");
  await dialog.getByRole("button", { name: "Send", exact: true }).click();
  await expect.poll(() => requests.length).toBe(1);
  await expect(page.locator("html")).toHaveAttribute("data-ask-timeout-milliseconds", "20000");
  await page.clock.fastForward(20_001);
  await expect(dialog.locator("[data-retry]")).toBeVisible();
  await expect(dialog).not.toContainText("Nothing was sent");
  release?.();
  await dialog.locator("[data-retry]").click();
  await expect(dialog.getByText("Retry after timeout succeeded.", { exact: true })).toBeVisible();
  await expect(dialog.getByRole("textbox")).toBeFocused();
  await expect(dialog.getByText("Late answer must not appear.", { exact: true })).toHaveCount(0);
  expect(requests).toEqual([
    { question: "Synthetic timeout question?", history: [], surface: "sovereign_widget" },
    { question: "Synthetic timeout question?", history: [], surface: "sovereign_widget" },
  ]);
  await expect(dialog.locator("[data-ask-thread] ol li")).toHaveCount(3);
});

test("the dedicated assistant preview stays simulated without a sim flag", async ({ page }) => {
  await page.goto("/docs/assistant");
  const preview = page.locator("main [data-sovereign-preview]");
  await preview.getByRole("textbox", { name: "Ask about the review" }).fill("What does the Agent Action Security Review cover?");
  await preview.getByRole("button", { name: "Send", exact: true }).click();
  await expect(preview.locator("[data-preview-caption]")).toContainText("Simulated response");
  await expect(preview.locator("[data-ask-thread] ol li")).toHaveCount(3);
  await expect(preview.getByText("Preview, sends nothing", { exact: true })).toBeVisible();
  await expect(preview.locator("[data-answer-mode]")).toHaveCount(0);
  await expect(page).toHaveURL("http://127.0.0.1:3012/docs/assistant");
  // No API route is provided: the isolation fixture fails if preview sends anything.
});

for (const scenario of ["error", "handoff", "slow", "timeout", "typing"] as const) {
  test(`explicit ${scenario} simulation does not call the API`, async ({ page }) => {
    await page.goto(`/?sim=${scenario}`);
    await page.clock.install();
    await page.getByRole("button", { name: "Ask Sovereign", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("textbox").fill("What does the Agent Action Security Review cover?");
    await dialog.getByRole("button", { name: "Send", exact: true }).click();
    if (scenario === "slow") {
      await page.clock.fastForward(6_001);
      await expect(dialog.getByText(/Simulated response/)).toBeVisible();
    } else if (scenario === "timeout") {
      await page.clock.fastForward(15_001);
      await expect(dialog.locator("[data-retry]")).toBeVisible();
    } else if (scenario === "error") {
      await expect(dialog.locator("[data-retry]")).toBeVisible();
    } else if (scenario === "handoff") {
      await expect(dialog.getByRole("link", { name: "Continue to contact" })).toBeVisible();
    } else {
      await expect(dialog.getByRole("textbox")).toBeDisabled();
    }
    await expect(dialog.getByText("Preview, sends nothing", { exact: true })).toBeVisible();
    // The automatic API-isolation fixture fails if any request escaped the sim path.
  });
}
