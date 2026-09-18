import { invitationReturn } from '../../lib/invitation-return';
import { getSignInUrl } from "@workos-inc/authkit-nextjs";
import { redirect } from "next/navigation";
import { authConfiguration } from "../../lib/auth-config";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const { callback } = authConfiguration();
  redirect(await getSignInUrl({ returnTo: invitationReturn(new URL(request.url).searchParams.get("returnTo")), redirectUri: callback }));
}
