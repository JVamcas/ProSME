import "server-only";

import { headers } from "next/headers";
import { cache } from "react";

import { findUserByFirebaseSubject } from "@/db/repositories/UserRepository";
import {
  verifyFirebaseSessionFromHeaders,
  type FirebaseSessionVerificationOptions,
} from "@/platform/auth/firebase/ServerFirebaseSession";
import type { AuthenticatedUser } from "../types";

export async function resolveUserFromHeaders(
  requestHeaders: Headers,
  verification?: FirebaseSessionVerificationOptions,
): Promise<AuthenticatedUser | null> {
  const identity = await verifyFirebaseSessionFromHeaders(
    requestHeaders,
    verification,
  );
  if (!identity) return null;
  return findUserByFirebaseSubject(identity.uid);
}

export const getCurrentUser = cache(async function getCurrentUser() {
  return resolveUserFromHeaders(await headers());
});
