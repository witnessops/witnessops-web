import {
  createRemoteJWKSet,
  errors,
  jwtVerify,
  type JWTPayload,
} from "jose";

import { sanitizeAdminReturnTo } from "@/lib/admin-return-path";
import {
  ENTRA_OIDC_REDIRECT_URI,
  canonicalEntraIssuer,
  entraActor,
  isAdminEntraEnabled,
  normalizeEntraGuid,
  parseCanonicalEntraIssuer,
} from "@/lib/server/admin-entra-contract";

export {
  ENTRA_AUTH_FAILED_ERROR,
  ENTRA_NOT_CONFIGURED_ERROR,
  ENTRA_OIDC_REDIRECT_URI,
  PERSONAL_ACCOUNT_TENANT_ID,
  canonicalEntraIssuer,
  isAdminEntraEnabled,
} from "@/lib/server/admin-entra-contract";

export const ENTRA_OIDC_TRANSACTION_COOKIE_NAME =
  "witnessops-admin-entra-oidc-transaction";
export const ENTRA_OIDC_TRANSACTION_COOKIE_PATH = "/api/admin/entra";
export const ENTRA_OIDC_TRANSACTION_MAX_AGE_SECONDS = 600;

const ENTRA_OIDC_TRANSACTION_TTL_MS =
  ENTRA_OIDC_TRANSACTION_MAX_AGE_SECONDS * 1000;
const ENTRA_OIDC_TIMEOUT_MS = 8_000;
const ENTRA_OIDC_CLOCK_TOLERANCE_SECONDS = 60;
const ENTRA_OIDC_PROVIDER = "microsoft" as const;
const MAX_CLIENT_SECRET_LENGTH = 1024;
const MAX_AUTHORIZATION_CODE_LENGTH = 2048;
const MAX_ID_TOKEN_LENGTH = 16_384;

export const ENTRA_ADMIN_OIDC_ERROR_CODES = [
  "config_invalid",
  "transaction_invalid",
  "transaction_expired",
  "provider_unavailable",
  "provider_error",
  "id_token_missing",
  "id_token_invalid",
  "id_token_issuer_invalid",
  "id_token_audience_invalid",
  "id_token_expired",
  "id_token_signature_invalid",
  "id_token_tenant_invalid",
  "nonce_mismatch",
  "identity_invalid",
  "oid_not_allowlisted",
] as const;

export type EntraAdminOidcErrorCode =
  (typeof ENTRA_ADMIN_OIDC_ERROR_CODES)[number];

const ENTRA_ADMIN_OIDC_ERROR_MESSAGES: Record<
  EntraAdminOidcErrorCode,
  string
> = {
  config_invalid: "Microsoft Entra admin sign-in is not configured correctly.",
  transaction_invalid: "Microsoft Entra admin sign-in could not be validated.",
  transaction_expired: "Microsoft Entra admin sign-in expired. Start again.",
  provider_unavailable: "Microsoft Entra sign-in is temporarily unavailable.",
  provider_error: "Microsoft Entra sign-in could not be completed.",
  id_token_missing: "Microsoft Entra sign-in did not return a usable identity.",
  id_token_invalid: "Microsoft Entra identity verification failed.",
  id_token_issuer_invalid:
    "Microsoft Entra identity issuer verification failed.",
  id_token_audience_invalid:
    "Microsoft Entra identity audience verification failed.",
  id_token_expired: "Microsoft Entra identity token expired.",
  id_token_signature_invalid:
    "Microsoft Entra identity signature verification failed.",
  id_token_tenant_invalid: "Microsoft Entra tenant verification failed.",
  nonce_mismatch: "Microsoft Entra sign-in transaction verification failed.",
  identity_invalid: "Microsoft Entra identity is incomplete.",
  oid_not_allowlisted:
    "Microsoft Entra object id is not authorized for admin access.",
};

export class EntraAdminOidcError extends Error {
  readonly code: EntraAdminOidcErrorCode;

