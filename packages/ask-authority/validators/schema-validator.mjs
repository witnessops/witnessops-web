// witnessops-draft2020-subset-validator 1.0.0
// Deterministic, fail-closed validator for the bounded schema vocabulary used by Ask authority V1.

import fs from "node:fs";

export const TOOL_NAME = "witnessops-draft2020-subset-validator";
export const TOOL_VERSION = "1.0.0";

const SUPPORTED_KEYWORDS = new Set([
  "$schema", "$id", "type", "const", "enum", "properties", "required",
  "additionalProperties", "items", "minItems", "maxItems", "uniqueItems",
  "minLength", "maxLength", "pattern", "anyOf",
]);

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function typeOf(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (Number.isFinite(value) && typeof value === "number") return "number";
  return typeof value;
}

function inspectSchema(schema, path, errors) {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
    errors.push(`${path}:schema_not_object`);
    return;
  }
  for (const keyword of Object.keys(schema)) {
    if (!SUPPORTED_KEYWORDS.has(keyword)) errors.push(`${path}:unsupported_keyword:${keyword}`);
  }
  if (schema.properties) {
    if (!schema.properties || typeof schema.properties !== "object" || Array.isArray(schema.properties)) {
      errors.push(`${path}:properties_not_object`);
    } else {
      for (const [name, child] of Object.entries(schema.properties)) inspectSchema(child, `${path}/properties/${name}`, errors);
    }
  }
  if (schema.items) inspectSchema(schema.items, `${path}/items`, errors);
  if (schema.anyOf) {
    if (!Array.isArray(schema.anyOf) || schema.anyOf.length < 2) errors.push(`${path}:invalid_anyOf`);
    else schema.anyOf.forEach((child, index) => inspectSchema(child, `${path}/anyOf/${index}`, errors));
  }
  if (schema.additionalProperties !== undefined && schema.additionalProperties !== false) {
    errors.push(`${path}:additionalProperties_must_be_false`);
  }
}

function validateValue(schema, value, path, errors) {
  if (schema.anyOf) {
    const candidates = schema.anyOf.map((candidate) => {
      const candidateErrors = [];
      validateValue(candidate, value, path, candidateErrors);
      return candidateErrors;
    });
    if (!candidates.some((candidateErrors) => candidateErrors.length === 0)) errors.push(`${path}:anyOf_no_match`);
    return;
  }

  if (schema.type && typeOf(value) !== schema.type) {
    errors.push(`${path}:type_expected_${schema.type}_got_${typeOf(value)}`);
    return;
  }
  if (Object.hasOwn(schema, "const") && stable(value) !== stable(schema.const)) errors.push(`${path}:const_mismatch`);
  if (schema.enum && !schema.enum.some((entry) => stable(entry) === stable(value))) errors.push(`${path}:enum_mismatch`);

  if (typeof value === "string") {
    const length = Array.from(value).length;
    if (schema.minLength !== undefined && length < schema.minLength) errors.push(`${path}:minLength`);
    if (schema.maxLength !== undefined && length > schema.maxLength) errors.push(`${path}:maxLength`);
    if (schema.pattern !== undefined) {
      let expression;
      try { expression = new RegExp(schema.pattern, "u"); } catch { errors.push(`${path}:invalid_pattern`); return; }
      if (!expression.test(value)) errors.push(`${path}:pattern_mismatch`);
    }
  }

  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) errors.push(`${path}:minItems`);
    if (schema.maxItems !== undefined && value.length > schema.maxItems) errors.push(`${path}:maxItems`);
    if (schema.uniqueItems) {
      const seen = new Set();
      for (const entry of value) {
        const key = stable(entry);
        if (seen.has(key)) errors.push(`${path}:duplicate_item`);
        seen.add(key);
      }
    }
    if (schema.items) value.forEach((entry, index) => validateValue(schema.items, entry, `${path}/${index}`, errors));
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const required = schema.required || [];
    required.forEach((key) => { if (!Object.hasOwn(value, key)) errors.push(`${path}:required_missing:${key}`); });
    const properties = schema.properties || {};
    for (const key of Object.keys(value).sort()) {
      if (Object.hasOwn(properties, key)) validateValue(properties[key], value[key], `${path}/${key}`, errors);
      else if (schema.additionalProperties === false) errors.push(`${path}:additional_property:${key}`);
    }
  }
}

export function validate(schema, value) {
  const errors = [];
  inspectSchema(schema, "$schema", errors);
  if (errors.length === 0) validateValue(schema, value, "$", errors);
  return errors.sort();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.length !== 4) {
    process.stderr.write(`usage: ${process.argv[1]} SCHEMA JSON\n`);
    process.exit(2);
  }
  let schema;
  let value;
  try {
    schema = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
    value = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
  } catch (error) {
    process.stderr.write(`parse_error:${error.message}\n`);
    process.exit(1);
  }
  const errors = validate(schema, value);
  if (errors.length) {
    process.stderr.write(`${errors.join("\n")}\n`);
    process.exit(1);
  }
  process.stdout.write(`${TOOL_NAME} ${TOOL_VERSION} PASS ${process.argv[3]}\n`);
}
