import { getSignUpUrl } from "@workos-inc/authkit-nextjs";
import { redirect } from "next/navigation";
import { authConfiguration } from "../../lib/auth-config";

export const dynamic = "force-dynamic";

export async function GET() {
  const { callback } = authConfiguration();
  redirect(await getSignUpUrl({ returnTo: "/", redirectUri: callback }));
}
