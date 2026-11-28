import { ACCOUNT_ROUTE } from './account-page.mjs';
import { DEFAULT_LESSON, lessonById } from './lesson-routes.mjs';
import { TEAMS_LINK_ROUTE } from './teams-link-page.mjs';
import { isCanonicalTeamsLinkToken } from './preauth-cookie.mjs';

export function authorizationIntent(registration = false) {
  return registration === true ? { scope: 'openid email', prompt: 'create' } : { scope: 'openid' };
}

// The encrypted preauth cookie may carry only this extra fixed return target.
// Neither a URL parameter nor a provider response can nominate a destination.
export function loginDestination(context) {
  return context.returnTo === 'teams-link' && isCanonicalTeamsLinkToken(context.teamsLinkToken)
    ? `${TEAMS_LINK_ROUTE}#token=${context.teamsLinkToken}`
    : context.returnTo === 'account' ? ACCOUNT_ROUTE
    : (lessonById(context.lessonId) || DEFAULT_LESSON).route;
}

// Normal Academy login keeps the established insert-if-absent behavior. A
// Teams-link login is intentionally narrower: it may select only an identity
// that already exists, so the bridge cannot create a second learner record.
export async function resolveLoginIdentity(db, claims, context = {}) {
  if (context.returnTo !== 'teams-link') {
    await db.query(
      'INSERT INTO academy_identities(issuer, subject) VALUES ($1,$2) ON CONFLICT (issuer, subject) DO NOTHING',
      [claims.iss, claims.sub],
    );
  }
  const { rows } = await db.query(
    'SELECT id FROM academy_identities WHERE issuer = $1 AND subject = $2',
    [claims.iss, claims.sub],
  );
  return rows[0]?.id ?? null;
}

export function registrationClaimsAccepted(context, claims) {
  return context.registration !== true || claims?.email_verified === true;
}
