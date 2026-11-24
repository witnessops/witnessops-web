import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import type { Pool } from "pg";
import {
  consumeKeycloakPreauth, createKeycloakPreauth, keycloakPreauthCookieName,
  keycloakSessionCookieName, matchesKeycloakLinkBinding, workosSessionBindingHash, KEYCLOAK_PREAUTH_MAX_PENDING,
} from "./keycloak-preauth";

const attempt = { state: "s".repeat(43), nonce: "n".repeat(43), codeVerifier: "v".repeat(43) };
const userId = "11111111-1111-4111-8111-111111111111";

test("Keycloak cookies use host-only names and a verified WorkOS session has a stable binding", () => {
  assert.equal(keycloakSessionCookieName("https://app.example.test"), "__Host-wops-keycloak-session");
  assert.equal(keycloakPreauthCookieName("http://127.0.0.1:3020"), "wops-keycloak-preauth");
  assert.throws(() => keycloakPreauthCookieName("http://app.example.test"), /Invalid app origin/);
  const session = { issuer: "https://api.workos.com/user_management/client_fixture", sessionId: "session_one", subject: "user_one" };
  const binding = workosSessionBindingHash(session);
  assert.match(binding, /^[a-f0-9]{64}$/);
  assert.notEqual(binding, workosSessionBindingHash({ ...session, sessionId: "session_two" }));
  assert.notEqual(binding, workosSessionBindingHash({ ...session, subject: "user_two" }));
  const linked = { userId, sessionHash: binding };
  assert.equal(matchesKeycloakLinkBinding(linked, session, userId), true);
  assert.equal(matchesKeycloakLinkBinding(linked, { ...session, sessionId: "session_two" }, userId), false);
  assert.equal(matchesKeycloakLinkBinding(linked, session, "22222222-2222-4222-8222-222222222222"), false);
  assert.equal(matchesKeycloakLinkBinding(linked, { ...session, provider: "keycloak" }, userId), false);
});

test("preauth stores only the token hash and consumes a state exactly once", async () => {
  const statements: string[] = [];
  let row: Record<string, unknown> | null = null;
  let storedHash: string | null = null;
  const query = async (sql: string, values: unknown[] = []) => {
    statements.push(sql);
    if (["BEGIN", "COMMIT", "ROLLBACK"].includes(sql) || sql.includes("pg_advisory_xact_lock")) return { rows: [] };
    if (sql.includes("SELECT count(*)")) return { rows: [{ count: "0" }] };
    if (sql.includes("INSERT INTO keycloak_auth_attempts")) {
      storedHash = values[0] as string;
      row = { purpose: values[1], state: values[2], nonce: values[3], code_verifier: values[4],
        return_path: values[5], bound_user_id: values[6], bound_session_hash: values[7] };
      return { rows: [] };
    }
    if (sql.includes("DELETE FROM keycloak_auth_attempts") && values.length === 0) return { rows: [] };
    if (sql.includes("DELETE FROM keycloak_auth_attempts")) {
      const match = values[0] === storedHash && values[1] === row?.state;
      const consumed = match ? row : null;
      if (match) row = null;
      return { rows: consumed ? [consumed] : [] };
    }
    throw new Error("Unexpected SQL");
  };
  const pool = { query, connect: async () => ({ query, release() {} }) } as unknown as Pool;
  const token = await createKeycloakPreauth(pool, { purpose: "login", attempt, returnPath: "/cli/authorize" });
  assert.match(token, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(storedHash, createHash("sha256").update(token).digest("hex"));
  assert.notEqual(storedHash, token);
  assert.deepEqual(await consumeKeycloakPreauth(pool, token, attempt.state),
    { purpose: "login", attempt, returnPath: "/cli/authorize" });
  assert.equal(await consumeKeycloakPreauth(pool, token, attempt.state), null);
  assert.ok(statements.indexOf("SELECT count(*) AS count FROM keycloak_auth_attempts") < statements.findIndex(sql => sql.includes("INSERT INTO keycloak_auth_attempts")));
  assert.match(statements.find(sql => sql.includes("RETURNING purpose,state"))!, /DELETE FROM keycloak_auth_attempts[\s\S]+expires_at > now\(\)[\s\S]+RETURNING/);
});

test("link preauth requires a bounded internal user and session; redirect targets are fixed", async () => {
  let calls = 0;
  const query = async (sql: string) => { calls += 1; return { rows: sql.includes("SELECT count(*)") ? [{ count: "0" }] : [] }; };
  const pool = { query, connect: async () => ({ query, release() {} }) } as unknown as Pool;
  await assert.rejects(createKeycloakPreauth(pool, { purpose: "link", attempt, returnPath: "/" }), /Invalid Keycloak preauth/);
  await assert.rejects(createKeycloakPreauth(pool, { purpose: "link", attempt, returnPath: "/",
    binding: { userId, sessionHash: "short" } }), /Invalid Keycloak preauth/);
  await assert.rejects(createKeycloakPreauth(pool, { purpose: "login", attempt, returnPath: "https://attacker.test" }), /Invalid Keycloak preauth/);
  await assert.rejects(createKeycloakPreauth(pool, { purpose: "login", attempt, returnPath: "//attacker.test" }), /Invalid Keycloak preauth/);
  assert.equal(calls, 0);
  await createKeycloakPreauth(pool, { purpose: "link", attempt, returnPath: "/",
    binding: { userId, sessionHash: "a".repeat(64) } });
  assert.ok(calls > 1);
  const afterCreate = calls;
  assert.equal(await consumeKeycloakPreauth(pool, "wrong", attempt.state), null);
  assert.equal(calls, afterCreate);
});

test("anonymous attempts stop at the locked global cap without writing a new row", async () => {
  const statements: string[] = [];
  const query = async (sql: string) => {
    statements.push(sql);
    return { rows: sql.includes("SELECT count(*)") ? [{ count: String(KEYCLOAK_PREAUTH_MAX_PENDING) }] : [] };
  };
  const pool = { connect: async () => ({ query, release() {} }) } as unknown as Pool;
  await assert.rejects(createKeycloakPreauth(pool, { purpose: "login", attempt, returnPath: "/" }), /temporarily unavailable/);
  assert.ok(statements.some(sql => sql.includes("pg_advisory_xact_lock")));
  assert.ok(statements.some(sql => sql.includes("DELETE FROM keycloak_auth_attempts WHERE expires_at <= now()")));
  assert.equal(statements.some(sql => sql.includes("INSERT INTO keycloak_auth_attempts")), false);
  assert.equal(statements.at(-1), "ROLLBACK");
});
