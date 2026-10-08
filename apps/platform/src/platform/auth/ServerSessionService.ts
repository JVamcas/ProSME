import "server-only";

import { provisionApplicant } from "@/db/repositories/UserRepository";
import {
  createFirebaseSession,
  verifyFirebaseSessionCookie,
} from "./firebase/ServerFirebaseSession";
import { getSessionCookieName, readCookie } from "@/auth/firebase/cookies";
import {
  findActiveApplicationSession,
  registerApplicationSession,
  renewApplicationSession,
} from "./ServerSessionActivityService";

const maximumAuthenticationAge = 5 * 60 * 1000;

export class RecentAuthenticationRequiredError extends Error {
  constructor() {
    super("Recent authentication is required");
    this.name = "RecentAuthenticationRequiredError";
  }
}

export async function establishApplicationSession(idToken: string) {
  const startedAt = Date.now();
  const firebaseSession = await createFirebaseSession(idToken);
  const { decodedToken } = firebaseSession;
  const authenticatedAt = decodedToken.auth_time * 1000;

  if (Date.now() - authenticatedAt > maximumAuthenticationAge) {
    throw new RecentAuthenticationRequiredError();
  }

  const user = await provisionApplicant({
    subject: decodedToken.uid,
    email: decodedToken.email!,
    displayName: decodedToken.name ?? decodedToken.email!,
    emailVerified: decodedToken.email_verified ?? false,
  });

  if (user.status !== "active") {
    throw new Error("An active account is required");
  }

  const session = await registerApplicationSession({
    sessionCookie: firebaseSession.sessionCookie,
    userId: user.id,
    firebaseSubject: decodedToken.uid,
    absoluteExpiresAt: new Date(startedAt + firebaseSession.maxAge),
  });

  return {
    maxAge: Math.max(0, session.expiresAt.getTime() - Date.now()),
    sessionCookie: firebaseSession.sessionCookie,
    user,
  };
}

export async function readSessionActivity(requestHeaders: Headers) {
  return sessionActivity(requestHeaders, false);
}

export async function renewSessionActivity(
  requestHeaders: Headers,
  idleForMilliseconds: number,
) {
  return sessionActivity(requestHeaders, true, idleForMilliseconds);
}

async function sessionActivity(
  requestHeaders: Headers,
  renew: boolean,
  idleForMilliseconds = 0,
) {
  const sessionCookie = readCookie(
    requestHeaders.get("cookie"),
    getSessionCookieName(),
  );
  if (!sessionCookie) {
    return null;
  }

  let identity;
  try {
    identity = await verifyFirebaseSessionCookie(sessionCookie, {
      checkRevoked: true,
    });
  } catch {
    return null;
  }

  const session = renew
    ? await renewApplicationSession(sessionCookie, identity.uid, idleForMilliseconds)
    : await findActiveApplicationSession(sessionCookie, identity.uid);
  if (!session) {
    return null;
  }
  return { expiresAt: session.expiresAt.getTime(), sessionCookie };
}
