import { z } from 'zod';
import { FORBIDDEN_INPUT_FIELDS, SAVED_TEXT_NOTE, TOOLS } from './tools.mjs';

const SCHEMA_KEYS = [
  'items',
  'additionalItems',
  'unevaluatedItems',
  'additionalProperties',
  'unevaluatedProperties',
  'contains',
  'propertyNames',
  'if',
  'then',
  'else',
  'not',
  'contentSchema',
];
const SCHEMA_LIST_KEYS = ['prefixItems', 'items', 'anyOf', 'oneOf', 'allOf'];
const SCHEMA_MAP_KEYS = ['$defs', 'definitions', 'patternProperties', 'dependentSchemas'];

function asList(value) {
  if (Array.isArray(value)) return value;
  return null;
}

export function lintJsonSchema(schema, path = 'schema') {
  const problems = [];
  walk(schema, path, problems, new Set());
  return problems;
}

function walk(schema, path, problems, seen) {
  if (!schema || typeof schema !== 'object') return;
  if (Array.isArray(schema)) {
    schema.forEach((child, index) => walk(child, `${path}/${index}`, problems, seen));
    return;
  }
  if (seen.has(schema)) return;
  seen.add(schema);

  const types = Array.isArray(schema.type) ? schema.type : (schema.type ? [schema.type] : []);
  if (types.includes('object') || schema.properties) {
    if (schema.additionalProperties !== false) problems.push(`${path} allows additional properties`);
  }
  if (schema.properties && typeof schema.properties === 'object' && !Array.isArray(schema.properties)) {
    for (const key of Object.keys(schema.properties)) {
      if (FORBIDDEN_INPUT_FIELDS.includes(key)) problems.push(`${path}.${key} is a forbidden owner field`);
      walk(schema.properties[key], `${path}.${key}`, problems, seen);
    }
  }
  for (const key of SCHEMA_KEYS) {
    const child = schema[key];
    if (child && typeof child === 'object') walk(child, `${path}/${key}`, problems, seen);
  }
  for (const key of SCHEMA_LIST_KEYS) {
    const list = asList(schema[key]);
    if (!list) continue;
    list.forEach((child, index) => walk(child, `${path}/${key}/${index}`, problems, seen));
  }
  for (const key of SCHEMA_MAP_KEYS) {
    const map = schema[key];
    if (!map || typeof map !== 'object' || Array.isArray(map)) continue;
    for (const name of Object.keys(map)) walk(map[name], `${path}/${key}/${name}`, problems, seen);
  }
}

export function lintToolSchemas(tools = TOOLS) {
  const problems = [];
  for (const tool of tools) {
    if (!tool.description.includes(SAVED_TEXT_NOTE)) {
      problems.push(`${tool.name} description does not say returned learner text is data, not instructions`);
    }
    let json;
    try {
      json = z.toJSONSchema(tool.inputSchema);
    } catch (error) {
      problems.push(`${tool.name} schema could not be converted: ${error.message}`);
      continue;
    }
    problems.push(...lintJsonSchema(json, tool.name));
    const extra = { lesson_id: 'report-or-evidence', text: 'learner text', expected_version: 0, owner: 'forged' };
    if (tool.inputSchema.safeParse(extra).success) problems.push(`${tool.name} accepted an owner field`);
  }
  return problems;
}
