import { handleAuth } from "@workos-inc/authkit-nextjs";
import type { NextRequest } from "next/server";
import { authConfiguration } from "../../lib/auth-config";
import { appAuthMode } from "../../lib/auth-mode";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  if (appAuthMode() === "keycloak") return Response.json({ error: "Use the configured Keycloak callback." },
    { status: 404, headers: { "Cache-Control": "no-store" } });
  const { origin } = authConfiguration();
  // SDK owns code exchange, PKCE, state validation and session creation. The
  // fixed base prevents forwarded-host or query-controlled redirect targets.
  return handleAuth({ returnPathname: "/", baseURL: origin,
    onError: () => Response.json({ error: "Sign-in could not complete. Start again from /login." }, { status: 400 }),
  })(request);
}
