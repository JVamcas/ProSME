import "server-only";

import type { DecodedIdToken } from "firebase-admin/auth";

import { getServerEnvironment } from "@/lib/env/server";
import { getFirebaseAdminAuth } from "@/auth/firebase/admin";
import { getSessionCookieName, readCookie } from "@/auth/firebase/cookies";
import { measureAuthenticationVerification } from "@/platform/monitoring/ServerAuthenticationTiming";
import { findActiveApplicationSession } from "@/platform/auth/ServerSessionActivityService";

export type FirebaseSessionVerificationOptions = { checkRevoked?: boolean };

export function getSessionDurationMilliseconds() {
  return getServerEnvironment().SESSION_COOKIE_DAYS * 24 * 60 * 60 * 1000;
}

export async function createFirebaseSession(
  idToken: string,
  options?: FirebaseSessionVerificationOptions,
) {
  const auth = getFirebaseAdminAuth();
  const maxAge = getSessionDurationMilliseconds();
  const [decodedToken, sessionCookie] = await Promise.all([
    measureAuthenticationVerification(
      "id-token",
      Boolean(options?.checkRevoked),
      () =>
        options?.checkRevoked
          ? auth.verifyIdToken(idToken, true)
          : auth.verifyIdToken(idToken),
    ),
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
  options?: FirebaseSessionVerificationOptions,
): Promise<DecodedIdToken> {
  const auth = getFirebaseAdminAuth();
  return measureAuthenticationVerification(
    "session-cookie",
    Boolean(options?.checkRevoked),
    () =>
      options?.checkRevoked
        ? auth.verifySessionCookie(sessionCookie, true)
        : auth.verifySessionCookie(sessionCookie),
  );
}

export async function verifyFirebaseSessionFromHeaders(
  headers: Headers,
  options?: FirebaseSessionVerificationOptions,
): Promise<DecodedIdToken | null> {
  const sessionCookie = readCookie(
    headers.get("cookie"),
    getSessionCookieName(),
  );

  if (!sessionCookie) {
    return null;
  }

  try {
    const identity = await verifyFirebaseSessionCookie(sessionCookie, options);
    const session = await findActiveApplicationSession(sessionCookie, identity.uid);
    return session ? identity : null;
  } catch {
    return null;
  }
}
