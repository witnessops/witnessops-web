import { authkitMiddleware } from "@workos-inc/authkit-nextjs";
import type { NextRequest, NextFetchEvent } from "next/server";
import { authConfiguration } from "./lib/auth-config";

export default function middleware(request: NextRequest, event: NextFetchEvent) {
  if (request.nextUrl.pathname === '/s' || request.nextUrl.pathname === '/api/shared-report') return;
  try { authConfiguration(); } catch { return new Response("App authentication is not configured.", { status: 503 }); }
  return authkitMiddleware({ middlewareAuth: { enabled: false, unauthenticatedPaths: [] } })(request, event);
}
export const config = { runtime: "nodejs", matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
