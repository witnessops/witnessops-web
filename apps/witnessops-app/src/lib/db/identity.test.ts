import test from "node:test";
import assert from "node:assert/strict";
import type { Pool } from "pg";
import { ApiError } from "../errors";
import { linkKeycloakIdentity, linkKeycloakIdentityFromWorkosSession, resolveIdentity, type Identity, type KeycloakIdentity } from "./identity";
import { sessionKey } from "./sessions";

const identity: Identity = {
  provider: "workos",
  issuer: "https://api.workos.com/user_management/client_fixture",
  subject: "user_a",
  email: "user_a@example.test",
  displayName: "User A",
};

function scriptedPool(stored: { id: string; status: string; display_name: string | null; verified_email_snapshot: string | null } | null, raced?: typeof stored) {
  const sql: string[] = [];
  let sawAdvisory = false;
  const client = {
    async query(text: string) {
      sql.push(text.replace(/\s+/g, " ").trim());
      if (text === "BEGIN" || text === "COMMIT" || text === "ROLLBACK") return { rows: [], rowCount: 0 };
      if (text.includes("pg_advisory_xact_lock")) { sawAdvisory = true; return { rows: [], rowCount: 0 }; }
      if (text.includes("FROM identity_mappings")) {
        const row = sawAdvisory && raced !== undefined ? raced : stored;
        return { rows: row ? [row] : [], rowCount: row ? 1 : 0 };
      }
      if (text.startsWith("INSERT") || text.startsWith("UPDATE")) return { rows: [], rowCount: 1 };
      throw new Error(text);
    },
    release() {},
  };
  return { pool: { connect: async () => client } as unknown as Pool, sql };
}

const row = { id: "11111111-1111-4111-8111-111111111111", status: "active", display_name: "User A", verified_email_snapshot: "user_a@example.test" };
const keycloak: KeycloakIdentity = { provider: "keycloak", issuer: "https://auth.example.test/realms/academy", subject: "academy-user-1", email: identity.email, displayName: "Academy User" };

function linkPool(options: { status?: string; subject?: string; conflictUserId?: string; user?: boolean;
  revoked?: boolean; workosMapped?: boolean } = {}) {
  const sql: string[] = [];
  const client = {
    async query(text: string) {
      sql.push(text.replace(/\s+/g, " ").trim());
      if (["BEGIN", "COMMIT", "ROLLBACK"].includes(text)) return { rows: [], rowCount: 0 };
      if (text.includes("pg_advisory_xact_lock_shared")) return { rows: [], rowCount: 1 };
      if (text.startsWith("SELECT 1 FROM revoked_sessions")) return { rows: options.revoked ? [{ "?column?": 1 }] : [], rowCount: options.revoked ? 1 : 0 };
      if (text.startsWith("SELECT id, status, display_name FROM users")) return { rows: options.user === false ? [] : [{ id: row.id, status: options.status ?? "active", display_name: row.display_name }], rowCount: options.user === false ? 0 : 1 };
      if (text.startsWith("SELECT 1 FROM identity_mappings")) return { rows: options.workosMapped === false ? [] : [{ "?column?": 1 }], rowCount: options.workosMapped === false ? 0 : 1 };
      if (text.startsWith("SELECT subject FROM identity_mappings")) return { rows: options.subject ? [{ subject: options.subject }] : [], rowCount: options.subject ? 1 : 0 };
      if (text.startsWith("INSERT INTO identity_mappings")) return { rows: options.conflictUserId ? [] : [{ user_id: row.id }], rowCount: options.conflictUserId ? 0 : 1 };
      if (text.startsWith("SELECT user_id FROM identity_mappings")) return { rows: options.conflictUserId ? [{ user_id: options.conflictUserId }] : [], rowCount: options.conflictUserId ? 1 : 0 };
      throw new Error(text);
    },
    release() {},
  };
  return { pool: { connect: async () => client } as unknown as Pool, sql };
}

