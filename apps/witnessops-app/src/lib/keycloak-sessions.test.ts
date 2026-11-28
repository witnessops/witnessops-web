import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import type { Pool, PoolClient } from "pg";
import { loadKeycloakSessionCodec } from "./keycloak-session-codec";
import { KeycloakSessionStore, PostgresKeycloakSessionRepository, type KeycloakSessionRecord,
  type KeycloakSessionRepository, type KeycloakSessionSnapshot, type KeycloakSessionProvider } from "./keycloak-sessions";

const issuer = "https://idp.example.test/realms/test";
const subject = "b4d07c5f-81c4-44be-b261-998302103b40";
const userId = "fe264a49-7264-46d2-8f25-adc9a4cc9c97";
const tokens = { id_token: "id.synthetic", access_token: "access.synthetic", refresh_token: "refresh.synthetic" };
const now = new Date("2026-11-25T12:00:00.000Z");

class MemoryRepository implements KeycloakSessionRepository {
  linked = true;
  row: KeycloakSessionRecord | null = null;
  tombstoned = false;
  changeRevisionBeforeConditionalRevoke = false;
  async insert(session: KeycloakSessionRecord): Promise<boolean> {
    if (!this.linked) return false;
    this.row = { ...session };
    return true;
  }
  async findActive(hash: string, at: Date): Promise<KeycloakSessionRecord | null> {
    return this.row && !this.tombstoned && this.row.tokenHash === hash && this.row.expiresAt > at
      ? { ...this.row } : null;
  }
  async updateCAS(session: KeycloakSessionSnapshot, ciphertext: string, at: Date): Promise<boolean> {
    if (!this.row || this.tombstoned || this.row.tokenHash !== session.tokenHash
      || this.row.revision !== session.revision || this.row.expiresAt <= at) return false;
    this.row = { ...this.row, tokensCiphertext: ciphertext, revision: this.row.revision + 1 };
    return true;
  }
  async revoke(hash: string, expectedRevision?: number): Promise<KeycloakSessionRecord | null> {
    if (!this.row || this.tombstoned || this.row.tokenHash !== hash) return null;
    if (this.changeRevisionBeforeConditionalRevoke && expectedRevision !== undefined) {
      this.changeRevisionBeforeConditionalRevoke = false;
      this.row = { ...this.row, revision: this.row.revision + 1 };
    }
    if (expectedRevision !== undefined && this.row.revision !== expectedRevision) return null;
    const before = { ...this.row };
    this.tombstoned = true;
    this.row = { ...this.row, tokensCiphertext: "", revision: this.row.revision + 1 };
    return before;
  }
}

async function setup() {
  const directory = mkdtempSync(join(tmpdir(), "wops-keycloak-store-"));
  const file = join(directory, "keyring.json");
  writeFileSync(file, JSON.stringify({ active: "one", keys: { one: randomBytes(32).toString("base64") } }), { mode: 0o600 });
  const codec = loadKeycloakSessionCodec(file, { issuer, clientId: "app-test" });
  const repository = new MemoryRepository();
  const store = new KeycloakSessionStore(repository, codec, () => now);
  const created = await store.create({ issuer, subject, userId, tokens,
    expiresAt: new Date(now.getTime() + 3_600_000) });
  return { directory, codec, repository, store, created };
}

const active: KeycloakSessionProvider = {
  introspect: async () => ({ status: "active", issuer, subject }),
  refresh: async () => { throw new Error("unexpected refresh"); },
};

