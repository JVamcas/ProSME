import "server-only";

import type { DecodedIdToken } from "firebase-admin/auth";

import { getServerEnvironment } from "@/lib/env/server";
import { getFirebaseAdminAuth } from "./admin";
import { getSessionCookieName, readCookie } from "./cookies";

export function getSessionDurationMilliseconds() {
  return getServerEnvironment().SESSION_COOKIE_DAYS * 24 * 60 * 60 * 1000;
}

export async function createFirebaseSession(idToken: string) {
  const auth = getFirebaseAdminAuth();
  const maxAge = getSessionDurationMilliseconds();
  const [decodedToken, sessionCookie] = await Promise.all([
    auth.verifyIdToken(idToken, true),
    auth.createSessionCookie(idToken, {
      expiresIn: maxAge,
    }),
  ]);

  if (!decodedToken.email || !decodedToken.email_verified) {
    throw new Error("A verified email address is required");
  }

  return {
    decodedToken,
    maxAge,
    sessionCookie,
  };
}

export async function verifyFirebaseSessionCookie(
  sessionCookie: string,
): Promise<DecodedIdToken> {
  return getFirebaseAdminAuth().verifySessionCookie(sessionCookie, true);
}

export async function verifyFirebaseSessionFromHeaders(
  headers: Headers,
): Promise<DecodedIdToken | null> {
  const sessionCookie = readCookie(
    headers.get("cookie"),
    getSessionCookieName(),
  );

  if (!sessionCookie) {
    return null;
  }

  try {
    return await verifyFirebaseSessionCookie(sessionCookie);
  } catch {
    return null;
  }
}
