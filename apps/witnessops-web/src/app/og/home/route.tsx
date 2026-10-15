import { NextResponse } from "next/server";

import { CANONICAL_ORIGIN } from "@/lib/public-seo";

/**
 * Permanent redirect to the public Open Graph image.
 * Location uses the site metadata base. The request host, Host, and
 * X-Forwarded-Host are not part of the target.
 */
export function GET() {
  return NextResponse.redirect(new URL("/opengraph-image", CANONICAL_ORIGIN), 308);
}
