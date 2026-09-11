import { NextResponse } from "next/server";
import { z } from "zod";

import { createCsrfToken } from "@/auth/csrf/create-token";
import { csrfTokensMatch } from "@/auth/csrf/verify-token";
import { csrfCookieName, getSessionCookieName, readCookie } from "@/auth/firebase/cookies";
import { createFirebaseSession } from "@/auth/firebase/session";
import { provisionApplicant } from "@/db/repositories/user.repository";
import { logger } from "@/integrations/monitoring/logger";

const requestSchema = z.object({
  idToken: z.string().min(1),
  csrfToken: z.string().min(1),
});

export const dynamic = "force-dynamic";

export function GET() {
  const token = createCsrfToken();
  const response = NextResponse.json({ token });
  response.cookies.set(csrfCookieName, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 10 * 60,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const csrfCookie = readCookie(request.headers.get("cookie"), csrfCookieName);
  if (!csrfTokensMatch(csrfCookie, parsed.data.csrfToken)) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  try {
    const { decodedToken, maxAge, sessionCookie } = await createFirebaseSession(parsed.data.idToken);
    const authenticatedAt = decodedToken.auth_time * 1000;
    if (Date.now() - authenticatedAt > 5 * 60 * 1000) {
      return NextResponse.json({ error: "Recent authentication is required" }, { status: 401 });
    }

    const user = await provisionApplicant({
      subject: decodedToken.uid,
      email: decodedToken.email!,
      displayName: decodedToken.name ?? decodedToken.email!,
      emailVerified: decodedToken.email_verified ?? false,
    });

    const response = NextResponse.json({
      user: { id: user.id, email: user.email, displayName: user.displayName, userType: user.userType },
    });
    response.cookies.set(getSessionCookieName(), sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: Math.floor(maxAge / 1000),
    });
    response.cookies.delete(csrfCookieName);
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    logger.warn("auth.session.create_failed", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json({ error: "Unable to establish a session" }, { status: 401 });
  }
}
