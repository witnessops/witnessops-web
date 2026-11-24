import test from "node:test";
import assert from "node:assert/strict";
import type { Pool } from "pg";
import { requireUnrevokedSession, revokeSession, sessionKey } from "./sessions";

const key = sessionKey("https://api.workos.com/user_management/client_fixture", "session_A", "user_A");
test("session revocation: malformed or missing claims fail closed before SQL", async () => {
  for (const id of [undefined, "", "session_", "other", "session_A\n", "session_" + "a".repeat(129)]) {
    assert.throws(() => sessionKey(key.issuer, id, key.subject), /Sign in/);
  }
  assert.throws(() => sessionKey(key.issuer, key.sessionId, "not-a-user"), /Sign in/);
  assert.throws(() => sessionKey("", key.sessionId, key.subject), /Sign in/);
});
test("Keycloak session key retains its real opaque subject and checks the realm issuer", () => {
  const linked = sessionKey("https://identity.example.test/realms/academy", "session_" + "a".repeat(64), "018f9ae4-188c-7a5e-88c3-758fcbad0fd5", "keycloak");
  assert.equal(linked.subject, "018f9ae4-188c-7a5e-88c3-758fcbad0fd5");
  assert.equal(linked.provider, "keycloak");
  assert.throws(() => sessionKey("https://identity.example.test/other", linked.sessionId, linked.subject, "keycloak"), /Sign in/);
  assert.throws(() => sessionKey(linked.issuer, linked.sessionId, "subject with space", "keycloak"), /Sign in/);
  assert.throws(() => sessionKey(linked.issuer, linked.sessionId, linked.subject), /Sign in/);
});
test("session revocation: DB lookup and write failure never become success", async () => {
  const unavailable = { query: async () => { throw new Error("database unavailable"); } } as unknown as Pool;
  await assert.rejects(requireUnrevokedSession(unavailable, key), /unavailable/);
  await assert.rejects(revokeSession(unavailable, key), /unavailable/);
});
