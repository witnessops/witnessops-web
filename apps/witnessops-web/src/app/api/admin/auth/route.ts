import { NextRequest, NextResponse } from "next/server";

async function sha256Hex(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function signPayload(payloadB64: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payloadB64),
  );

  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

export async function POST(request: NextRequest) {
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

  const payloadB64 = btoa(JSON.stringify(payload));
  const signature = await signPayload(payloadB64, secret);
  const cookieValue = `${payloadB64}.${signature}`;

  const response = NextResponse.json({ ok: true });
  response.cookies.set("witnessops-admin-session", cookieValue, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/admin",
    maxAge: 28800, // 8 hours
  });

  return response;
}
