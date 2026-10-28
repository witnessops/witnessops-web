import test from "node:test";
import assert from "node:assert/strict";
import type { Pool } from "pg";
import { ApiError } from "../errors";
import { resolveIdentity, type Identity } from "./identity";

const identity: Identity = {
  provider: "workos",
  issuer: "https://api.workos.com/user_management/client_fixture",
  subject: "user_a",
  email: "user_a@example.test",
  displayName: "User A",
};

function scriptedPool(
  stored: { id: string; status: string; display_name: string | null; verified_email_snapshot: string | null } | null,
  raced?: typeof stored,
  locked?: typeof stored,
) {
  const sql: string[] = [];
  let sawAdvisory = false;
  const client = {
    async query(text: string) {
      sql.push(text.replace(/\s+/g, " ").trim());
      if (text === "BEGIN" || text === "COMMIT" || text === "ROLLBACK") return { rows: [], rowCount: 0 };
      if (text.includes("pg_advisory_xact_lock")) { sawAdvisory = true; return { rows: [], rowCount: 0 }; }
      if (text.includes("FROM identity_mappings")) {
        const row = text.includes("FOR UPDATE") && locked !== undefined
          ? locked
          : sawAdvisory && raced !== undefined
            ? raced
            : stored;
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

test("a profile that becomes disabled under the row lock is not rewritten", async () => {
  const { pool, sql } = scriptedPool(
    { ...row, display_name: "Old" },
    undefined,
    { ...row, status: "disabled" },
  );
  await assert.rejects(resolveIdentity(pool, identity), (error: unknown) => error instanceof ApiError && error.status === 403);
  assert.equal(sql.some(query => query.includes("FOR UPDATE OF u")), true);
  assert.equal(sql.some(query => query.includes("pg_advisory_xact_lock")), false);
  assert.equal(sql.some(query => query.startsWith("UPDATE") || query.startsWith("INSERT")), false);
});

test("a sign-in that loses the create race to a disabled account is not rewritten", async () => {
  const { pool, sql } = scriptedPool(null, { ...row, status: "disabled" });
  await assert.rejects(resolveIdentity(pool, identity), (error: unknown) => error instanceof ApiError && error.status === 403);
  assert.equal(sql.some(query => query.includes("pg_advisory_xact_lock")), true);
  assert.equal(sql.some(query => query.includes("FOR UPDATE OF u")), true);
  assert.equal(sql.some(query => query.startsWith("INSERT") || query.startsWith("UPDATE")), false);
});

test("a changed name and email locks once and writes both columns", async () => {
  const { pool, sql } = scriptedPool({ ...row, display_name: "Old", verified_email_snapshot: "old@example.test" });
  const user = await resolveIdentity(pool, identity);
  assert.equal(user.id, row.id);
  assert.equal(user.verifiedEmail, true);
  assert.equal(sql.filter(query => query.includes("FOR UPDATE OF u")).length, 1);
  assert.equal(sql.filter(query => query.startsWith("UPDATE")).length, 1);
  assert.equal(sql.filter(query => query.startsWith("INSERT INTO identity_mappings")).length, 1);
  assert.equal(sql.filter(query => query.startsWith("INSERT INTO users")).length, 0);
});

test("a create race that finds a different profile updates it instead of inserting another user", async () => {
  const { pool, sql } = scriptedPool(null, { ...row, display_name: "Old", verified_email_snapshot: identity.email });
  assert.equal((await resolveIdentity(pool, identity)).id, row.id);
  assert.equal(sql.some(query => query.includes("pg_advisory_xact_lock")), true);
  assert.equal(sql.filter(query => query.startsWith("INSERT INTO users")).length, 0);
  assert.equal(sql.filter(query => query.startsWith("UPDATE")).length, 1);
  assert.equal(sql.filter(query => query.startsWith("INSERT INTO identity_mappings")).length, 0);
});
