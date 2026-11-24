import { ACCOUNT_ROUTE } from './account-page.mjs';
import { DEFAULT_LESSON, lessonById } from './lesson-routes.mjs';

export function authorizationIntent(registration = false) {
  return registration === true ? { scope: 'openid email', prompt: 'create' } : { scope: 'openid' };
}

// The encrypted preauth cookie may carry only this extra fixed return target.
// Neither a URL parameter nor a provider response can nominate a destination.
export function loginDestination(context) {
  return context.returnTo === 'account' ? ACCOUNT_ROUTE
    : (lessonById(context.lessonId) || DEFAULT_LESSON).route;
}

export function registrationClaimsAccepted(context, claims) {
  return context.registration !== true || claims?.email_verified === true;
}
