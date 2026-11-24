import { getSignInUrl } from '@workos-inc/authkit-nextjs';
import { redirect } from 'next/navigation';
import { authConfiguration } from '../../../lib/auth-config';
import { appAuthMode } from '../../../lib/auth-mode';
import { startKeycloakLogin } from '../../../lib/keycloak-auth-flow';
export const dynamic = 'force-dynamic';
export async function GET() {
  if (appAuthMode() === 'keycloak') return startKeycloakLogin('/cli/authorize');
  redirect(await getSignInUrl({ returnTo: '/cli/authorize', redirectUri: authConfiguration().callback }));
}
