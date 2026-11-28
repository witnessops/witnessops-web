import { invitationReturn } from '../../lib/invitation-return';
import { getSignInUrl } from "@workos-inc/authkit-nextjs";
import { redirect } from "next/navigation";
import { authConfiguration } from "../../lib/auth-config";
import { appAuthMode } from "../../lib/auth-mode";
import { startKeycloakLogin } from "../../lib/keycloak-auth-flow";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const returnPath = invitationReturn(new URL(request.url).searchParams.get("returnTo"));
  if (appAuthMode() === "keycloak") return startKeycloakLogin(returnPath);
  const { callback } = authConfiguration();
  redirect(await getSignInUrl({ returnTo: returnPath, redirectUri: callback }));
}
