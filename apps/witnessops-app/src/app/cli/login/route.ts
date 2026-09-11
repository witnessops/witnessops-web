import { getSignInUrl } from '@workos-inc/authkit-nextjs';
import { redirect } from 'next/navigation';
import { authConfiguration } from '../../../lib/auth-config';
export const dynamic = 'force-dynamic';
export async function GET() {
  redirect(await getSignInUrl({ returnTo: '/cli/authorize', redirectUri: authConfiguration().callback }));
}
