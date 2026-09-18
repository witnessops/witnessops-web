import { invitationReturn } from '../../lib/invitation-return';
import { getSignUpUrl } from "@workos-inc/authkit-nextjs";
import { redirect } from "next/navigation";
import { authConfiguration } from "../../lib/auth-config";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { callback } = authConfiguration();
  redirect(await getSignUpUrl({ returnTo: invitationReturn(new URL(request.url).searchParams.get("returnTo")), redirectUri: callback }));
}
