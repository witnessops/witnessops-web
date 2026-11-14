import { z } from 'zod';
import { FORBIDDEN_INPUT_FIELDS, SAVED_TEXT_NOTE, TOOLS } from './tools.mjs';

function walk(schema, path, problems) {
  if (!schema || schema.type !== 'object') return;
  if (schema.additionalProperties !== false) problems.push(`${path} allows additional properties`);
  const properties = schema.properties || {};
  for (const key of Object.keys(properties)) {
    if (FORBIDDEN_INPUT_FIELDS.includes(key)) problems.push(`${path}.${key} is a forbidden owner field`);
    walk(properties[key], `${path}.${key}`, problems);
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
    walk(json, tool.name, problems);
    const extra = { lesson_id: 'report-or-evidence', text: 'learner text', expected_version: 0, owner: 'forged' };
    if (tool.inputSchema.safeParse(extra).success) problems.push(`${tool.name} accepted an owner field`);
  }
  return problems;
}
