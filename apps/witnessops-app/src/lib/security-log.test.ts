import test, { describe } from "node:test";
import assert from "node:assert/strict";
import type { Pool } from "pg";
import { createFoundationService, admitRequest } from "./server";
import { createServerCheckService } from "./server-check/service";
import type { ServerCheckStore } from "./server-check/store";
import { createCliAuthService } from "./cli-auth-service";
import { requireUnrevokedSession, sessionKey } from "./db/sessions";
import { ApiError } from "./errors";
import { formatSecurityEvent, logAccessFailure, setSecurityLogSink } from "./security-log";

const token = "querytokenSUPERSECRET0123456789abcdef";
const cookie = "wos-session=sealedcookieSECRETVALUE012345";
const email = "person@example.com";
const password = "password-SUPERSECRET";
const share = "sharesecret-SUPERSECRET";
const bearer = "super-secret-token";
const sessionSecret = "SECRETSESSION";
const leaks = [token, cookie, email, password, share, bearer, sessionSecret, "Bearer ", "?"];

function capture<T>(run: () => T): { result: T; lines: string[] } {
  const lines: string[] = [];
  const previous = setSecurityLogSink((line) => lines.push(line));
  try {
    return { result: run(), lines };
  } finally {
    setSecurityLogSink(previous);
  }
}

async function captureAsync<T>(run: () => Promise<T>): Promise<{ result: T; lines: string[] }> {
  const lines: string[] = [];
  const previous = setSecurityLogSink((line) => lines.push(line));
  try {
    return { result: await run(), lines };
  } finally {
    setSecurityLogSink(previous);
  }
}

function assertSecretFree(lines: string[], extra: string[] = []) {
  const text = lines.join("\n");
  for (const leak of [...leaks, ...extra]) assert.equal(text.includes(leak), false, leak);
  for (const line of lines) {
    const record = JSON.parse(line) as Record<string, unknown>;
    assert.deepEqual(Object.keys(record).sort(), ["event", "reason", "status"]);
  }
}