  constructor(code: EntraAdminOidcErrorCode) {
    super(ENTRA_ADMIN_OIDC_ERROR_MESSAGES[code]);
    this.name = "EntraAdminOidcError";
    this.code = code;
  }
}

export interface EntraAdminOidcConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  issuer: string;
  adminOidAllowlist: ReadonlySet<string>;
}

interface EntraOidcTransactionPayload {
  provider: typeof ENTRA_OIDC_PROVIDER;
  state: string;
  nonce: string;
  codeVerifier: string;
  returnTo: string;
  exp: number;
}

export interface EntraOidcTransaction {
  state: string;
  nonce: string;
  codeVerifier: string;
  codeChallenge: string;
  returnTo: string;
}

export interface CreatedEntraOidcTransaction extends EntraOidcTransaction {
  cookieValue: string;
}

export interface VerifiedEntraOidcTransaction extends EntraOidcTransaction {
  provider: typeof ENTRA_OIDC_PROVIDER;
  exp: number;
}

export interface VerifiedEntraAdminOidcIdentity {
  provider: typeof ENTRA_OIDC_PROVIDER;
  issuer: string;
  actor: string;
  subject: string;
  sessionHash: string;
}

const ENTRA_CONFIG_ENV_NAMES = [
  "WITNESSOPS_ENTRA_OIDC_TENANT_ID",
  "WITNESSOPS_ENTRA_OIDC_CLIENT_ID",
  "WITNESSOPS_ENTRA_OIDC_CLIENT_SECRET",
  "WITNESSOPS_ENTRA_OIDC_REDIRECT_URI",
  "WITNESSOPS_ENTRA_ADMIN_OID_ALLOWLIST",
] as const;

const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/;

function configInvalid(): never {
  throw new EntraAdminOidcError("config_invalid");
}

function validateRedirectUri(value: string): string | null {
  return value === ENTRA_OIDC_REDIRECT_URI ? value : null;
}

export function readEntraAdminOidcConfig(): EntraAdminOidcConfig | null {
  if (!isAdminEntraEnabled()) return null;

  const rawValues = ENTRA_CONFIG_ENV_NAMES.map((name) => process.env[name]);
  if (
    rawValues.some(
      (value) =>
        value === undefined ||
        !value.trim() ||
        CONTROL_CHARACTER_PATTERN.test(value),
    )
  ) {
    configInvalid();
  }

  const [
    rawTenantId,
    rawClientId,
    rawClientSecret,
    rawRedirectUri,
    rawAllowlist,
  ] = rawValues as [string, string, string, string, string];

  const tenantId = normalizeEntraGuid(rawTenantId);
  const issuer = tenantId ? canonicalEntraIssuer(tenantId) : null;
  const clientId = normalizeEntraGuid(rawClientId);
  const clientSecret = rawClientSecret.trim();
  const redirectUri = validateRedirectUri(rawRedirectUri.trim());
  if (
    !issuer ||
    !tenantId ||
    !clientId ||
    !clientSecret ||
    clientSecret.length > MAX_CLIENT_SECRET_LENGTH ||
    !redirectUri
  ) {
    configInvalid();
  }

  const entries = rawAllowlist.split(",");
  if (entries.length === 0 || entries.some((entry) => !entry.trim())) {
    configInvalid();
  }
  const normalizedOids = entries.map((entry) => normalizeEntraGuid(entry));
  if (normalizedOids.some((oid) => oid === null)) {
    configInvalid();
  }
  const adminOidAllowlist = new Set(normalizedOids as string[]);
  if (
    adminOidAllowlist.size === 0 ||
    adminOidAllowlist.size !== normalizedOids.length
  ) {
    configInvalid();
  }

  return {
    tenantId,
    clientId,
    clientSecret,
    redirectUri,
    issuer,
    adminOidAllowlist,
  };
}

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function decodeBase64Url(value: string): Uint8Array {
  if (!value || !BASE64URL_PATTERN.test(value) || value.length % 4 === 1) {
    throw new EntraAdminOidcError("transaction_invalid");
  }

  try {
    const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (character) =>
      character.charCodeAt(0),
    );
    if (encodeBase64Url(bytes) !== value) {
      throw new EntraAdminOidcError("transaction_invalid");
    }
    return bytes;
  } catch (error) {
    if (error instanceof EntraAdminOidcError) throw error;
    throw new EntraAdminOidcError("transaction_invalid");
  }
}

