import { NextResponse } from "next/server";

import { csrfTokensMatch } from "@/auth/csrf/verify-token";
import { csrfCookieName, getSessionCookieName, readCookie } from "@/auth/firebase/cookies";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { csrfToken?: string } | null;
  const csrfCookie = readCookie(request.headers.get("cookie"), csrfCookieName);
  if (!csrfTokensMatch(csrfCookie, body?.csrfToken ?? null)) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(getSessionCookieName(), "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  response.cookies.delete(csrfCookieName);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
