// Keycloak being unreachable is not an invalid token. A 401 plus
// WWW-Authenticate would send the client into a fresh login loop.
export const IDP_RETRY_AFTER_SECONDS = 30;

const UNREACHABLE_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ENOTFOUND',
  'EAI_AGAIN',
  'ETIMEDOUT',
  'EHOSTUNREACH',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_SOCKET',
  'UND_ERR_HEADERS_TIMEOUT',
  'ERR_JWKS_TIMEOUT',
]);

export function isIdpUnreachable(error) {
  if (!error || typeof error !== 'object') return false;
  if (error.name === 'TimeoutError' || error.name === 'AbortError') return true;
  if (UNREACHABLE_CODES.has(String(error.code || ''))) return true;
  if (error.cause && error.cause !== error && isIdpUnreachable(error.cause)) return true;
  return false;
}

export function jwtFailure(error, context = {}) {
  const jwksStatus = Number(context.jwksStatus || 0);
  if (jwksStatus >= 500 || isIdpUnreachable(error)) {
    return { status: 503, retryAfter: IDP_RETRY_AFTER_SECONDS, error: 'idp_unavailable' };
  }
  return { status: 401, error: 'invalid_token', why: error?.code || 'jwt_invalid', challenge: true };
}

export function introspectionFailure({ thrown, status = 0, body, claims, resourceMatches }) {
  if (thrown || status >= 500) {
    return { status: 503, retryAfter: IDP_RETRY_AFTER_SECONDS, error: 'idp_unavailable' };
  }
  if (!body || body.active !== true) return { status: 401, error: 'invalid_token', why: 'inactive', challenge: true };
  if (body.sub !== claims.sub) return { status: 401, error: 'invalid_token', why: 'inactive_subject', challenge: true };
  if (body.iss !== undefined && body.iss !== claims.iss) return { status: 401, error: 'invalid_token', why: 'inactive_issuer', challenge: true };
  if (!resourceMatches) return { status: 401, error: 'invalid_token', why: 'inactive_audience', challenge: true };
  return { ok: true };
}

export function authDenial(outcome) {
  if (outcome.status === 503) {
    return {
      status: 503,
      body: { error: 'idp_unavailable' },
      headers: { 'Retry-After': String(outcome.retryAfter || IDP_RETRY_AFTER_SECONDS) },
      challenge: false,
    };
  }
  return {
    status: outcome.status,
    challenge: true,
    error: outcome.error,
    why: outcome.why,
  };
}