function randomBase64Url(bytes: number): string {
  return encodeBase64Url(crypto.getRandomValues(new Uint8Array(bytes)));
}

function readAdminSecret(): string {
  const secret = process.env.WITNESSOPS_ADMIN_SECRET;
  if (!secret || !secret.trim()) configInvalid();
  return secret;
}

async function importHmacKey(
  secret: string,
  usages: KeyUsage[],
): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    usages,
  );
}

async function signTransactionPayload(
  encodedPayload: string,
  secret: string,
): Promise<string> {
  const key = await importHmacKey(secret, ["sign"]);
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(encodedPayload),
  );
  return encodeBase64Url(new Uint8Array(signature));
}

async function verifyTransactionSignature(
  encodedPayload: string,
  encodedSignature: string,
  secret: string,
): Promise<boolean> {
  try {
    const key = await importHmacKey(secret, ["verify"]);
    const signature = Uint8Array.from(decodeBase64Url(encodedSignature));
    return crypto.subtle.verify(
      "HMAC",
      key,
      signature,
      new TextEncoder().encode(encodedPayload),
    );
  } catch {
    return false;
  }
}

async function sha256Base64Url(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return encodeBase64Url(new Uint8Array(digest));
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function constantTimeEqual(left: string, right: string): Promise<boolean> {
  const [leftDigest, rightDigest] = await Promise.all([
    crypto.subtle.digest("SHA-256", new TextEncoder().encode(left)),
    crypto.subtle.digest("SHA-256", new TextEncoder().encode(right)),
  ]);
  const leftBytes = new Uint8Array(leftDigest);
  const rightBytes = new Uint8Array(rightDigest);
  let difference = left.length ^ right.length;
  for (let index = 0; index < leftBytes.length; index += 1) {
    difference |= leftBytes[index] ^ rightBytes[index];
  }
  return difference === 0;
}

export async function createEntraOidcTransaction(
  returnTo: unknown,
): Promise<CreatedEntraOidcTransaction> {
  const state = randomBase64Url(24);
  const nonce = randomBase64Url(24);
  const codeVerifier = randomBase64Url(32);
  const codeChallenge = await sha256Base64Url(codeVerifier);
  const sanitizedReturnTo = sanitizeAdminReturnTo(returnTo);
  const payload: EntraOidcTransactionPayload = {
    provider: ENTRA_OIDC_PROVIDER,
    state,
    nonce,
    codeVerifier,
    returnTo: sanitizedReturnTo,
    exp: Date.now() + ENTRA_OIDC_TRANSACTION_TTL_MS,
  };
  const encodedPayload = encodeBase64Url(
    new TextEncoder().encode(JSON.stringify(payload)),
  );
  const signature = await signTransactionPayload(
    encodedPayload,
    readAdminSecret(),
  );

  return {
    state,
    nonce,
    codeVerifier,
    codeChallenge,
    cookieValue: `${encodedPayload}.${signature}`,
    returnTo: sanitizedReturnTo,
  };
}

function isFixedLengthBase64Url(
  value: unknown,
  length: number,
): value is string {
  return (
    typeof value === "string" &&
    value.length === length &&
    BASE64URL_PATTERN.test(value)
  );
}

export async function verifyEntraOidcTransactionCookie(
  cookieValue: string,
): Promise<VerifiedEntraOidcTransaction> {
  if (typeof cookieValue !== "string" || cookieValue.length > 4096) {
    throw new EntraAdminOidcError("transaction_invalid");
  }
  const parts = cookieValue.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new EntraAdminOidcError("transaction_invalid");
  }

  const [encodedPayload, encodedSignature] = parts;
  const signatureValid = await verifyTransactionSignature(
    encodedPayload,
    encodedSignature,
    readAdminSecret(),
  );
  if (!signatureValid) {
    throw new EntraAdminOidcError("transaction_invalid");
  }

  let parsed: Partial<EntraOidcTransactionPayload>;
  try {
    const bytes = decodeBase64Url(encodedPayload);
    parsed = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(bytes),
    ) as Partial<EntraOidcTransactionPayload>;
  } catch {
    throw new EntraAdminOidcError("transaction_invalid");
  }

  if (
    parsed.provider !== ENTRA_OIDC_PROVIDER ||
    !isFixedLengthBase64Url(parsed.state, 32) ||
    !isFixedLengthBase64Url(parsed.nonce, 32) ||
    !isFixedLengthBase64Url(parsed.codeVerifier, 43) ||
    typeof parsed.returnTo !== "string" ||
    sanitizeAdminReturnTo(parsed.returnTo) !== parsed.returnTo ||
    typeof parsed.exp !== "number" ||
    !Number.isSafeInteger(parsed.exp)
  ) {
    throw new EntraAdminOidcError("transaction_invalid");
  }
  if (parsed.exp <= Date.now()) {
    throw new EntraAdminOidcError("transaction_expired");
  }

  return {
    provider: ENTRA_OIDC_PROVIDER,
    state: parsed.state,
    nonce: parsed.nonce,
    codeVerifier: parsed.codeVerifier,
    codeChallenge: await sha256Base64Url(parsed.codeVerifier),
    returnTo: parsed.returnTo,
    exp: parsed.exp,
  };
}

