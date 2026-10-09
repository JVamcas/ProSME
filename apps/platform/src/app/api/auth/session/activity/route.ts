import { NextResponse } from "next/server";

import { getSessionCookieName } from "@/auth/firebase/cookies";
import {
  isSameOriginSessionActivityRequest,
  sessionActivityRequestSchema,
} from "@/platform/auth/api/SessionActivityRequest";
import {
  readSessionActivity,
  renewSessionActivity,
} from "@/platform/auth/ServerSessionService";

function activityResponse(
  session: Awaited<ReturnType<typeof readSessionActivity>>,
  renew: boolean,
) {
  const response = session
    ? NextResponse.json({ expiresAt: session.expiresAt, serverNow: Date.now() })
    : NextResponse.json({ error: "Session expired. Please sign in again." }, {
        status: 401,
      });
  response.headers.set("Cache-Control", "no-store");
  if (session && renew) {
    response.cookies.set(getSessionCookieName(), session.sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: Math.max(0, Math.floor((session.expiresAt - Date.now()) / 1000)),
    });
  }
  return response;
}

export async function GET(request: Request) {
  return activityResponse(await readSessionActivity(request.headers), false);
}

export async function POST(request: Request) {
  if (!isSameOriginSessionActivityRequest(request)) {
    return NextResponse.json(
      { error: "Invalid session activity request" },
      {
        status: 403,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
  const body = await request.json().catch(() => null);
  const parsed = sessionActivityRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid activity timing" },
      {
        status: 400,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
  return activityResponse(
    await renewSessionActivity(request.headers, parsed.data.idleForMilliseconds),
    true,
  );
}
