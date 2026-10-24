/**
 * Microsoft Entra admin sign-in constants with no provider SDK imports.
 * Middleware reaches this module through the session cookie verifier.
 */

export const ENTRA_ADMIN_ENABLED_ENV = "WITNESSOPS_ADMIN_ENTRA_ENABLED";
export const ENTRA_OIDC_REDIRECT_URI =
  "https://witnessops.com/api/admin/entra/callback";
export const ENTRA_NOT_CONFIGURED_ERROR = "entra_not_configured";
export const ENTRA_AUTH_FAILED_ERROR = "entra_auth_failed";

/** Microsoft account / personal tenant. Single-tenant admin sign-in rejects it. */
export const PERSONAL_ACCOUNT_TENANT_ID =
  "9188040d-6c67-4c5b-b112-36a3a6521ec5";

const ENTRA_GUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * Only the exact value "1" enables Entra. Unset and every other value stay off.
 * Computed env access stays out of the build-time inliner.
 */
export function isAdminEntraEnabled(
  value: string | undefined = process.env[ENTRA_ADMIN_ENABLED_ENV],
): boolean {
  return value === "1";
}

export function normalizeEntraGuid(value: string): string | null {
  const normalized = value.trim().toLowerCase();
  if (!ENTRA_GUID_PATTERN.test(normalized)) return null;
  return normalized;
}

export function canonicalEntraIssuer(tenantId: string): string | null {
  const normalized = normalizeEntraGuid(tenantId);
  if (!normalized || normalized === PERSONAL_ACCOUNT_TENANT_ID) return null;
  return `https://login.microsoftonline.com/${normalized}/v2.0`;
}

export function parseCanonicalEntraIssuer(issuer: string): string | null {
  const match =
    /^https:\/\/login\.microsoftonline\.com\/([0-9a-fA-F-]{36})\/v2\.0$/.exec(
      issuer,
    );
  if (!match) return null;
  const canonical = canonicalEntraIssuer(match[1]);
  if (!canonical || canonical !== issuer.toLowerCase()) return null;
  return canonical;
}

export function entraActor(issuer: string, oid: string): string {
  return `oidc:${issuer}#${oid}`;
}
