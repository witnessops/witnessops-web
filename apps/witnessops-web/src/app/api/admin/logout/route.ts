import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/admin/login";

  const response = NextResponse.redirect(url, 303);
  response.cookies.set("witnessops-admin-session", "", {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/admin",
    maxAge: 0,
  });
  return response;
}