function tenantEndpoint(tenantId: string, suffix: string): string {
  return `https://login.microsoftonline.com/${tenantId}${suffix}`;
}

export function buildEntraOidcAuthorizationUrl(
  config: EntraAdminOidcConfig,
  transaction: Pick<EntraOidcTransaction, "state" | "nonce" | "codeChallenge">,
): string {
  const url = new URL(tenantEndpoint(config.tenantId, "/oauth2/v2.0/authorize"));
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("response_mode", "form_post");
  url.searchParams.set("scope", "openid profile email");
  url.searchParams.set("state", transaction.state);
  url.searchParams.set("nonce", transaction.nonce);
  url.searchParams.set("code_challenge", transaction.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

async function exchangeEntraCode(
  config: EntraAdminOidcConfig,
  code: string,
  codeVerifier: string,
): Promise<string> {
  if (!code.trim() || code.length > MAX_AUTHORIZATION_CODE_LENGTH) {
    throw new EntraAdminOidcError("provider_error");
  }

  let response: Response;
  try {
    response = await fetch(tenantEndpoint(config.tenantId, "/oauth2/v2.0/token"), {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: config.redirectUri,
        code_verifier: codeVerifier,
      }),
      redirect: "error",
      signal: AbortSignal.timeout(ENTRA_OIDC_TIMEOUT_MS),
    });
  } catch {
    throw new EntraAdminOidcError("provider_unavailable");
  }

  if (!response.ok) {
    throw new EntraAdminOidcError("provider_error");
  }

  try {
    const { id_token: idToken } = (await response.json()) as {
      id_token?: unknown;
    };
    if (typeof idToken !== "string" || !idToken || idToken.length > MAX_ID_TOKEN_LENGTH) {
      throw new EntraAdminOidcError("id_token_missing");
    }
    return idToken;
  } catch (error) {
    if (error instanceof EntraAdminOidcError) throw error;
    throw new EntraAdminOidcError("provider_error");
  }
}

