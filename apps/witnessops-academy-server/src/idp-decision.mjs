import { ResponseBodyError } from 'openid-client';

export function idpFailureAction(error) {
  if (error instanceof ResponseBodyError && (error.error === 'invalid_grant' || error.error === 'invalid_token')) {
    return 'revoke';
  }
  return 'unavailable';
}

// status 0 means the IdP was not reached. The local session is already revoked by the caller.
export function idpLogoutReport(status) {
  if (status >= 200 && status < 300) {
    return { httpStatus: 200, body: { ok: true, idp_logout: 'complete', idp_logout_status: status } };
  }
  if (!status) {
    return { httpStatus: 502, body: { ok: false, idp_logout: 'pending', idp_logout_status: 0 } };
  }
  return { httpStatus: 502, body: { ok: false, idp_logout: 'failed', idp_logout_status: status } };
}