test("unchanged identity does not take the row lock or write", async () => {
  const { pool, sql } = scriptedPool(row);
  const user = await resolveIdentity(pool, identity);
  assert.equal(user.id, row.id);
  assert.equal(sql.some(query => query.includes("FOR UPDATE")), false);
  assert.equal(sql.some(query => query.includes("pg_advisory_xact_lock")), false);
  assert.equal(sql.some(query => query.startsWith("UPDATE") || query.startsWith("INSERT")), false);
});

test("changed identity locks the user row and writes only the changed column", async () => {
  const renamed = scriptedPool({ ...row, display_name: "Old" });
  assert.equal((await resolveIdentity(renamed.pool, identity)).id, row.id);
  assert.equal(renamed.sql.some(query => query.includes("FOR UPDATE OF u")), true);
  assert.equal(renamed.sql.filter(query => query.startsWith("UPDATE")).length, 1);
  assert.equal(renamed.sql.some(query => query.startsWith("INSERT")), false);

  const remailed = scriptedPool({ ...row, verified_email_snapshot: "old@example.test" });
  await resolveIdentity(remailed.pool, identity);
  assert.equal(remailed.sql.some(query => query.includes("FOR UPDATE OF u")), true);
  assert.equal(remailed.sql.some(query => query.startsWith("UPDATE")), false);
  assert.equal(remailed.sql.some(query => query.startsWith("INSERT INTO identity_mappings")), true);
});

test("first sign-in creates one user and a raced duplicate reads the existing row", async () => {
  const created = scriptedPool(null);
  const user = await resolveIdentity(created.pool, identity);
  assert.match(user.id, /^[0-9a-f-]{36}$/);
  assert.equal(created.sql.some(query => query.includes("pg_advisory_xact_lock")), true);
  assert.equal(created.sql.filter(query => query.startsWith("INSERT INTO users")).length, 1);
  assert.equal(created.sql.filter(query => query.startsWith("INSERT INTO identity_mappings")).length, 1);

  const raced = scriptedPool(null, row);
  assert.equal((await resolveIdentity(raced.pool, identity)).id, row.id);
  assert.equal(raced.sql.some(query => query.startsWith("INSERT")), false);
});

test("disabled account is rejected under the row lock and is not rewritten", async () => {
  const { pool, sql } = scriptedPool({ ...row, status: "disabled" });
  await assert.rejects(resolveIdentity(pool, identity), (error: unknown) => error instanceof ApiError && error.status === 403);
  assert.equal(sql.some(query => query.includes("FOR UPDATE OF u")), true);
  assert.equal(sql.some(query => query.startsWith("UPDATE") || query.startsWith("INSERT")), false);
});

test("Keycloak sign-in requires an explicit mapping, even with the same email", async () => {
  const queried: unknown[][] = [];
  const pool = { query: async (_sql: string, values: unknown[]) => { queried.push(values); return { rows: [] }; } } as unknown as Pool;
  await assert.rejects(resolveIdentity(pool, keycloak), (error: unknown) => error instanceof ApiError && error.status === 401);
  assert.deepEqual(queried, [["keycloak", keycloak.issuer, keycloak.subject]]);
});

test("Keycloak resolution uses only a linked active internal account", async () => {
  const pool = { query: async () => ({ rows: [row] }) } as unknown as Pool;
  assert.equal((await resolveIdentity(pool, keycloak)).id, row.id);
  const inactive = { query: async () => ({ rows: [{ ...row, status: "disabled" }] }) } as unknown as Pool;
  await assert.rejects(resolveIdentity(inactive, keycloak), (error: unknown) => error instanceof ApiError && error.status === 403);
});

test("Keycloak linking locks an active existing user and refuses a claimed subject", async () => {
  const linked = linkPool();
  assert.equal((await linkKeycloakIdentity(linked.pool, row.id, keycloak)).id, row.id);
  assert.ok(linked.sql.some(query => query.includes("FROM users WHERE id=$1 FOR UPDATE")));
  assert.ok(linked.sql.some(query => query.includes("ON CONFLICT (provider,issuer,subject) DO NOTHING")));
  assert.equal(linked.sql.some(query => query.startsWith("INSERT INTO users")), false);

  const collision = linkPool({ conflictUserId: "22222222-2222-4222-8222-222222222222" });
  await assert.rejects(linkKeycloakIdentity(collision.pool, row.id, keycloak), (error: unknown) => error instanceof ApiError && error.status === 409);
  assert.ok(collision.sql.includes("ROLLBACK"));
});

