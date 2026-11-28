import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { closeSync, constants, fstatSync, openSync, readFileSync } from "node:fs";
import { isAbsolute } from "node:path";

const MAX_FILE_BYTES = 65_536;
const MAX_TOKEN_BYTES = 131_072;
const KEY_ID = /^[A-Za-z][A-Za-z0-9_-]{0,31}$/;
const HASH = /^[a-f0-9]{64}$/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;

export type KeycloakTokenBundle = {
  id_token: string;
  access_token: string;
  refresh_token: string;
};
export type KeycloakTokenBinding = {
  tokenHash: string;
  issuer: string;
  subject: string;
  userId: string;
};
export type KeycloakSessionCodec = {
  readonly issuer: string;
  readonly clientId: string;
  seal(tokens: KeycloakTokenBundle, binding: KeycloakTokenBinding): string;
  open(envelope: string, binding: KeycloakTokenBinding): { tokens: KeycloakTokenBundle; needsRewrap: boolean };
};

function invalid(): Error { return new Error("Keycloak session token protection failed"); }
function invalidFile(): Error { return new Error("Keycloak session keyring is invalid"); }
function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function exact(value: unknown, fields: string[]): value is Record<string, unknown> {
  return object(value) && Object.keys(value).length === fields.length && fields.every(field => Object.hasOwn(value, field));
}
function text(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && Buffer.byteLength(value) <= 300 && !/[\x00-\x1f\x7f]/.test(value);
}
function subject(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 255
    && !/\s|[\x00-\x1f\x7f]/u.test(value);
}
function canonicalBase64Url(value: string): Buffer {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw invalid();
  const bytes = Buffer.from(value, "base64url");
  if (bytes.toString("base64url") !== value) throw invalid();
  return bytes;
}
function validTokens(value: unknown): value is KeycloakTokenBundle {
  return exact(value, ["id_token", "access_token", "refresh_token"])
    && Object.values(value).every(token => typeof token === "string" && token.length > 0 && Buffer.byteLength(token) <= MAX_TOKEN_BYTES);
}

/** Call at startup with a separately custodied, app-specific keyring file. */
export function loadKeycloakSessionCodec(file: string, scope: { issuer: string; clientId: string }): KeycloakSessionCodec {
  if (!isAbsolute(file) || !text(scope.issuer) || !text(scope.clientId)) throw invalidFile();
  let source: string;
  let fd: number | undefined;
  try {
    const runtimeUid = process.getuid?.();
    if (runtimeUid === undefined) throw invalidFile();
    fd = openSync(file, constants.O_RDONLY | constants.O_NOFOLLOW);
    const stat = fstatSync(fd);
    const mode = stat.mode & 0o777;
    if (!stat.isFile() || stat.nlink !== 1 || (mode !== 0o400 && mode !== 0o600)
      || (stat.uid !== 0 && stat.uid !== runtimeUid)
      || stat.size < 1 || stat.size > MAX_FILE_BYTES) throw invalidFile();
    source = readFileSync(fd, "utf8");
    if (Buffer.byteLength(source) > MAX_FILE_BYTES) throw invalidFile();
  } catch { throw invalidFile(); }
  finally { if (fd !== undefined) closeSync(fd); }

  let parsed: unknown;
  try { parsed = JSON.parse(source); } catch { throw invalidFile(); }
  if (!exact(parsed, ["active", "keys"]) || typeof parsed.active !== "string"
    || !KEY_ID.test(parsed.active) || !object(parsed.keys)) throw invalidFile();
  const entries = Object.entries(parsed.keys);
  if (entries.length < 1 || entries.length > 8) throw invalidFile();
  const keys = new Map<string, Buffer>();
  for (const [id, encoded] of entries) {
    if (!KEY_ID.test(id) || typeof encoded !== "string" || !/^[A-Za-z0-9+/]{43}=$/.test(encoded)) throw invalidFile();
    const key = Buffer.from(encoded, "base64");
    if (key.length !== 32 || key.toString("base64") !== encoded) throw invalidFile();
    keys.set(id, key);
  }
  if (!keys.has(parsed.active)) throw invalidFile();
  const active = parsed.active;
  const issuer = scope.issuer, clientId = scope.clientId;

  function aad(binding: KeycloakTokenBinding, kid: string): Buffer {
    if (!HASH.test(binding.tokenHash) || binding.issuer !== issuer || !subject(binding.subject) || !UUID.test(binding.userId)) throw invalid();
    return Buffer.from(JSON.stringify(["witnessops-app-keycloak-session", 1, kid, issuer, clientId,
      binding.tokenHash, binding.subject, binding.userId]));
  }
  function seal(tokens: KeycloakTokenBundle, binding: KeycloakTokenBinding): string {
    if (!validTokens(tokens)) throw invalid();
    const input = JSON.stringify(tokens);
    if (Buffer.byteLength(input) > MAX_TOKEN_BYTES) throw invalid();
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", keys.get(active)!, iv);
    cipher.setAAD(aad(binding, active));
    const body = Buffer.concat([cipher.update(input, "utf8"), cipher.final()]);
    return ["v1", active, iv.toString("base64url"), body.toString("base64url"), cipher.getAuthTag().toString("base64url")].join(".");
  }
  function open(envelope: string, binding: KeycloakTokenBinding) {
    try {
      if (typeof envelope !== "string" || envelope.length > MAX_TOKEN_BYTES * 2) throw invalid();
      const parts = envelope.split(".");
      if (parts.length !== 5 || parts[0] !== "v1" || !keys.has(parts[1])) throw invalid();
      const [, kid, ivText, bodyText, tagText] = parts;
      const iv = canonicalBase64Url(ivText), body = canonicalBase64Url(bodyText), tag = canonicalBase64Url(tagText);
      if (iv.length !== 12 || tag.length !== 16 || body.length > MAX_TOKEN_BYTES) throw invalid();
      const decipher = createDecipheriv("aes-256-gcm", keys.get(kid)!, iv);
      decipher.setAAD(aad(binding, kid));
      decipher.setAuthTag(tag);
      const tokens: unknown = JSON.parse(Buffer.concat([decipher.update(body), decipher.final()]).toString("utf8"));
      if (!validTokens(tokens) || Buffer.byteLength(JSON.stringify(tokens)) > MAX_TOKEN_BYTES) throw invalid();
      return { tokens, needsRewrap: kid !== active };
    } catch { throw invalid(); }
  }
  return { issuer, clientId, seal, open };
}
