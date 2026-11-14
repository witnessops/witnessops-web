import { ResponseBodyError } from 'openid-client';

export function idpFailureAction(error) {
  if (error instanceof ResponseBodyError && (error.error === 'invalid_grant' || error.error === 'invalid_token')) {
    return 'revoke';
  }
  return 'unavailable';
}
