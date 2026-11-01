import { expect, generatedAnswer, test } from "./fixtures";

test("failed connection keeps the question, shows compact recovery, and retries once", async ({ page }, testInfo) => {
  let calls = 0;
  await page.route("**/api/ask-witnessops", (route) => {
    calls += 1;
    return calls === 1 ? route.abort("connectionrefused") : route.fulfill({ json: generatedAnswer("The connection recovered.") });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Ask Sovereign", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("button", { name: "Move chat", exact: true })).toBeHidden();
  await expect(dialog.getByRole("button", { name: "Reset position", exact: true })).toBeHidden();
  await dialog.getByRole("textbox").fill("How do I start?");
  await dialog.getByRole("button", { name: "Send", exact: true }).click();
  await expect(dialog.locator("[data-connection-error]")).toHaveText("Couldn’t connect to Sovereign. Your question is still here.");
  await expect(dialog.getByRole("link", { name: "Contact a person", exact: true })).toBeVisible();
  await expect(dialog).not.toContainText("AI is unavailable");
  await expect(dialog.getByText("How do I start?", { exact: true })).toHaveCount(1);
  await page.screenshot({ path: testInfo.outputPath("connection-recovery.png"), animations: "disabled" });
  await dialog.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(dialog.getByText("The connection recovered.", { exact: true })).toBeVisible();
  expect(calls).toBe(2);
  await expect(dialog.getByText("How do I start?", { exact: true })).toHaveCount(1);
});

test("a disabled service is not presented as a connection or provider outage", async ({ page }) => {
  await page.route("**/api/ask-witnessops", (route) => route.fulfill({ status: 410, json: { message: "private server detail" } }));
  await page.goto("/");
  await page.getByRole("button", { name: "Ask Sovereign", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "What does WitnessOps do?", exact: true }).click();
  await expect(dialog.locator("[data-connection-error]")).toHaveText("Sovereign isn’t enabled here. Your question is still here.");
  await expect(dialog).not.toContainText("private server detail");
});
