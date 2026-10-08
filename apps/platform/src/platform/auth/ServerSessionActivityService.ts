import "server-only";

import { createHash } from "node:crypto";

import {
  deleteUserSession,
  findActiveUserSession,
  registerUserSession,
  renewUserSession,
} from "@/modules/users/infrastructure/UserSessionRepository";
import { getSessionCookieName, readCookie } from "@/auth/firebase/cookies";

import { sessionIdleMilliseconds } from "./SessionPolicy";

export function hashSessionCookie(sessionCookie: string) {
  return createHash("sha256").update(sessionCookie).digest("hex");
}

export function findActiveApplicationSession(
  sessionCookie: string,
  firebaseSubject: string,
) {
  return findActiveUserSession(hashSessionCookie(sessionCookie), firebaseSubject);
}

export function registerApplicationSession(input: {
  sessionCookie: string;
  userId: string;
  firebaseSubject: string;
  absoluteExpiresAt: Date;
}) {
  return registerUserSession({
    sessionHash: hashSessionCookie(input.sessionCookie),
    userId: input.userId,
    firebaseSubject: input.firebaseSubject,
    absoluteExpiresAt: input.absoluteExpiresAt,
    idleMilliseconds: sessionIdleMilliseconds,
  });
}

export function renewApplicationSession(
  sessionCookie: string,
  firebaseSubject: string,
  idleForMilliseconds: number,
) {
  return renewUserSession(
    hashSessionCookie(sessionCookie),
    firebaseSubject,
    sessionIdleMilliseconds - idleForMilliseconds,
  );
}

export async function endApplicationSession(requestHeaders: Headers) {
  const sessionCookie = readCookie(
    requestHeaders.get("cookie"),
    getSessionCookieName(),
  );
  if (sessionCookie) {
    await deleteUserSession(hashSessionCookie(sessionCookie));
  }
}