test("Keycloak linking is idempotent and rejects a second subject or inactive user", async () => {
  const repeated = linkPool({ subject: keycloak.subject });
  assert.equal((await linkKeycloakIdentity(repeated.pool, row.id, keycloak)).id, row.id);
  assert.equal(repeated.sql.some(query => query.startsWith("INSERT")), false);

  const different = linkPool({ subject: "other-academy-user" });
  await assert.rejects(linkKeycloakIdentity(different.pool, row.id, keycloak), (error: unknown) => error instanceof ApiError && error.status === 409);
  assert.equal(different.sql.some(query => query.startsWith("INSERT")), false);

  const inactive = linkPool({ status: "disabled" });
  await assert.rejects(linkKeycloakIdentity(inactive.pool, row.id, keycloak), (error: unknown) => error instanceof ApiError && error.status === 403);
  assert.equal(inactive.sql.some(query => query.startsWith("INSERT")), false);

  const missing = linkPool({ user: false });
  await assert.rejects(linkKeycloakIdentity(missing.pool, row.id, keycloak), (error: unknown) => error instanceof ApiError && error.status === 404);
  assert.equal(missing.sql.some(query => query.startsWith("INSERT")), false);
});

test("WorkOS-bound Keycloak link uses one transaction and rejects revoked or mismatched sessions", async () => {
  const session = sessionKey(identity.issuer, "session_linkfixture", identity.subject);
  const linked = linkPool();
  assert.equal((await linkKeycloakIdentityFromWorkosSession(linked.pool, session, row.id, keycloak)).id, row.id);
  assert.ok(linked.sql.findIndex(query => query.includes("pg_advisory_xact_lock_shared")) < linked.sql.findIndex(query => query.startsWith("INSERT INTO identity_mappings")));
  assert.equal(linked.sql.filter(query => query === "BEGIN").length, 1);
  assert.equal(linked.sql.filter(query => query === "COMMIT").length, 1);

  const revoked = linkPool({ revoked: true });
  await assert.rejects(linkKeycloakIdentityFromWorkosSession(revoked.pool, session, row.id, keycloak),
    (error: unknown) => error instanceof ApiError && error.status === 401);
  assert.equal(revoked.sql.some(query => query.startsWith("INSERT")), false);
  assert.ok(revoked.sql.includes("ROLLBACK"));

  const mismatched = linkPool({ workosMapped: false });
  await assert.rejects(linkKeycloakIdentityFromWorkosSession(mismatched.pool, session, row.id, keycloak),
    (error: unknown) => error instanceof ApiError && error.status === 403);
  assert.equal(mismatched.sql.some(query => query.startsWith("INSERT")), false);
  assert.ok(mismatched.sql.includes("ROLLBACK"));
});

test("Keycloak issuer, subject and target user ID are validated before linking", async () => {
  for (const malformed of [
    { ...keycloak, issuer: "http://auth.example.test/realms/academy" },
    { ...keycloak, issuer: "https://auth.example.test/realms/academy?x=1" },
    { ...keycloak, subject: " academy-user-1" },
    { ...keycloak, subject: "academy-user-1\n" },
  ]) {
    const { pool, sql } = linkPool();
    await assert.rejects(linkKeycloakIdentity(pool, row.id, malformed), (error: unknown) => error instanceof ApiError && error.status === 401);
    assert.deepEqual(sql, []);
  }
  const { pool, sql } = linkPool();
  await assert.rejects(linkKeycloakIdentity(pool, "not-a-uuid", keycloak), (error: unknown) => error instanceof ApiError && error.status === 400);
  assert.deepEqual(sql, []);
});
