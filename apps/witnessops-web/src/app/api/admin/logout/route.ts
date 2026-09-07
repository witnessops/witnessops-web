import { NextRequest, NextResponse } from "next/server";
import {
  buildAdminPublicUrl,
  isTrustedAdminMutationOrigin,
} from "@/lib/admin-auth-origin";
import { GOOGLE_OIDC_TRANSACTION_COOKIE_NAME } from "@/lib/server/admin-google-oidc";
import { ADMIN_SESSION_COOKIE_NAME } from "@/lib/server/admin-session";
import { revokeAdminSessionCookie } from "@/lib/server/admin-session-revocation";

export async function POST(request: NextRequest) {
  if (!isTrustedAdminMutationOrigin(request)) {
    return NextResponse.json(
      { ok: false, error: "Invalid request origin." },
      {
        status: 403,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  const cookie = request.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value;
  try {
    if (cookie) await revokeAdminSessionCookie(cookie);
  } catch {
    return NextResponse.json(
      { ok: false, error: "Unable to end the session. Please retry logout." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const url = buildAdminPublicUrl("/admin/login", request);

  const response = NextResponse.redirect(url, 303);
  response.headers.set("Cache-Control", "no-store");
  response.cookies.set(ADMIN_SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
  response.cookies.set(GOOGLE_OIDC_TRANSACTION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/api/admin/google",
    maxAge: 0,
  });
  return response;
}
