import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const sql = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../db/reconcile-academy-mcp.sql'), 'utf8');

test('academy_mcp grants are reconciled to the allowlist on every run', () => {
  assert.match(sql, /REVOKE ALL ON TABLE public\.%I FROM academy_mcp/);
  assert.match(sql, /REVOKE ALL ON SCHEMA public FROM academy_mcp/);
  assert.match(sql, /GRANT SELECT, INSERT ON TABLE public\.academy_identities TO academy_mcp/);
  assert.match(sql, /GRANT SELECT, INSERT, UPDATE ON TABLE public\.academy_lesson_drafts TO academy_mcp/);
  assert.equal(sql.includes('academy_sessions'), false);
  assert.equal(/GRANT\s+(SELECT,\s*)?DELETE/i.test(sql), false);
  assert.match(sql, /current_database\(\)/);
});
