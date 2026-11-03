import { expect, generatedAnswer, test } from "./fixtures";

for (const viewport of [{ width: 1280, height: 900 }, { width: 360, height: 640 }]) {
  test(`three clear choices and a compact mascot at ${viewport.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page.getByRole("button", { name: "Ask Sovereign", exact: true }).click();
    const dialog = page.getByRole("dialog");
    const choices = dialog.locator("[data-opening-choices]");
    await expect(choices.getByRole("button")).toHaveCount(3);
    await expect(choices.getByRole("button", { name: "What does WitnessOps do?", exact: true })).toBeVisible();
    await expect(choices.getByRole("button", { name: "Is it right for my agent?", exact: true })).toBeVisible();
    await expect(choices.getByRole("button", { name: /Book a fit call/ })).toBeInViewport();
    await expect(dialog.getByRole("checkbox")).toHaveCount(0);
    const avatar = await dialog.locator("[data-chat-mascot]").boundingBox();
    expect(avatar?.width).toBe(32);
    expect(avatar?.height).toBe(35);
    await expect(dialog.locator("[data-shellbit-chat]")).toHaveCSS("background-image", /shellbit-v3\/spritesheet[.]png/);
    expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`chat-opening-${viewport.width}.png`), animations: "disabled" });
  });
}

test("an answer invites booking in the same panel, preserves draft and conversation, and can be dismissed", async ({ page }, testInfo) => {
  const actions: string[] = [];
  await page.route("**/api/sovereign-booking", (route) => {
    const { action } = route.request().postDataJSON(); actions.push(action);
    return route.fulfill({ json: action === "start" ? { token: "fictional-ui-session", voiceAvailable: false } : {} });
  });
  const reply = "WitnessOps reviews one consequential agent action: permissions, approvals and execution evidence.";
  await page.route("**/api/ask-witnessops", (route) => route.fulfill({ json: generatedAnswer(reply) }));
  await page.goto("/");
  await page.getByRole("button", { name: "Ask Sovereign", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "What does WitnessOps do?", exact: true }).click();
  const invitation = dialog.locator("[data-booking-follow-up]");
  await expect(invitation).toBeVisible();
  await expect(dialog.locator("[data-booking-preview]")).toHaveCount(0);
  expect(actions).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath("chat-booking-invitation.png"), animations: "disabled" });
  await invitation.getByRole("button", { name: "Book a fit call", exact: true }).click();
  await expect(dialog.getByRole("heading", { name: "What would you like to discuss?" })).toBeFocused();
  await dialog.getByLabel("One agent or automation action").fill("An agent that approves demo refunds");
  await dialog.getByRole("button", { name: "Chat", exact: true }).click();
  await expect(dialog.getByRole("textbox", { name: "Ask about the review" })).toBeFocused();
  await expect(dialog.getByText(reply, { exact: true })).toBeVisible();
  await invitation.getByRole("button", { name: "Book a fit call", exact: true }).click();
  await expect(dialog.getByLabel("One agent or automation action")).toHaveValue("An agent that approves demo refunds");
  expect(actions.filter((action) => action === "start")).toHaveLength(1);
  expect(actions).not.toContain("voice-start");
  expect(actions).not.toContain("confirm");
  await dialog.getByRole("button", { name: "Chat", exact: true }).click();
  await invitation.getByRole("button", { name: "Keep asking", exact: true }).click();
  await expect(invitation).toHaveCount(0);
  await expect(dialog.getByRole("textbox", { name: "Ask about the review" })).toBeFocused();
  await dialog.getByRole("button", { name: "Book a call", exact: true }).click();
  await expect(dialog.getByLabel("One agent or automation action")).toHaveValue("An agent that approves demo refunds");
  await dialog.getByRole("button", { name: "Chat", exact: true }).click();
  await expect(dialog.getByText(reply, { exact: true })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Is the external review still offered?" })).toHaveCount(0);
});

for (const outcome of ["support", "refusal", "not-fit", "unavailable", "unrelated"] as const) {
  test(`${outcome} answer does not prompt booking but keeps manual booking available`, async ({ page }) => {
    await page.route("**/api/sovereign-booking", (route) => route.fulfill({ json: { token: "fictional-ui-session", voiceAvailable: false } }));
    await page.route("**/api/ask-witnessops", (route) => {
      const answer = generatedAnswer("This is the requested guidance.");
      if (outcome === "unavailable") return route.fulfill({ status: 503, json: { error: "unavailable" } });
      if (outcome === "support") return route.fulfill({ json: { ...answer, route: { route_id: "route.support", href: "/support#support-request" } } });
      if (outcome === "refusal") return route.fulfill({ json: { ...answer, status: "closed", answer_mode: "policy_refusal" } });
      if (outcome === "not-fit") return route.fulfill({ json: { ...answer, commercial_fit: { ...answer.commercial_fit, result: "not_fit" } } });
      return route.fulfill({ json: answer });
    });
    await page.goto("/");
    await page.getByRole("button", { name: "Ask Sovereign", exact: true }).click();
    const dialog = page.getByRole("dialog");
    if (outcome === "unrelated") {
      await dialog.getByRole("textbox").fill("Where can I read the documentation?");
      await dialog.getByRole("button", { name: "Send", exact: true }).click();
    } else await dialog.getByRole("button", { name: "What does WitnessOps do?", exact: true }).click();
    await expect(dialog.getByRole("textbox")).toBeEnabled();
    await expect(dialog.locator("[data-booking-follow-up]")).toHaveCount(0);
    await expect(dialog.locator("[data-booking-preview]")).toHaveCount(0);
    await dialog.getByRole("button", { name: "Book a call", exact: true }).click();
    await expect(dialog.getByRole("heading", { name: "What would you like to discuss?" })).toBeVisible();
  });
}

for (const viewport of [{ width: 1280, height: 720 }, { width: 360, height: 640 }]) {
  test(`typing form is the first booking view at ${viewport.width}px`, async ({ page }, testInfo) => {
    await page.route("**/api/sovereign-booking", (route) => route.fulfill({ json: { token: "fictional-ui-session", voiceAvailable: true } }));
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page.getByRole("button", { name: "Ask Sovereign", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Book a call", exact: true }).click();
    await expect(dialog.getByRole("button", { name: "Type", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(dialog.locator("[data-booking-voice]")).toBeHidden();
    await expect(dialog.getByLabel("One agent or automation action")).toBeInViewport({ ratio: 1 });
    await expect(dialog.getByRole("button", { name: "Find available times", exact: true })).toBeInViewport({ ratio: 1 });
    await dialog.getByLabel("One agent or automation action").fill("A fictional refund approval agent");
    await dialog.getByRole("button", { name: "Voice", exact: true }).click();
    await expect(dialog.getByRole("button", { name: "Start voice", exact: true })).toBeVisible();
    await dialog.getByRole("button", { name: "Type", exact: true }).click();
    await expect(dialog.getByLabel("One agent or automation action")).toHaveValue("A fictional refund approval agent");
    await page.screenshot({ path: testInfo.outputPath(`booking-type-${viewport.width}.png`), animations: "disabled" });
  });
}
