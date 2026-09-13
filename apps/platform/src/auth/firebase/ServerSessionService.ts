import "server-only";

import { provisionApplicant } from "@/db/repositories/UserRepository";
import { createFirebaseSession } from "./session";

const maximumAuthenticationAge = 5 * 60 * 1000;

export class RecentAuthenticationRequiredError extends Error {
  constructor() {
    super("Recent authentication is required");
    this.name = "RecentAuthenticationRequiredError";
  }
}

export async function establishApplicationSession(idToken: string) {
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

  return {
    maxAge: firebaseSession.maxAge,
    sessionCookie: firebaseSession.sessionCookie,
    user,
  };
}
