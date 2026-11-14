import assert from 'node:assert/strict';
import test from 'node:test';
import { z } from 'zod';
import { lintJsonSchema, lintToolSchemas } from '../src/tool-schema-lint.mjs';
import { SAVED_TEXT_NOTE } from '../src/tools.mjs';

test('nested objects, arrays, unions, and local definitions cannot hide an owner field', () => {
  const problems = lintJsonSchema({
    type: 'object',
    additionalProperties: false,
    properties: {
      rows: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: { owner: { type: 'string' } },
        },
      },
      choice: { $ref: '#/$defs/choice' },
    },
    $defs: {
      open: {
        type: 'object',
        properties: { subject: { type: 'string' } },
      },
      choice: {
        anyOf: [
          {
            type: 'object',
            additionalProperties: false,
            properties: { user_id: { type: 'string' } },
          },
          {
            oneOf: [
              {
                type: 'object',
                additionalProperties: false,
                properties: { issuer: { type: 'string' } },
              },
            ],
          },
        ],
      },
    },
  }, 'fixture');
  const text = problems.join('\n');
  assert.match(text, /fixture\.rows\/items\.owner is a forbidden owner field/);
  assert.match(text, /fixture\/\$defs\/open\.subject is a forbidden owner field/);
  assert.match(text, /fixture\/\$defs\/open allows additional properties/);
  assert.match(text, /user_id is a forbidden owner field/);
  assert.match(text, /issuer is a forbidden owner field/);
});

test('a zod array or union that carries an owner field fails the tool lint', () => {
  const tools = [
    {
      name: 'nested_owner',
      description: SAVED_TEXT_NOTE,
      inputSchema: z.object({
        rows: z.array(z.object({ owner_id: z.string() }).strict()),
        choice: z.union([
          z.object({ id: z.string() }).strict(),
          z.object({ note: z.string() }).strict(),
        ]),
      }).strict(),
    },
  ];
  const problems = lintToolSchemas(tools);
  const text = problems.join('\n');
  assert.match(text, /owner_id is a forbidden owner field/);
  assert.match(text, /id is a forbidden owner field/);
  assert.equal(problems.some((problem) => problem.includes('allows additional properties')), false);
});
