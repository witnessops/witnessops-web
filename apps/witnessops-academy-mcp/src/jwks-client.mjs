import * as jose from 'jose';

// jose reports any non-200 JWKS response as ERR_JOSE_GENERIC and drops the
// status. The wrapper keeps the status so a 5xx can be an outage, while a
// generic JOSE error stays an invalid token.
export function createRemoteJwks(url, { timeoutMs = 5000 } = {}) {
  let lastStatus = 0;
  const fetchJwks = async (requestUrl, init) => {
    const response = await fetch(requestUrl, init);
    lastStatus = response.status;
    return response;
  };
  const keys = jose.createRemoteJWKSet(url, {
    timeoutDuration: timeoutMs,
    cooldownDuration: 30_000,
    cacheMaxAge: 600_000,
    [jose.customFetch]: fetchJwks,
  });
  return {
    keys,
    status() { return lastStatus; },
  };
}
