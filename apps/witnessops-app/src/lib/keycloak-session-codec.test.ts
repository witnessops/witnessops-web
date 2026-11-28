import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdtempSync, rmSync, symlinkSync, writeFileSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { loadKeycloakSessionCodec, type KeycloakTokenBinding } from "./keycloak-session-codec";

const scope = { issuer: "https://idp.example.test/realms/test", clientId: "app-test" };
const binding: KeycloakTokenBinding = {
  tokenHash: "a".repeat(64), issuer: scope.issuer,
  subject: "b4d07c5f-81c4-44be-b261-998302103b40",
  userId: "fe264a49-7264-46d2-8f25-adc9a4cc9c97",
};
const tokens = { id_token: "id.synthetic", access_token: "access.synthetic", refresh_token: "refresh.synthetic" };

function withKeyring(action: (file: string, directory: string, key: string) => void) {
  const directory = mkdtempSync(join(tmpdir(), "wops-keycloak-codec-"));
  try {
    const file = join(directory, "keyring.json");
    const key = randomBytes(32).toString("base64");
    writeFileSync(file, JSON.stringify({ active: "one", keys: { one: key } }), { mode: 0o600 });
    action(file, directory, key);
  } finally { rmSync(directory, { recursive: true, force: true }); }
}

test("Keycloak tokens are sealed with context binding, tamper detection and no plaintext", () => {
  withKeyring(file => {
    const codec = loadKeycloakSessionCodec(file, scope);
    const sealed = codec.seal(tokens, binding);
    assert.match(sealed, /^v1\.one\./);
    assert.equal(sealed.includes(tokens.access_token), false);
    assert.deepEqual(codec.open(sealed, binding), { tokens, needsRewrap: false });
    assert.throws(() => codec.open(sealed, { ...binding, tokenHash: "b".repeat(64) }), /protection failed/);
    assert.throws(() => codec.open(sealed, { ...binding, userId: "55caa5c3-63d5-40a0-9d7b-8c022da5b590" }), /protection failed/);
    assert.throws(() => codec.open(sealed, { ...binding, subject: "other" }), /protection failed/);
    const parts = sealed.split(".");
    parts[3] = `${parts[3].slice(0, -1)}${parts[3].endsWith("A") ? "B" : "A"}`;
    assert.throws(() => codec.open(parts.join("."), binding), /protection failed/);
  });
});

test("retained old key reads and rewraps under the new active key", () => {
  withKeyring((file, _directory, oldKey) => {
    const oldCodec = loadKeycloakSessionCodec(file, scope);
    const oldEnvelope = oldCodec.seal(tokens, binding);
    writeFileSync(file, JSON.stringify({ active: "two", keys: {
      one: oldKey, two: randomBytes(32).toString("base64"),
    } }), { mode: 0o600 });
    const current = loadKeycloakSessionCodec(file, scope);
    assert.deepEqual(current.open(oldEnvelope, binding), { tokens, needsRewrap: true });
    assert.match(current.seal(tokens, binding), /^v1\.two\./);
  });
});

test("keyring loader rejects loose mode, symlink, malformed key and absent file", () => {
  withKeyring((file, directory) => {
    chmodSync(file, 0o644);
    assert.throws(() => loadKeycloakSessionCodec(file, scope), /keyring is invalid/);
    chmodSync(file, 0o600);
    const link = join(directory, "link.json");
    symlinkSync(file, link);
    assert.throws(() => loadKeycloakSessionCodec(link, scope), /keyring is invalid/);
    writeFileSync(file, JSON.stringify({ active: "one", keys: { one: "short" } }), { mode: 0o600 });
    assert.throws(() => loadKeycloakSessionCodec(file, scope), /keyring is invalid/);
    assert.throws(() => loadKeycloakSessionCodec(join(directory, "missing"), scope), /keyring is invalid/);
  });
});
