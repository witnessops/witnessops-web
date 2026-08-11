import {
  createRemoteJWKSet,
  errors,
  jwtVerify,
  type JWTPayload,
} from "jose";
import { sanitizeAdminReturnTo } from "@/lib/admin-return-path";

export { sanitizeAdminReturnTo } from "@/lib/admin-return-path";

export const GOOGLE_OIDC_ISSUER = "https://accounts.google.com";
export const GOOGLE_OIDC_TRANSACTION_COOKIE_NAME =
  "witnessops-admin-google-oidc-transaction";

const GOOGLE_OIDC_AUTHORIZE_ENDPOINT =
  "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_OIDC_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_OIDC_JWKS_ENDPOINT = new URL(
  "https://www.googleapis.com/oauth2/v3/certs",
);
const GOOGLE_OIDC_REDIRECT_URI =
  "https://witnessops.com/api/admin/google/callback";
const GOOGLE_OIDC_TRANSACTION_TTL_MS = 10 * 60 * 1000;
const GOOGLE_OIDC_TIMEOUT_MS = 8_000;
const GOOGLE_OIDC_PROVIDER = "google" as const;

export const GOOGLE_ADMIN_OIDC_ERROR_CODES = [
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
  "nonce_mismatch",
  "identity_invalid",
  "email_unverified",
  "workspace_domain_mismatch",
  "email_not_authorized",
] as const;

export type GoogleAdminOidcErrorCode =
  (typeof GOOGLE_ADMIN_OIDC_ERROR_CODES)[number];

const GOOGLE_ADMIN_OIDC_ERROR_MESSAGES: Record<
  GoogleAdminOidcErrorCode,
  string
> = {
  config_invalid: "Google admin sign-in is not configured correctly.",
  transaction_invalid: "Google admin sign-in could not be validated.",
  transaction_expired: "Google admin sign-in expired. Start again.",
  provider_unavailable: "Google sign-in is temporarily unavailable.",
  provider_error: "Google sign-in could not be completed.",
  id_token_missing: "Google sign-in did not return a usable identity.",
  id_token_invalid: "Google identity verification failed.",
  id_token_issuer_invalid: "Google identity issuer verification failed.",
  id_token_audience_invalid: "Google identity audience verification failed.",
  id_token_expired: "Google identity token expired.",
  id_token_signature_invalid: "Google identity signature verification failed.",
  nonce_mismatch: "Google sign-in transaction verification failed.",
  identity_invalid: "Google identity is incomplete.",
  email_unverified: "Google account email is not verified.",
  workspace_domain_mismatch:
    "Google account is outside the authorized workspace.",
  email_not_authorized:
    "Google account is not authorized for admin access.",
};

export class GoogleAdminOidcError extends Error {
  readonly code: GoogleAdminOidcErrorCode;

  constructor(code: GoogleAdminOidcErrorCode) {
    super(GOOGLE_ADMIN_OIDC_ERROR_MESSAGES[code]);
    this.name = "GoogleAdminOidcError";
    this.code = code;
  }
}

export interface GoogleAdminOidcConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  workspaceDomain: string;
  adminEmailAllowlist: ReadonlySet<string>;
}

interface GoogleOidcTransactionPayload {
  provider: typeof GOOGLE_OIDC_PROVIDER;
  state: string;
  nonce: string;
  codeVerifier: string;
  returnTo: string;
  exp: number;
}

export interface GoogleOidcTransaction {
  state: string;
  nonce: string;
  codeVerifier: string;
  codeChallenge: string;
  returnTo: string;
}

export interface CreatedGoogleOidcTransaction extends GoogleOidcTransaction {
  cookieValue: string;
}

export interface VerifiedGoogleOidcTransaction extends GoogleOidcTransaction {
  provider: typeof GOOGLE_OIDC_PROVIDER;
  exp: number;
}

export interface VerifiedGoogleAdminOidcIdentity {
  provider: typeof GOOGLE_OIDC_PROVIDER;
  issuer: typeof GOOGLE_OIDC_ISSUER;
  actor: string;
  subject: string;
  email: string;
  name: string | null;
  workspaceDomain: string;
  sessionHash: string;
}