test("session uses only a random cookie hash at rest and retains real Keycloak sub", async () => {
  const fixture = await setup();
  try {
    assert.match(fixture.created.cookieToken, /^[A-Za-z0-9_-]{43}$/);
    assert.equal(fixture.repository.row?.tokenHash.length, 64);
    assert.equal(fixture.repository.row?.sessionId, `session_${fixture.repository.row?.tokenHash}`);
    assert.equal(fixture.repository.row?.subject, subject);
    assert.equal(JSON.stringify(fixture.repository.row).includes(fixture.created.cookieToken), false);
    assert.equal(JSON.stringify(fixture.repository.row).includes(tokens.refresh_token), false);
    assert.deepEqual(await fixture.store.load(fixture.created.cookieToken, active), {
      status: "authenticated", session: fixture.created.session,
      profile: { email: null, displayName: null },
    });
    assert.deepEqual(await fixture.store.loadBySessionId(fixture.created.session.sessionId, active), {
      status: "authenticated", session: fixture.created.session,
      profile: { email: null, displayName: null },
    });
    assert.deepEqual(await fixture.store.loadBySessionId("session_invalid", active), { status: "unauthenticated" });
    assert.deepEqual(await fixture.store.load(fixture.created.cookieToken, {
      introspect: async () => ({ status: "active", issuer, subject,
        email: "verified@example.test", displayName: "Current Name" }),
      refresh: async () => ({ status: "unavailable" }),
    }), { status: "authenticated", session: fixture.created.session,
      profile: { email: "verified@example.test", displayName: "Current Name" } });
    assert.deepEqual(await fixture.store.load("not-a-cookie", active), { status: "unauthenticated" });
  } finally { rmSync(fixture.directory, { recursive: true, force: true }); }
});

test("definitively inactive token refreshes with CAS and only the same issuer and subject", async () => {
  const fixture = await setup();
  try {
    const provider: KeycloakSessionProvider = {
      introspect: async () => ({ status: "inactive" }),
      refresh: async () => ({ status: "ok", issuer, subject,
        tokens: { ...tokens, access_token: "access.rotated", refresh_token: "refresh.rotated" } }),
    };
    const result = await fixture.store.load(fixture.created.cookieToken, provider);
    assert.equal(result.status, "authenticated");
    assert.equal(fixture.repository.row?.revision, 2);
    assert.equal(fixture.codec.open(fixture.repository.row!.tokensCiphertext, fixture.repository.row!).tokens.refresh_token, "refresh.rotated");
    const mismatch: KeycloakSessionProvider = {
      introspect: async () => ({ status: "active", issuer, subject: "different" }),
      refresh: async () => ({ status: "unavailable" }),
    };
    assert.deepEqual(await fixture.store.load(fixture.created.cookieToken, mismatch), { status: "unauthenticated" });
    assert.equal(fixture.repository.tombstoned, true);
  } finally { rmSync(fixture.directory, { recursive: true, force: true }); }
});

test("provider uncertainty preserves session; invalid grant and tamper revoke it", async () => {
  const first = await setup();
  try {
    assert.deepEqual(await first.store.load(first.created.cookieToken, {
      introspect: async () => ({ status: "unavailable" }), refresh: async () => ({ status: "unavailable" }),
    }), { status: "unavailable" });
    assert.equal(first.repository.tombstoned, false);
    assert.deepEqual(await first.store.load(first.created.cookieToken, {
      introspect: async () => ({ status: "inactive" }),
      refresh: async () => ({ status: "ok", issuer, subject,
        tokens: { ...tokens, refresh_token: "" } }),
    }), { status: "unavailable" });
    assert.equal(first.repository.tombstoned, false);
    assert.deepEqual(await first.store.load(first.created.cookieToken, {
      introspect: async () => ({ status: "inactive" }), refresh: async () => ({ status: "invalid_grant" }),
    }), { status: "unauthenticated" });
    assert.equal(first.repository.tombstoned, true);
  } finally { rmSync(first.directory, { recursive: true, force: true }); }
  const second = await setup();
  try {
    second.repository.row!.tokensCiphertext += "tamper";
    assert.deepEqual(await second.store.load(second.created.cookieToken, active), { status: "unauthenticated" });
    assert.equal(second.repository.tombstoned, true);
  } finally { rmSync(second.directory, { recursive: true, force: true }); }
});

test("stale invalid_grant cannot revoke a concurrently refreshed session", async () => {
  const fixture = await setup();
  try {
    fixture.repository.changeRevisionBeforeConditionalRevoke = true;
    let calls = 0;
    const provider: KeycloakSessionProvider = {
      introspect: async () => ++calls === 1
        ? { status: "inactive" } : { status: "active", issuer, subject },
      refresh: async () => ({ status: "invalid_grant" }),
    };
    const result = await fixture.store.load(fixture.created.cookieToken, provider);
    assert.equal(result.status, "authenticated");
    assert.equal(fixture.repository.tombstoned, false);
    assert.equal(calls, 2);
  } finally { rmSync(fixture.directory, { recursive: true, force: true }); }
});

