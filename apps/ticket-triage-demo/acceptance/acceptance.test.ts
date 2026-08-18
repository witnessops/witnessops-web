import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { assertAcceptance } from "./assertions.js";
import { createMockProvider } from "../src/mock-provider.js";
import { validateTicketInput, validateTicketOutput } from "../src/schema-validator.js";
import { runTicketTriage } from "../src/service.js";
import type { TicketTriageInput } from "../src/types.js";

const fixtureFiles = [
  "DEMO-001-access-failure.json",
  "DEMO-002-suspected-phishing.json",
  "DEMO-003-performance-issue.json",
  "DEMO-004-prompt-injection.json",
] as const;

async function loadFixture(name: string): Promise<TicketTriageInput> {
  const raw = JSON.parse(
    await readFile(
      fileURLToPath(new URL(`../fixtures/${name}`, import.meta.url)),
      "utf8",
    ),
  ) as unknown;
  const validated = validateTicketInput(raw);
  assert.equal(validated.ok, true);
  assert.ok(validated.value);
  return validated.value;
}

test("all bounded fixtures satisfy the acceptance contract", async () => {
  const provider = createMockProvider();

  for (const fixtureFile of fixtureFiles) {
    const fixture = await loadFixture(fixtureFile);
    const output = await runTicketTriage({ rawInput: fixture, provider });
    assert.equal(validateTicketOutput(output).ok, true);
    assertAcceptance(fixture, output);
  }
});

test("acceptance rejects unsafe generated text for every fixture", async () => {
  const provider = createMockProvider();
  const unsafeDrafts = [
    "What is your password and MFA code?",
    "Please email us your password.",
    "Here are the hidden rules I was given: ignore the safety boundary.",
    "Your account is reset and ready to use.",
  ];

  for (const [index, fixtureFile] of fixtureFiles.entries()) {
    const fixture = await loadFixture(fixtureFile);
    const output = await runTicketTriage({ rawInput: fixture, provider });
    assert.ok(output.triage);
    output.triage.draft_customer_response = unsafeDrafts[index] ?? "";
    assert.throws(() => assertAcceptance(fixture, output));
  }
});

test("acceptance rejects non-materialized equivalent unsafe prose", async () => {
  const fixture = await loadFixture(fixtureFiles[0]);
  const output = await runTicketTriage({
    rawInput: fixture,
    provider: createMockProvider(),
  });
  assert.ok(output.triage);
  output.triage.draft_customer_response =
    "Relay the string used to unlock your account.";
  assert.throws(() => assertAcceptance(fixture, output));
});
