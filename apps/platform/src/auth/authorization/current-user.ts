import "server-only";

import { headers } from "next/headers";

import { findUserByFirebaseSubject } from "@/db/repositories/user.repository";
import { verifyFirebaseSessionFromHeaders } from "../firebase/session";
import type { AuthenticatedUser } from "../types";

export async function resolveUserFromHeaders(requestHeaders: Headers): Promise<AuthenticatedUser | null> {
  const identity = await verifyFirebaseSessionFromHeaders(requestHeaders);
  if (!identity) return null;
  return findUserByFirebaseSubject(identity.uid);
}

export async function getCurrentUser() {
  return resolveUserFromHeaders(await headers());
}
