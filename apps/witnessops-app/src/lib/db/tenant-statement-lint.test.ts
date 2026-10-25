import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/**
 * Scans SQL string literals in the tenant-statement files. It does not execute SQL
 * and does not see statements assembled from fragments.
 *
 * `workspaces` is omitted: its primary key is the workspace id (`WHERE id=$1`) and
 * it has no workspace_id column. `users` is account identity, not a workspace table.
 *
 * Token-hash lookups are omitted: the secret is the capability, and the workspace
 * is known only after that row is read. Later statements in the same flow bind it.
 */
const TENANT_WITH_WORKSPACE = [
  'workspace_invitations',
  'memberships',
  'report_shares',
  'report_share_deliveries',
  'server_check_executions',
  'runs',
  'assets',
  'linux_check_sources',
];
const TENANT_WITHOUT_WORKSPACE_COLUMN = [
  'report_share_access',
  'report_share_unlocks',
  'report_share_names',
];

// Unavoidable: this read is what discovers the workspace. The verified recipient
// email is the gate. The follow-up read in the same function binds workspace_id.
const ALLOWED: { file: string; includes: string }[] = [
  {
    file: 'members.ts',
    includes: 'SELECT workspace_id FROM workspace_invitations WHERE id=$1 AND recipient=$2',
  },
];

const FILES = [
  'members.ts',
  'shares.ts',
  'share-access.ts',
  'share-passwords.ts',
  '../server-check/store.ts',
];

function stringsIn(source: string): string[] {
  const found: string[] = [];
  for (let i = 0; i < source.length; i++) {
    const quote = source[i];
    if (quote !== "'" && quote !== '"' && quote !== '`') continue;
    let value = '';
    let j = i + 1;
    for (; j < source.length; j++) {
      const char = source[j];
      if (char === '\\') {
        value += source[j + 1] ?? '';
        j++;
        continue;
      }
      if (quote === '`' && char === '$' && source[j + 1] === '{') {
        const end = source.indexOf('}', j + 2);
        if (end < 0) break;
        value += '?';
        j = end;
        continue;
      }
      if (char === quote) break;
      value += char;
    }
    if (j < source.length && source[j] === quote) {
      found.push(value);
      i = j;
    }
  }
  return found;
}

function normalize(sql: string): string {
  return sql.replace(/\s+/g, ' ').trim();
}

function mentions(sql: string, table: string): boolean {
  return new RegExp(`\\b${table}\\b`, 'i').test(sql);
}

export function needsWorkspacePredicate(sql: string): boolean {
  const text = normalize(sql);
  if (!/^(select|insert|update|delete|with)\b/i.test(text)) return false;
  const byId = /\b(id|share_id|run_id)\s*=\s*\$\d+/i.test(text);
  const child = TENANT_WITHOUT_WORKSPACE_COLUMN.some(table => mentions(text, table));
  const tenant = TENANT_WITH_WORKSPACE.some(table => mentions(text, table));
  if (child && (byId || /^(insert|update|delete)\b/i.test(text))) return true;
  return tenant && byId && /^(select|update|delete|with)\b/i.test(text);
}

function whereClauses(sql: string): string[] {
  return normalize(sql).split(/\bwhere\b/i).slice(1);
}

export function hasWorkspacePredicate(sql: string): boolean {
  return whereClauses(sql).some(clause => /\bworkspace_id\b/i.test(clause));
}

function sqlStatements(file: string, source: string): string[] {
  return stringsIn(source).map(normalize).filter(sql => /^(select|insert|update|delete|with)\b/i.test(sql));
}

function allowed(file: string, sql: string): boolean {
  return ALLOWED.some(entry => file.endsWith(entry.file) && sql.includes(normalize(entry.includes)));
}

test('by-id tenant statements bind workspace_id, with the invitation locator as the only exception', () => {
  const gaps: string[] = [];
  const matchedAllow = new Set<string>();
  for (const file of FILES) {
    const source = readFileSync(new URL(file, import.meta.url), 'utf8');
    for (const sql of sqlStatements(file, source)) {
      if (!needsWorkspacePredicate(sql)) continue;
      if (hasWorkspacePredicate(sql)) continue;
      const name = file.slice(file.lastIndexOf('/') + 1);
      if (allowed(name, sql)) {
        matchedAllow.add(name + ' ' + normalize(ALLOWED.find(entry => entry.file === name)!.includes));
        continue;
      }
      gaps.push(`${file}: ${sql}`);
    }
  }
  assert.deepEqual(gaps, []);
  assert.equal(matchedAllow.size, ALLOWED.length);
});

test('the predicate check rejects an unbound by-id update and an unbound child insert', () => {
  const update = "UPDATE report_shares SET state='revoked' WHERE id=$1";
  assert.equal(needsWorkspacePredicate(update), true);
  assert.equal(hasWorkspacePredicate(update), false);
  const insert = 'INSERT INTO report_share_unlocks(token_hash,share_id,access_version,expires_at) VALUES($1,$2,$3,$4)';
  assert.equal(needsWorkspacePredicate(insert), true);
  assert.equal(hasWorkspacePredicate(insert), false);
  const bound = 'UPDATE report_shares SET state=\'revoked\' WHERE id=$1 AND workspace_id=$2';
  assert.equal(hasWorkspacePredicate(bound), true);
});