test("logout revokes before returning the ID token hint, and cannot be repeated", async () => {
  const fixture = await setup();
  try {
    assert.equal(await fixture.store.revoke(fixture.created.cookieToken), tokens.id_token);
    assert.equal(fixture.repository.tombstoned, true);
    assert.deepEqual(await fixture.store.load(fixture.created.cookieToken, active), { status: "unauthenticated" });
    assert.equal(await fixture.store.revoke(fixture.created.cookieToken), null);
  } finally { rmSync(fixture.directory, { recursive: true, force: true }); }
});

test("unlinked identities and excessive local lifetimes fail before a cookie is issued", async () => {
  const fixture = await setup();
  try {
    fixture.repository.linked = false;
    await assert.rejects(fixture.store.create({ issuer, subject, userId, tokens,
      expiresAt: new Date(now.getTime() + 3_600_000) }), /not linked/);
    await assert.rejects(fixture.store.create({ issuer, subject, userId, tokens,
      expiresAt: new Date(now.getTime() + 13 * 3_600_000) }), /binding is invalid/);
  } finally { rmSync(fixture.directory, { recursive: true, force: true }); }
});

test("caller-owned SQL transaction keeps all session queries on its client", async () => {
  const fixture = await setup();
  try {
    const row = fixture.repository.row!;
    const databaseRow = { token_hash: row.tokenHash, session_id: row.sessionId,
      issuer: row.issuer, subject: row.subject, user_id: row.userId,
      tokens_ciphertext: row.tokensCiphertext, revision: row.revision, expires_at: row.expiresAt };
    const sql: string[] = [];
    const client = { query: async (statement: string) => {
      sql.push(statement);
      if (statement.startsWith("SELECT s.token_hash")) return { rows: [databaseRow], rowCount: 1 };
      if (statement.startsWith("SELECT issuer,session_id")) return {
        rows: [{ issuer: row.issuer, session_id: row.sessionId }], rowCount: 1,
      };
      if (statement.startsWith("SELECT token_hash,session_id")) return { rows: [databaseRow], rowCount: 1 };
      return { rows: [], rowCount: 1 };
    } } as unknown as PoolClient;
    const repository = new PostgresKeycloakSessionRepository(client, { callerTransaction: true });
    assert.equal((await repository.findActive(row.tokenHash, now))?.sessionId, row.sessionId);
    assert.equal(await repository.updateCAS(row, row.tokensCiphertext, now), true);
    assert.equal((await repository.revoke(row.tokenHash, row.revision))?.subject, subject);
    assert.equal(sql.some(statement => statement === "BEGIN" || statement === "COMMIT" || statement === "ROLLBACK"), false);
    assert.equal(sql.some(statement => statement.includes("pg_advisory_xact_lock")), true);
    assert.equal(sql.some(statement => statement.includes("INSERT INTO revoked_sessions")), true);
    const pooledSql: string[] = [];
    const pooledClient = { query: async (statement: string) => {
      pooledSql.push(statement);
      if (statement.startsWith("SELECT issuer,session_id")) return {
        rows: [{ issuer: row.issuer, session_id: row.sessionId }], rowCount: 1,
      };
      if (statement.startsWith("SELECT token_hash,session_id")) return { rows: [databaseRow], rowCount: 1 };
      return { rows: [], rowCount: 1 };
    }, release: () => { pooledSql.push("RELEASE"); } } as unknown as PoolClient;
    const pool = { connect: async () => pooledClient } as unknown as Pool;
    await new PostgresKeycloakSessionRepository(pool).revoke(row.tokenHash);
    assert.deepEqual(pooledSql.filter(statement => ["BEGIN", "COMMIT", "ROLLBACK", "RELEASE"].includes(statement)),
      ["BEGIN", "COMMIT", "RELEASE"]);
  } finally { rmSync(fixture.directory, { recursive: true, force: true }); }
});
