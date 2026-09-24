import { NextResponse } from "next/server";
import { z } from "zod";

import { getDefaultAuthenticatedPath } from "@/auth/authorization/portal-access";
import { createCsrfToken } from "@/auth/csrf/create-token";
import { csrfTokensMatch } from "@/auth/csrf/verify-token";
import {
  csrfCookieName,
  getSessionCookieName,
  readCookie,
} from "@/auth/firebase/cookies";
import {
  establishApplicationSession,
  RecentAuthenticationRequiredError,
} from "@/auth/firebase/ServerSessionService";

const requestSchema = z.object({
  idToken: z.string().min(1),
  csrfToken: z.string().min(1),
});



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

function sessionResponse(
  session: Awaited<ReturnType<typeof establishApplicationSession>>,
) {
  const response = NextResponse.json({
    user: {
      id: session.user.id,
      email: session.user.email,
      displayName: session.user.displayName,
      userType: session.user.userType,
    },
    defaultPath: getDefaultAuthenticatedPath(session.user),
  });
  response.cookies.set(getSessionCookieName(), session.sessionCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(session.maxAge / 1000),
  });
  response.cookies.delete(csrfCookieName);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function sessionError(error: unknown) {
  const message =
    error instanceof RecentAuthenticationRequiredError
      ? error.message
      : "Unable to establish a session";
  return NextResponse.json(
    {
      error: message,
    },
    {
      status: 401,
    },
  );
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid request",
      },
      {
        status: 400,
      },
    );
  }

  const csrfCookie = readCookie(request.headers.get("cookie"), csrfCookieName);
  if (!csrfTokensMatch(csrfCookie, parsed.data.csrfToken)) {
    return NextResponse.json(
      {
        error: "Invalid CSRF token",
      },
      {
        status: 403,
      },
    );
  }

  try {
    const session = await establishApplicationSession(parsed.data.idToken);
    return sessionResponse(session);
  } catch (error) {
    return sessionError(error);
  }
}