const GOOGLE_CONFIG_ENV_NAMES = [
  "WITNESSOPS_GOOGLE_OIDC_CLIENT_ID",
  "WITNESSOPS_GOOGLE_OIDC_CLIENT_SECRET",
  "WITNESSOPS_GOOGLE_OIDC_REDIRECT_URI",
  "WITNESSOPS_GOOGLE_WORKSPACE_DOMAIN",
  "WITNESSOPS_GOOGLE_ADMIN_EMAIL_ALLOWLIST",
] as const;

const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/;
const NON_ASCII_PATTERN = /[^\x00-\x7f]/;

function configInvalid(): never {
  throw new GoogleAdminOidcError("config_invalid");
}

function normalizeDomain(value: string): string | null {
  if (NON_ASCII_PATTERN.test(value)) {
    return null;
  }
  const domain = value.trim().toLowerCase();
  if (!domain || domain.length > 253 || domain.endsWith(".")) {
    return null;
  }

  const labels = domain.split(".");
  if (
    labels.some(
      (label) =>
        label.length === 0 ||
        label.length > 63 ||
        !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label),
    )
  ) {
    return null;
  }

  return domain;
}

function normalizeEmail(value: string): string | null {
  if (NON_ASCII_PATTERN.test(value)) {
    return null;
  }
  const email = value.trim().toLowerCase();
  if (!email || email.length > 254 || CONTROL_CHARACTER_PATTERN.test(email)) {
    return null;
  }

  const atIndex = email.indexOf("@");
  if (
    atIndex <= 0 ||
    atIndex !== email.lastIndexOf("@") ||
    atIndex === email.length - 1
  ) {
    return null;
  }

  const localPart = email.slice(0, atIndex);
  const domain = normalizeDomain(email.slice(atIndex + 1));
  if (
    !domain ||
    localPart.length > 64 ||
    localPart.startsWith(".") ||
    localPart.endsWith(".") ||
    localPart.includes("..") ||
    !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(localPart)
  ) {
    return null;
  }

  return `${localPart}@${domain}`;
}

function validateRedirectUri(value: string): string | null {
  return value === GOOGLE_OIDC_REDIRECT_URI ? value : null;
}

export function readGoogleAdminOidcConfig(): GoogleAdminOidcConfig | null {
  const rawValues = GOOGLE_CONFIG_ENV_NAMES.map((name) => process.env[name]);
  if (rawValues.every((value) => value === undefined)) {
    return null;
  }
  if (rawValues.some((value) => value === undefined || !value.trim())) {
    configInvalid();
  }

  const [
    rawClientId,
    rawClientSecret,
    rawRedirectUri,
    rawWorkspaceDomain,
    rawAllowlist,
  ] = rawValues as [string, string, string, string, string];

  const clientId = rawClientId.trim();
  const clientSecret = rawClientSecret.trim();
  const redirectUri = validateRedirectUri(rawRedirectUri.trim());
  const workspaceDomain = normalizeDomain(rawWorkspaceDomain);
  if (
    !clientId ||
    !clientId.endsWith(".apps.googleusercontent.com") ||
    CONTROL_CHARACTER_PATTERN.test(rawClientId) ||
    !clientSecret ||
    CONTROL_CHARACTER_PATTERN.test(rawClientSecret) ||
    !redirectUri ||
    !workspaceDomain
  ) {
    configInvalid();
  }

  const entries = rawAllowlist.split(",");
  if (entries.length === 0 || entries.some((entry) => !entry.trim())) {
    configInvalid();
  }

  const normalizedEmails = entries.map(normalizeEmail);
  if (normalizedEmails.some((email) => email === null)) {
    configInvalid();
  }

  const adminEmailAllowlist = new Set(normalizedEmails as string[]);
  if (
    adminEmailAllowlist.size === 0 ||
    adminEmailAllowlist.size !== normalizedEmails.length
  ) {
    configInvalid();
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
    workspaceDomain,
    adminEmailAllowlist,
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
  if (
    !value ||
    !BASE64URL_PATTERN.test(value) ||
    value.length % 4 === 1
  ) {
    throw new GoogleAdminOidcError("transaction_invalid");
  }

  try {
    const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (character) =>
      character.charCodeAt(0),
    );
    if (encodeBase64Url(bytes) !== value) {
      throw new GoogleAdminOidcError("transaction_invalid");
    }
    return bytes;
  } catch (error) {
    if (error instanceof GoogleAdminOidcError) {
      throw error;
    }
    throw new GoogleAdminOidcError("transaction_invalid");
  }
}

function randomBase64Url(bytes: number): string {
  return encodeBase64Url(crypto.getRandomValues(new Uint8Array(bytes)));
}

