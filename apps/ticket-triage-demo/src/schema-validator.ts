import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  Ajv2020,
  type ErrorObject,
  type ValidateFunction,
} from "ajv/dist/2020.js";
import addFormatsModule, { type FormatsPlugin } from "ajv-formats";
import type {
  TicketTriage,
  TicketTriageInput,
  TicketTriageOutput,
} from "./types.js";

type JsonSchema = Record<string, unknown> & {
  $defs?: Record<string, unknown>;
};

function readSchema(relativePath: string): JsonSchema {
  const schemaUrl = new URL(relativePath, import.meta.url);
  return JSON.parse(readFileSync(fileURLToPath(schemaUrl), "utf8")) as JsonSchema;
}

export const inputJsonSchema = readSchema("../schemas/input.schema.json");
export const outputJsonSchema = readSchema("../schemas/output.schema.json");

const triageJsonSchema = outputJsonSchema.$defs?.triage;
if (!triageJsonSchema || typeof triageJsonSchema !== "object") {
  throw new Error("ticket_triage_schema_missing_triage_definition");
}

const PROVIDER_UNSUPPORTED_KEYWORDS = new Set([
  "$id",
  "$schema",
  "format",
  "maxItems",
  "maxLength",
  "maximum",
  "minItems",
  "minLength",
  "minimum",
  "pattern",
  "uniqueItems",
]);

function projectProviderSchema(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(projectProviderSchema);
  }
  if (!value || typeof value !== "object") {
    return value;
  }

  const projected: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (PROVIDER_UNSUPPORTED_KEYWORDS.has(key)) {
      continue;
    }
    if (key === "const") {
      projected.enum = [projectProviderSchema(child)];
      continue;
    }
    projected[key] = projectProviderSchema(child);
  }
  return projected;
}

export const providerTriageJsonSchema = projectProviderSchema(
  triageJsonSchema,
) as Record<string, unknown>;

const ajv = new Ajv2020({
  allErrors: true,
  strict: false,
  validateFormats: true,
});
const addFormats = addFormatsModule as unknown as FormatsPlugin;
addFormats(ajv);

const validateInputSchema = ajv.compile<TicketTriageInput>(inputJsonSchema);
const validateOutputSchema = ajv.compile<TicketTriageOutput>(outputJsonSchema);
const validateTriageSchema = ajv.compile<TicketTriage>(triageJsonSchema);

export interface SchemaValidationResult<T> {
  ok: boolean;
  value?: T;
  errors: ErrorObject[];
}

function runValidator<T>(
  validator: ValidateFunction<T>,
  value: unknown,
): SchemaValidationResult<T> {
  if (validator(value)) {
    return { ok: true, value, errors: [] };
  }

  return {
    ok: false,
    errors: [...(validator.errors ?? [])],
  };
}

export function validateTicketInput(
  value: unknown,
): SchemaValidationResult<TicketTriageInput> {
  return runValidator(validateInputSchema, value);
}

export function validateTicketOutput(
  value: unknown,
): SchemaValidationResult<TicketTriageOutput> {
  return runValidator(validateOutputSchema, value);
}

export function validateProviderTriage(
  value: unknown,
): SchemaValidationResult<TicketTriage> {
  return runValidator(validateTriageSchema, value);
}

export function hasBoundedLimitError(errors: ErrorObject[]): boolean {
  return errors.some((error) =>
    ["maxLength", "maxItems"].includes(error.keyword),
  );
}

export function summarizeValidationErrors(errors: ErrorObject[]): string[] {
  return errors.slice(0, 6).map((error) => {
    const location = error.instancePath || "/";
    return `${location}:${error.keyword}`;
  });
}
