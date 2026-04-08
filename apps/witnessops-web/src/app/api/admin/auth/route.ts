import { NextRequest, NextResponse } from "next/server";
import { createAdminSessionCookie } from "@/lib/server/admin-session";
import { readAdminOidcConfig } from "@/lib/server/admin-oidc";

async function sha256Hex(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function POST(request: NextRequest) {
  if (readAdminOidcConfig()) {
    return NextResponse.json(
      { error: "Admin OIDC is configured; use the OIDC login entry." },
      { status: 409 },
    );
  }

  const expectedHash = process.env.WITNESSOPS_ADMIN_KEY_HASH;
  const secret = process.env.WITNESSOPS_ADMIN_SECRET;

  if (!expectedHash || !secret) {
    return NextResponse.json(
      { error: "Server misconfiguration" },
      { status: 500 },
    );
  }

  let body: { key?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!body.key || typeof body.key !== "string") {
    return NextResponse.json({ error: "Key required" }, { status: 400 });
  }

  const hash = await sha256Hex(body.key);

  if (hash !== expectedHash) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Build signed session cookie
  const payload = {
    hash: hash.slice(0, 16),
    exp: Date.now() + 8 * 60 * 60 * 1000, // 8 hours
  };
  const cookieValue = await createAdminSessionCookie(payload);

  const response = NextResponse.json({ ok: true });
  response.cookies.set("witnessops-admin-session", cookieValue, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: 28800, // 8 hours
  });

  return response;
}