function readExactString(payload: JWTPayload, name: string): string | null {
  const value = payload[name];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function mapJoseVerificationError(error: unknown): EntraAdminOidcError {
  if (error instanceof errors.JWTExpired) {
    return new EntraAdminOidcError("id_token_expired");
  }
  if (error instanceof errors.JWTClaimValidationFailed) {
    if (error.claim === "iss") {
      return new EntraAdminOidcError("id_token_issuer_invalid");
    }
    if (error.claim === "aud") {
      return new EntraAdminOidcError("id_token_audience_invalid");
    }
    return new EntraAdminOidcError("id_token_invalid");
  }
  if (error instanceof errors.JWSSignatureVerificationFailed) {
    return new EntraAdminOidcError("id_token_signature_invalid");
  }
  if (error instanceof errors.JWKSTimeout) {
    return new EntraAdminOidcError("provider_unavailable");
  }
  if (error instanceof errors.JWKSNoMatchingKey) {
    return new EntraAdminOidcError("id_token_signature_invalid");
  }
  return new EntraAdminOidcError("id_token_invalid");
}

export async function verifyEntraOidcCode(
  code: string,
  transaction: Pick<EntraOidcTransaction, "nonce" | "codeVerifier">,
): Promise<VerifiedEntraAdminOidcIdentity> {
  const config = readEntraAdminOidcConfig();
  if (!config) configInvalid();

  const idToken = await exchangeEntraCode(
    config,
    code,
    transaction.codeVerifier,
  );

  let payload: JWTPayload;
  try {
    const jwks = createRemoteJWKSet(
      new URL(tenantEndpoint(config.tenantId, "/discovery/v2.0/keys")),
      { timeoutDuration: ENTRA_OIDC_TIMEOUT_MS },
    );
    ({ payload } = await jwtVerify(idToken, jwks, {
      algorithms: ["RS256"],
      issuer: config.issuer,
      audience: config.clientId,
      clockTolerance: ENTRA_OIDC_CLOCK_TOLERANCE_SECONDS,
      requiredClaims: ["exp", "iat"],
    }));
  } catch (error) {
    throw mapJoseVerificationError(error);
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (
    typeof payload.iat !== "number" ||
    payload.iat > nowSeconds + ENTRA_OIDC_CLOCK_TOLERANCE_SECONDS
  ) {
    throw new EntraAdminOidcError("id_token_invalid");
  }
  if (parseCanonicalEntraIssuer(String(payload.iss ?? "")) !== config.issuer) {
    throw new EntraAdminOidcError("id_token_issuer_invalid");
  }
  const audience = payload.aud;
  if (typeof audience !== "string" || audience.toLowerCase() !== config.clientId) {
    throw new EntraAdminOidcError("id_token_audience_invalid");
  }
  if (
    payload.azp !== undefined &&
    (typeof payload.azp !== "string" ||
      payload.azp.toLowerCase() !== config.clientId)
  ) {
    throw new EntraAdminOidcError("id_token_audience_invalid");
  }

  const tokenTid = readExactString(payload, "tid");
  if (!tokenTid || canonicalEntraIssuer(tokenTid) !== config.issuer) {
    throw new EntraAdminOidcError("id_token_tenant_invalid");
  }

  const tokenNonce = readExactString(payload, "nonce");
  if (!tokenNonce || !(await constantTimeEqual(tokenNonce, transaction.nonce))) {
    throw new EntraAdminOidcError("nonce_mismatch");
  }

  const oid = normalizeEntraGuid(readExactString(payload, "oid") ?? "");
  if (!oid) {
    throw new EntraAdminOidcError("identity_invalid");
  }
  if (!config.adminOidAllowlist.has(oid)) {
    throw new EntraAdminOidcError("oid_not_allowlisted");
  }

  const subjectIdentity = `${config.issuer}#${oid}`;
  return {
    provider: ENTRA_OIDC_PROVIDER,
    issuer: config.issuer,
    actor: entraActor(config.issuer, oid),
    subject: oid,
    sessionHash: (await sha256Hex(subjectIdentity)).slice(0, 16),
  };
}
