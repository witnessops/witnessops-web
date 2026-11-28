import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { once } from "node:events";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { chromium, expect } from "@playwright/test";

const app = fileURLToPath(new URL("../../apps/witnessops-web/", import.meta.url));
const action = "Issue a synthetic refund after the agreed approval.";
const deadline = "2030-02-18";
const email = "buyer@example.test";

// Run against a completed website build. Both mail deliveries and all records
// belong to this process, which cannot inherit provider settings or credentials.
test("one confirmed browser enquiry produces exactly one admitted intake", { timeout: 60_000 }, async t => {
  const envFiles = (await readdir(app)).filter(name => /^\.env(?:\.local|\.production(?:\.local)?)?$/.test(name));
  assert.deepEqual(envFiles, [], "Use a clean checkout without runtime .env files for this fixture");
  const fixture = await mkdtemp(join(tmpdir(), "wops-enquiry-"));
  const store = join(fixture, "intake");
  const mail = join(fixture, "mail");
  const audit = join(fixture, "audit");
  const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-H", "127.0.0.1", "-p", "0"], {
    cwd: app,
    env: {
      PATH: process.env.PATH, HOME: fixture, NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1",
      WITNESSOPS_MAIL_PROVIDER: "file", WITNESSOPS_MAIL_OUTPUT_DIR: mail,
      WITNESSOPS_TOKEN_SIGNING_SECRET: randomBytes(32).toString("hex"),
      WITNESSOPS_MAILBOX_ENGAGE: "engage@example.test", WITNESSOPS_MAILBOX_NOREPLY: "noreply@example.test",
      WITNESSOPS_TOKEN_FROM_EMAIL: "noreply@example.test", WITNESSOPS_VERIFY_BASE_URL: "http://127.0.0.1",
      WITNESSOPS_INTAKE_STORE_DIR: store, WITNESSOPS_TOKEN_AUDIT_DIR: audit, WITNESSOPS_INTAKE_EVENT_DIR: audit,
    },
    stdio: ["ignore", "pipe", "inherit"],
  });
  const stopped = once(server, "close");
  t.after(async () => {
    server.kill();
    await stopped;
    await rm(fixture, { recursive: true, force: true });
  });
  let origin;
  for await (const line of createInterface({ input: server.stdout })) {
    origin ??= line.match(/http:\/\/127\.0\.0\.1:\d+/)?.[0];
    if (line.includes("Ready in")) break;
  }
  assert.ok(origin, "The task-owned server must report its loopback URL");
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined });
  t.after(() => browser.close());
  const context = await browser.newContext({ serviceWorkers: "block" });
  await context.route("**/*", route => new URL(route.request().url()).origin === origin
    ? route.continue() : route.abort());
  const page = await context.newPage();
  await page.goto(origin + "/review/request?offerId=agent-action-security-review&offer=Agent+Action+Security+Review");
  const form = page.locator("main form");
  await expect(form.locator('input[name="intent"]')).toHaveValue("agent-action-security-review");
  await form.locator("#email").fill(email);
  await form.locator("#workflow").fill(action);
  await form.locator("#approvalBoundary").fill("Synthetic payments and support systems.");
  await form.locator("#decisionTiming").fill(deadline);
  const issued = page.waitForResponse(res => res.url() === origin + "/api/review/request" && res.request().method() === "POST");
  await form.locator('button[type="submit"]').click();
  const issueResponse = await issued;
  assert.equal(issueResponse.status(), 201);
  const { intakeId, issuanceId } = await issueResponse.json();
  assert.match(intakeId, /^intk_[0-9a-f]{32}$/);
  const letters = await readdir(mail);
  assert.equal(letters.length, 1);
  const letter = await readFile(join(mail, letters[0]), "utf8");
  assert.match(letter, /^To: buyer@example\.test$/m);
  assert.match(letter, /^Confirm your AI Agent Red Teaming request\.$/m);
  assert.match(letter, /^Email confirmation does not book work or authorize testing\.$/m);
  assert.doesNotMatch(letter, /€[\s\d]/);
  const code = letter.match(/^Verification Code:\s+([A-Z0-9-]+)\s*$/m)?.[1];
  assert.ok(code, "The fixture mailbox must receive one confirmation code");
  await page.locator("#verification-code").fill(code);
  await page.locator('main form input[type="checkbox"]').check();
  const confirmed = page.waitForResponse(res => res.url() === origin + "/api/verify-token" && res.request().method() === "POST");
  await page.locator('main form button[type="submit"]').click();
  const confirmationResponse = await confirmed;
  assert.equal(confirmationResponse.status(), 200);
  const verified = await confirmationResponse.json();
  assert.equal(verified.intakeId, intakeId);
  assert.equal(verified.issuanceId, issuanceId);
  assert.equal(verified.assessmentRunId, null);
  await expect(page).toHaveURL(origin + "/review/request/confirmed");
  const confirmationRecord = page.locator('[data-ui-proof-id="review-request-record"]');
  await expect(confirmationRecord).toContainText(intakeId);
  await expect(confirmationRecord).toContainText("AI Agent Red Teaming");
  await expect(confirmationRecord).toContainText("Mailbox confirmed");
  const confirmation = page.locator('[data-ui-proof-id="review-request-confirmed"]');
  await expect(confirmation).toContainText("signed statement of work");
  await expect(confirmation).not.toContainText(/€[\s\d]/);

  const files = await readdir(join(store, "intakes"));
  assert.deepEqual(files, [intakeId + ".json"]);
  const record = JSON.parse(await readFile(join(store, "intakes", files[0]), "utf8"));
  assert.equal(record.intakeId, intakeId);
  assert.equal(record.state, "admitted");
  assert.equal(record.email, email);
  assert.equal(record.latestIssuanceId, issuanceId);
  assert.equal(record.submission.intent, "agent-action-security-review");
  assert.equal(record.submission.offerSnapshot.name.en, "AI Agent Red Teaming");
  assert.match(record.submission.offerSnapshot.price.en, /^€2,500\s+excl\.\s+VAT$/);
  assert.ok(record.submission.scope.includes(action));
  assert.ok(record.submission.scope.includes(deadline));
  assert.equal(record.operatorNotification?.provider, "file");
  const deliveries = await Promise.all((await readdir(mail)).map(name => readFile(join(mail, name), "utf8")));
  assert.deepEqual(deliveries.map(letter => letter.match(/^To: ([^\r\n]+)$/m)?.[1]).sort(), [email, "engage@example.test"]);
  const notification = deliveries.find(message => /^To: engage@example\.test$/m.test(message));
  assert.match(notification, /^Subject: Verified AI Agent Red Teaming request:/m);
  assert.match(notification, /Price at enquiry: €2,500\s+excl\.\s+VAT/);
  t.diagnostic("Verified one admitted intake with the submitted action and deadline; buyer and operator email stayed in the fixture.");
});