function readAdminSecret(): string {
  const secret = process.env.WITNESSOPS_ADMIN_SECRET;
  if (!secret || !secret.trim()) {
    configInvalid();
  }
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

export async function createGoogleOidcTransaction(
  returnTo: unknown,
): Promise<CreatedGoogleOidcTransaction> {
  const state = randomBase64Url(24);
  const nonce = randomBase64Url(24);
  const codeVerifier = randomBase64Url(32);
  const codeChallenge = await sha256Base64Url(codeVerifier);
  const sanitizedReturnTo = sanitizeAdminReturnTo(returnTo);
  const payload: GoogleOidcTransactionPayload = {
    provider: GOOGLE_OIDC_PROVIDER,
    state,
    nonce,
    codeVerifier,
    returnTo: sanitizedReturnTo,
    exp: Date.now() + GOOGLE_OIDC_TRANSACTION_TTL_MS,
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

function isFixedLengthBase64Url(value: unknown, length: number): value is string {
  return (
    typeof value === "string" &&
    value.length === length &&
    BASE64URL_PATTERN.test(value)
  );
}

export async function verifyGoogleOidcTransactionCookie(
  cookieValue: string,
): Promise<VerifiedGoogleOidcTransaction> {
  if (typeof cookieValue !== "string" || cookieValue.length > 4096) {
    throw new GoogleAdminOidcError("transaction_invalid");
  }
  const parts = cookieValue.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new GoogleAdminOidcError("transaction_invalid");
  }

  const [encodedPayload, encodedSignature] = parts;
  const signatureValid = await verifyTransactionSignature(
    encodedPayload,
    encodedSignature,
    readAdminSecret(),
  );
  if (!signatureValid) {
    throw new GoogleAdminOidcError("transaction_invalid");
  }

  let parsed: Partial<GoogleOidcTransactionPayload>;
  try {
    const bytes = decodeBase64Url(encodedPayload);
    parsed = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(bytes),
    ) as Partial<GoogleOidcTransactionPayload>;
  } catch {
    throw new GoogleAdminOidcError("transaction_invalid");
  }

  if (
    parsed.provider !== GOOGLE_OIDC_PROVIDER ||
    !isFixedLengthBase64Url(parsed.state, 32) ||
    !isFixedLengthBase64Url(parsed.nonce, 32) ||
    !isFixedLengthBase64Url(parsed.codeVerifier, 43) ||
    typeof parsed.returnTo !== "string" ||
    sanitizeAdminReturnTo(parsed.returnTo) !== parsed.returnTo ||
    typeof parsed.exp !== "number" ||
    !Number.isSafeInteger(parsed.exp)
  ) {
    throw new GoogleAdminOidcError("transaction_invalid");
  }
  if (parsed.exp <= Date.now()) {
    throw new GoogleAdminOidcError("transaction_expired");
  }

  return {
    provider: GOOGLE_OIDC_PROVIDER,
    state: parsed.state,
    nonce: parsed.nonce,
    codeVerifier: parsed.codeVerifier,
    codeChallenge: await sha256Base64Url(parsed.codeVerifier),
    returnTo: parsed.returnTo,
    exp: parsed.exp,
  };
}

export function buildGoogleOidcAuthorizationUrl(
  config: GoogleAdminOidcConfig,
  transaction: Pick<
    GoogleOidcTransaction,
    "state" | "nonce" | "codeChallenge"
  >,
): string {
  const url = new URL(GOOGLE_OIDC_AUTHORIZE_ENDPOINT);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("response_mode", "form_post");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", transaction.state);
  url.searchParams.set("nonce", transaction.nonce);
  url.searchParams.set("hd", config.workspaceDomain);
  url.searchParams.set("code_challenge", transaction.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

async function exchangeGoogleCode(
  config: GoogleAdminOidcConfig,
  code: string,
  codeVerifier: string,
): Promise<string> {
  if (!code.trim()) {
    throw new GoogleAdminOidcError("provider_error");
  }

  let response: Response;
  try {
    response = await fetch(GOOGLE_OIDC_TOKEN_ENDPOINT, {
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
      signal: AbortSignal.timeout(GOOGLE_OIDC_TIMEOUT_MS),
    });
  } catch {
    throw new GoogleAdminOidcError("provider_unavailable");
  }

  if (!response.ok) {
    throw new GoogleAdminOidcError("provider_error");
  }

  try {
    const { id_token: idToken } = (await response.json()) as {
      id_token?: unknown;
    };
    if (typeof idToken !== "string" || !idToken) {
      throw new GoogleAdminOidcError("id_token_missing");
    }
    return idToken;
  } catch (error) {
    if (error instanceof GoogleAdminOidcError) {
      throw error;
    }
    throw new GoogleAdminOidcError("provider_error");
  }
}

function readStringClaim(payload: JWTPayload, name: string): string | null {
  const value = payload[name];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function mapJoseVerificationError(error: unknown): GoogleAdminOidcError {
  if (error instanceof errors.JWTExpired) {
    return new GoogleAdminOidcError("id_token_expired");
  }
  if (error instanceof errors.JWTClaimValidationFailed) {
    if (error.claim === "iss") {
      return new GoogleAdminOidcError("id_token_issuer_invalid");
    }
    if (error.claim === "aud") {
      return new GoogleAdminOidcError("id_token_audience_invalid");
    }
    return new GoogleAdminOidcError("id_token_invalid");
  }
  if (error instanceof errors.JWSSignatureVerificationFailed) {
    return new GoogleAdminOidcError("id_token_signature_invalid");
  }
  if (error instanceof errors.JWKSTimeout) {
    return new GoogleAdminOidcError("provider_unavailable");
  }
  return new GoogleAdminOidcError("id_token_invalid");
}

export async function verifyGoogleOidcCode(
  code: string,
  transaction: Pick<GoogleOidcTransaction, "nonce" | "codeVerifier">,
): Promise<VerifiedGoogleAdminOidcIdentity> {
  const config = readGoogleAdminOidcConfig();
  if (!config) {
    configInvalid();
  }

  const idToken = await exchangeGoogleCode(
    config,
    code,
    transaction.codeVerifier,
  );

  let payload: JWTPayload;
  try {
    const googleJwks = createRemoteJWKSet(GOOGLE_OIDC_JWKS_ENDPOINT, {
      timeoutDuration: GOOGLE_OIDC_TIMEOUT_MS,
    });
    ({ payload } = await jwtVerify(idToken, googleJwks, {
      algorithms: ["RS256"],
      issuer: GOOGLE_OIDC_ISSUER,
      audience: config.clientId,
      requiredClaims: ["exp", "iat"],
    }));
  } catch (error) {
    throw mapJoseVerificationError(error);
  }

  if (payload.aud !== config.clientId) {
    throw new GoogleAdminOidcError("id_token_audience_invalid");
  }
  if (
    payload.azp !== undefined &&
    (typeof payload.azp !== "string" || payload.azp !== config.clientId)
  ) {
    throw new GoogleAdminOidcError("id_token_audience_invalid");
  }

  const tokenNonce = readStringClaim(payload, "nonce");
  if (
    !tokenNonce ||
    !(await constantTimeEqual(tokenNonce, transaction.nonce))
  ) {
    throw new GoogleAdminOidcError("nonce_mismatch");
  }

  const subject = readStringClaim(payload, "sub");
  const rawEmail = readStringClaim(payload, "email");
  const email = rawEmail ? normalizeEmail(rawEmail) : null;
  if (
    !subject ||
    subject.length > 255 ||
    !/^[\x20-\x7e]+$/.test(subject) ||
    !email
  ) {
    throw new GoogleAdminOidcError("identity_invalid");
  }
  if (payload.email_verified !== true) {
    throw new GoogleAdminOidcError("email_unverified");
  }

  const hostedDomain = readStringClaim(payload, "hd");
  if (
    !hostedDomain ||
    normalizeDomain(hostedDomain) !== config.workspaceDomain
  ) {
    throw new GoogleAdminOidcError("workspace_domain_mismatch");
  }
  if (!config.adminEmailAllowlist.has(email)) {
    throw new GoogleAdminOidcError("email_not_authorized");
  }

  const subjectIdentity = `${GOOGLE_OIDC_ISSUER}#${subject}`;
  const sessionHash = (await sha256Hex(subjectIdentity)).slice(0, 16);
  const name = readStringClaim(payload, "name");

  return {
    provider: GOOGLE_OIDC_PROVIDER,
    issuer: GOOGLE_OIDC_ISSUER,
    actor: `oidc:${subjectIdentity}`,
    subject,
    email,
    name,
    workspaceDomain: config.workspaceDomain,
    sessionHash,
  };
}
