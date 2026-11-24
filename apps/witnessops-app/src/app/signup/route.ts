import { invitationReturn } from '../../lib/invitation-return';
import { getSignUpUrl } from "@workos-inc/authkit-nextjs";
import { redirect } from "next/navigation";
import { authConfiguration } from "../../lib/auth-config";
import { appAuthMode } from "../../lib/auth-mode";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (appAuthMode() === "keycloak") return Response.json({ error: "Account registration is unavailable. Linked members can sign in at /login." },
    { status: 403, headers: { "Cache-Control": "no-store" } });
  const { callback } = authConfiguration();
  redirect(await getSignUpUrl({ returnTo: invitationReturn(new URL(request.url).searchParams.get("returnTo")), redirectUri: callback }));
}
