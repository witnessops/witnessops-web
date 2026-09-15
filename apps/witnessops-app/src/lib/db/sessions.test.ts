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
test("session revocation: DB lookup and write failure never become success", async () => {
  const unavailable = { query: async () => { throw new Error("database unavailable"); } } as unknown as Pool;
  await assert.rejects(requireUnrevokedSession(unavailable, key), /unavailable/);
  await assert.rejects(revokeSession(unavailable, key), /unavailable/);
});
