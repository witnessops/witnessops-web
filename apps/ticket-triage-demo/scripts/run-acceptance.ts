import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { assertAcceptance } from "../acceptance/assertions.js";
import { createMockProvider } from "../src/mock-provider.js";
import { createOpenAIProvider } from "../src/openai-provider.js";
import { validateTicketInput, validateTicketOutput } from "../src/schema-validator.js";
import { runTicketTriage } from "../src/service.js";
import {
  PINNED_DEMO_MODEL,
  type TicketTriageInput,
  type TriageProvider,
} from "../src/types.js";

const fixtureFiles = [
  "DEMO-001-access-failure.json",
  "DEMO-002-suspected-phishing.json",
  "DEMO-003-performance-issue.json",
  "DEMO-004-prompt-injection.json",
] as const;

async function readFixture(name: string): Promise<TicketTriageInput> {
  const fixtureUrl = new URL(`../fixtures/${name}`, import.meta.url);
  const raw = JSON.parse(
    await readFile(fileURLToPath(fixtureUrl), "utf8"),
  ) as unknown;
  const validation = validateTicketInput(raw);
  if (!validation.ok || !validation.value) {
    throw new Error(`invalid_acceptance_fixture:${name}`);
  }
  return validation.value;
}

function resolveProvider(): TriageProvider {
  const requested = process.env.TICKET_TRIAGE_PROVIDER;
  if (requested === "mock") {
    return createMockProvider();
  }
  if (requested !== "openai") {
    throw new Error("ticket_triage_provider_must_be_explicit");
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("ticket_triage_missing_openai_api_key");
  }
  const model = process.env.TICKET_TRIAGE_MODEL?.trim();
  if (model !== PINNED_DEMO_MODEL) {
    throw new Error("ticket_triage_live_model_must_be_pinned");
  }

  return createOpenAIProvider({ apiKey, model: PINNED_DEMO_MODEL });
}

async function main(): Promise<void> {
  const provider = resolveProvider();
  let passed = 0;
  const failed: string[] = [];

  for (const fixtureFile of fixtureFiles) {
    const fixture = await readFixture(fixtureFile);
    const startedAt = performance.now();
    const output = await runTicketTriage({ rawInput: fixture, provider });
    const durationMs = Math.round(performance.now() - startedAt);

    const outputValidation = validateTicketOutput(output);
    if (!outputValidation.ok) {
      throw new Error(`invalid_acceptance_output:${fixture.ticket_id}`);
    }

    try {
      assertAcceptance(fixture, output);
    } catch (error) {
      const assertionLine =
        error instanceof Error
          ? error.stack?.match(/assertDemo[0-9]+[^\n]*assertions\.ts:([0-9]+)/)?.[1]
          : undefined;
      process.stderr.write(
        `${fixture.ticket_id}\tFAIL\tstatus=${output.result_status}\tfailure=${output.failure?.code ?? "none"}\tassertion_line=${assertionLine ?? "unknown"}\tprovider=${provider.name}\tmodel=${provider.model}\n`,
      );
      failed.push(fixture.ticket_id);
      continue;
    }
    passed += 1;
    process.stdout.write(
      `${fixture.ticket_id}\tPASS\tprovider=${provider.name}\tmodel=${provider.model}\tduration_ms=${durationMs}\n`,
    );
  }

  if (failed.length > 0) {
    throw new Error(
      `acceptance_failed:${failed.join(",")}:passed=${passed}:total=${fixtureFiles.length}`,
    );
  }

  process.stdout.write(
    `ACCEPTANCE_RESULT=PASS passed=${passed} total=${fixtureFiles.length} provider=${provider.name} model=${provider.model}\n`,
  );
}

await main();
