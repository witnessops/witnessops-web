import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { validateTicketInput } from "./schema-validator.js";
import type { TicketTriageInput } from "./types.js";

const FIXTURE_FILES = {
  "DEMO-001": "DEMO-001-access-failure.json",
  "DEMO-002": "DEMO-002-suspected-phishing.json",
  "DEMO-003": "DEMO-003-performance-issue.json",
  "DEMO-004": "DEMO-004-prompt-injection.json",
} as const;

export type FixtureId = keyof typeof FIXTURE_FILES;

export const fixtureIds = Object.keys(FIXTURE_FILES) as FixtureId[];

export function isFixtureId(value: string | null): value is FixtureId {
  return Boolean(value && Object.hasOwn(FIXTURE_FILES, value));
}

export async function loadFixture(id: FixtureId): Promise<TicketTriageInput> {
  const fixtureUrl = new URL(`../fixtures/${FIXTURE_FILES[id]}`, import.meta.url);
  const raw = JSON.parse(
    await readFile(fileURLToPath(fixtureUrl), "utf8"),
  ) as unknown;
  const validation = validateTicketInput(raw);
  if (!validation.ok || !validation.value) {
    throw new Error(`ticket_triage_invalid_fixture:${id}`);
  }
  return validation.value;
}