describe("security event log", { concurrency: false }, () => {
  test("formatter drops token, cookie, email, password, share secret and query strings", () => {
    const poisoned = `admission ${token} ${cookie} ${email} ${password} ${share} https://app.witnessops.com/api/runs?token=${token}`;
    const line = formatSecurityEvent(poisoned, 403, poisoned);
    assert.equal(line, '{"event":"auth_rejected","status":0,"reason":"redacted"}');
    assertSecretFree([line]);
    assert.deepEqual(JSON.parse(formatSecurityEvent("admission_rejected", 403, "origin")), {
      event: "admission_rejected", status: 403, reason: "origin",
    });
  });

  test("admission rejection logs one reason and none of the request", () => {
    const origin = "https://app.witnessops.com";
    const url = `https://0.0.0.0:3020/api/workspace?token=${token}&email=${encodeURIComponent(email)}`;
    const { lines } = capture(() => {
      assert.throws(() => admitRequest(new Request(url, {
        headers: {
          host: "app.witnessops.com",
          "x-forwarded-host": "app.witnessops.com",
          "x-forwarded-proto": "https",
          cookie,
          authorization: `Bearer ${bearer}`,
        },
      }), origin, "caddy-loopback-v1"), /Unexpected query/);
    });
    assert.equal(lines.length, 1);
    assert.deepEqual(JSON.parse(lines[0]), { event: "admission_rejected", status: 400, reason: "query" });
    assertSecretFree(lines);
  });

  test("unauthenticated and forbidden responses do not repeat admission lines or echo cookies", async () => {
    const origin = "http://127.0.0.1:3020";
    const api = createFoundationService({ origin, identity: async () => null, run: async () => { throw new Error("Must not execute"); } });
    const { result, lines } = await captureAsync(() => api.handle(new Request(`${origin}/api/workspace`, {
      headers: { host: "127.0.0.1:3020", cookie, authorization: `Bearer ${bearer}` },
    }), "workspace"));
    assert.equal(result.status, 401);
    assert.deepEqual(lines.map((line) => JSON.parse(line).reason), ["unauthenticated"]);
    assertSecretFree(lines);

    const denied = await captureAsync(() => api.handle(new Request(`${origin}/api/runs`, {
      method: "POST",
      headers: { host: "evil.test", origin: `https://evil.test/share?secret=${share}`, cookie },
    }), "runs"));
    assert.equal(denied.result.status, 403);
    assert.equal(denied.lines.length, 1);
    assert.equal(JSON.parse(denied.lines[0]).event, "admission_rejected");
    assertSecretFree(denied.lines);
  });

  test("server-check 401 and lock contention omit credential, cookie and body", async () => {
    const origin = "http://127.0.0.1:3020";
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const store = { context: async () => { await gate; return { ready: true }; } } as unknown as ServerCheckStore;
    const service = createServerCheckService(store, origin);
    const lockToken = "locktokenSECRETVALUE0123456789abcdZZEXTRA77";
    assert.equal(lockToken.length, 43);
    const { lines } = await captureAsync(async () => {
      const headers = { host: "127.0.0.1:3020", origin, cookie, authorization: `Bearer ${bearer}` };
      const rejected = await service(new Request(origin, {
        method: "POST", headers: { ...headers, "content-type": "application/json" },
        body: JSON.stringify({ password, share, email, token }),
      }));
      assert.equal(rejected.status, 401);
      const held = { host: "127.0.0.1:3020", authorization: `Bearer ${lockToken}`, cookie };
      const pending = [service(new Request(origin, { headers: held })), service(new Request(origin, { headers: held }))];
      const blocked = await service(new Request(origin, { headers: held }));
      assert.equal(blocked.status, 429);
      release();
      await Promise.all(pending);
    });
    assert.deepEqual(lines.map((line) => JSON.parse(line).reason), ["invalid_credential", "busy"]);
    assertSecretFree(lines, [lockToken]);
  });

  test("handler 401 and 403 logs omit credential, cookie, email and error text", async () => {
    const error = new ApiError(403, `${token} ${cookie} ${email} ${password} ${share}`);
    const direct = capture(() => logAccessFailure(error));
    assert.deepEqual(JSON.parse(direct.lines[0]), { event: "admission_rejected", status: 403, reason: "forbidden" });
    assertSecretFree(direct.lines);
    const origin = "http://127.0.0.1:3020";
    const cli = createCliAuthService({ pool: {} as Pool, origin });
    const session = await captureAsync(() => cli.handle(new Request(`${origin}/api/cli/session`, {
      headers: { host: "127.0.0.1:3020", cookie, authorization: `Bearer ${bearer}` },
    }), "session"));
    assert.equal(session.result.status, 401);
    assert.deepEqual(session.lines.map((line) => JSON.parse(line).reason), ["unauthenticated"]);
    assertSecretFree(session.lines);
  });

  test("session rejection does not log issuer, session id or subject", async () => {
    const { lines } = capture(() => {
      assert.throws(() => sessionKey(
        `https://idp.example/path?token=${token}`,
        `session_${sessionSecret}?email=${email}`,
        `user_${email}`,
      ), /Sign in/);
    });
    assert.deepEqual(lines.map((line) => JSON.parse(line).reason), ["invalid_session"]);
    assertSecretFree(lines);

    const key = sessionKey("https://api.workos.com/user_management/client_fixture", `session_${sessionSecret}`, "user_A");
    const pool = { query: async () => ({ rowCount: 1 }) } as unknown as Pool;
    const revoked = await captureAsync(async () => {
      await assert.rejects(requireUnrevokedSession(pool, key), /Sign in/);
    });
    assert.deepEqual(revoked.lines.map((line) => JSON.parse(line).reason), ["revoked_session"]);
    assertSecretFree(revoked.lines);
  });
});
