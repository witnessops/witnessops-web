import {
  createRemoteJWKSet,
  customFetch,
  decodeProtectedHeader,
  jwtVerify,
} from 'jose';

const UUID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;
const COMPACT_JWT = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
const SAFE_KID = /^[A-Za-z0-9._~-]{1,128}$/;
const SAFE_SUBJECT = /^[\x21-\x7e]{1,256}$/;
const MAX_COMPACT_JWT_LENGTH = 16_384;
const MAX_TOKEN_LIFETIME_SECONDS = 29 * 60 * 60;
const CLOCK_TOLERANCE_SECONDS = 60;
const REQUIRED_SCOPE = 'access_as_user';

export const TEAMS_CLIENT_IDS = Object.freeze([
  '1fec8e78-bce4-4aaf-ab1b-5451cc387264', // Teams desktop and mobile
  '5e3ce6c0-2b1f-4285-8d4b-75ee78787346', // Teams web
]);

const ALLOWED_TEAMS_CLIENT_IDS = new Set(TEAMS_CLIENT_IDS);
const FORBIDDEN_PROTECTED_HEADERS = ['jwk', 'jku', 'x5u', 'crit'];

export class TeamsTokenError extends Error {
  constructor(code, status) {
    super(code);
    this.name = 'TeamsTokenError';
    this.code = code;
    this.status = status;
  }
}

function invalidToken() {
  return new TeamsTokenError('invalid_token', 401);
}

function insufficientScope() {
  return new TeamsTokenError('insufficient_scope', 403);
}

function identityProviderUnavailable() {
  return new TeamsTokenError('identity_provider_unavailable', 503);
}

// This bridge stays closed unless an operator explicitly enables it. Unknown
// values fail startup rather than silently opening or closing the integration.
export function teamsSsoEnabled(value = 'false') {
  if (value !== 'true' && value !== 'false') {
    throw new Error('Invalid Academy Teams SSO setting');
  }
  return value === 'true';
}

function canonicalUuid(value, label) {
  if (typeof value !== 'string' || !UUID.test(value) || value === '00000000-0000-0000-0000-000000000000') {
    throw new Error(`Invalid Academy Teams ${label}`);
  }
  return value;
}

function protectedHeader(token) {
  if (typeof token !== 'string' || token.length === 0 || token.length > MAX_COMPACT_JWT_LENGTH || !COMPACT_JWT.test(token)) {
    throw invalidToken();
  }

  let header;
  try {
    header = decodeProtectedHeader(token);
  } catch {
    throw invalidToken();
  }

  if (header.alg !== 'RS256' || typeof header.kid !== 'string' || !SAFE_KID.test(header.kid)) {
    throw invalidToken();
  }
  if (FORBIDDEN_PROTECTED_HEADERS.some(name => Object.hasOwn(header, name))) {
    throw invalidToken();
  }
  return header;
}

function numericDateClaims(payload, nowSeconds) {
  const values = [payload.iat, payload.nbf, payload.exp];
  if (!values.every(Number.isSafeInteger)) throw invalidToken();
  if (payload.iat > nowSeconds + CLOCK_TOLERANCE_SECONDS) throw invalidToken();
  if (payload.exp <= payload.iat || payload.exp <= payload.nbf) throw invalidToken();
  if (payload.exp - payload.iat > MAX_TOKEN_LIFETIME_SECONDS) throw invalidToken();
  if (payload.exp - payload.nbf > MAX_TOKEN_LIFETIME_SECONDS) throw invalidToken();
}

function isProviderFailure(error, fetchAttempt) {
  if (error?.code === 'ERR_JWKS_TIMEOUT') return true;
  if (!fetchAttempt) return false;
  if (fetchAttempt.error) return true;
  return fetchAttempt.status === 429 || fetchAttempt.status >= 500;
}

/**
 * Create a verifier for one private, single-tenant Teams tab.
 *
 * The injected fetch and clock are test seams only. The JWKS origin and path are
 * always derived from the validated tenant ID and cannot come from the token.
 */
export function createTeamsTokenVerifier({
  tenantId,
  appId,
  fetchImpl = globalThis.fetch,
  now = () => new Date(),
} = {}) {
  const expectedTenantId = canonicalUuid(tenantId, 'tenant ID');
  const expectedAppId = canonicalUuid(appId, 'application ID');
  if (typeof fetchImpl !== 'function') throw new Error('Invalid Academy Teams JWKS fetch implementation');
  if (typeof now !== 'function') throw new Error('Invalid Academy Teams clock');

  const issuer = `https://login.microsoftonline.com/${expectedTenantId}/v2.0`;
  const jwksUrl = new URL(`https://login.microsoftonline.com/${expectedTenantId}/discovery/v2.0/keys`);
  let fetchSequence = 0;
  let lastFetchAttempt = null;

  const fetchJwks = async (url, init) => {
    const sequence = ++fetchSequence;
    try {
      const response = await fetchImpl(url, { ...init, redirect: 'error' });
      lastFetchAttempt = { sequence, status: response.status, error: null };
      return response;
    } catch (error) {
      lastFetchAttempt = { sequence, status: 0, error: true };
      throw error;
    }
  };

  const jwks = createRemoteJWKSet(jwksUrl, {
    timeoutDuration: 5_000,
    cooldownDuration: 30_000,
    cacheMaxAge: 10 * 60_000,
    [customFetch]: fetchJwks,
  });

  return async function verifyTeamsAccessToken(token) {
    protectedHeader(token);

    const startedAtSequence = fetchSequence;
    let currentDate;
    try {
      currentDate = now();
      if (!(currentDate instanceof Date) || !Number.isFinite(currentDate.getTime())) throw new Error('invalid clock');
    } catch {
      throw new Error('Invalid Academy Teams clock result');
    }

    let payload;
    try {
      ({ payload } = await jwtVerify(token, jwks, {
        algorithms: ['RS256'],
        issuer,
        audience: expectedAppId,
        clockTolerance: CLOCK_TOLERANCE_SECONDS,
        currentDate,
        requiredClaims: ['iat', 'nbf', 'exp', 'tid', 'ver', 'oid', 'sub', 'azp'],
      }));
    } catch (error) {
      const fetchAttempt = lastFetchAttempt?.sequence > startedAtSequence ? lastFetchAttempt : null;
      throw isProviderFailure(error, fetchAttempt) ? identityProviderUnavailable() : invalidToken();
    }

    const nowSeconds = Math.floor(currentDate.getTime() / 1000);
    numericDateClaims(payload, nowSeconds);
    if (payload.iss !== issuer || payload.aud !== expectedAppId) throw invalidToken();
    if (payload.tid !== expectedTenantId || payload.ver !== '2.0') throw invalidToken();
    if (typeof payload.oid !== 'string' || !UUID.test(payload.oid) || payload.oid === '00000000-0000-0000-0000-000000000000') {
      throw invalidToken();
    }
    if (typeof payload.sub !== 'string' || !SAFE_SUBJECT.test(payload.sub)) throw invalidToken();
    if (!ALLOWED_TEAMS_CLIENT_IDS.has(payload.azp)) throw invalidToken();
    if (payload.idtyp === 'app') throw invalidToken();
    if (payload.scp === undefined) throw insufficientScope();
    if (typeof payload.scp !== 'string' || payload.scp.length > 2_048) throw invalidToken();
    if (!payload.scp.split(/ +/u).includes(REQUIRED_SCOPE)) throw insufficientScope();

    return {
      tenantId: payload.tid,
      objectId: payload.oid,
      subject: payload.sub,
    };
  };
}
