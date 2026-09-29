import "server-only";

import { createHash } from "node:crypto";

import { getFirebaseAdminAuth } from "@/auth/firebase/admin";
import { getServerEnvironment } from "@/lib/env/server";
import { queueAuthenticationEmail } from "@/modules/notifications/application/ServerAuthenticationNotificationService";
import type { AuthenticationEventKey } from "@/modules/notifications/domain/NotificationEvent";
import { consumeAuthEmailRateLimit } from "@/modules/users/infrastructure/AuthEmailRateLimitRepository";

export class AuthEmailRequestError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function firebaseErrorCode(error: unknown): string {
  return typeof error === "object" && error && "code" in error
    ? String(error.code)
    : "";
}

async function rateLimit(key: string, limit: number) {
  const digest = createHash("sha256").update(key).digest("hex");
  return consumeAuthEmailRateLimit(digest, limit);
}

export async function requestVerificationEmail(idToken: string) {
  const auth = getFirebaseAdminAuth();
  let uid: string;
  try {
    uid = (await auth.verifyIdToken(idToken, true)).uid;
  } catch {
    throw new AuthEmailRequestError(
      401,
      "Sign in again to request a verification email.",
    );
  }
  // Unverified identities cannot establish a platform session. This bootstrap
  // operation is restricted to the identity authenticated by the supplied token.
  const user = await auth.getUser(uid);
  if (!user.email || user.disabled) {
    throw new AuthEmailRequestError(
      403,
      "This account cannot request verification.",
    );
  }
  if (user.emailVerified) return;
  if (!(await rateLimit(`verification:${uid}`, 1))) {
    throw new AuthEmailRequestError(
      429,
      "Please wait a minute before requesting another email.",
    );
  }
  await queueAuthenticationEmail("auth.email.verification", {
    firebaseUid: uid,
    recipientEmail: user.email,
    recipientName: user.displayName || user.email,
  });
}

export async function requestPasswordResetEmail(email: string) {
  // Apply the same limits and response for existing and unknown addresses.
  // The global bucket also bounds requests when no trusted client IP is available.
  if (!(await rateLimit("password-reset:global", 100))) {
    throw new AuthEmailRequestError(
      429,
      "Too many requests. Please try again later.",
    );
  }
  const normalizedEmail = email.trim().toLowerCase();
  if (!(await rateLimit(`password-reset:${normalizedEmail}`, 1))) return;
  const auth = getFirebaseAdminAuth();
  let user;
  try {
    user = await auth.getUserByEmail(normalizedEmail);
  } catch (error) {
    if (firebaseErrorCode(error) === "auth/user-not-found") return;
    throw error;
  }
  if (
    user.disabled ||
    !user.providerData.some((provider) => provider.providerId === "password")
  )
    return;
  await queueAuthenticationEmail("auth.password.reset", {
    firebaseUid: user.uid,
    recipientEmail: user.email!,
    recipientName: user.displayName || user.email!,
  });
}

export async function generateAuthenticationActionUrl(input: {
  eventKey: AuthenticationEventKey;
  firebaseUid: string;
  recipientEmail: string;
}) {
  const auth = getFirebaseAdminAuth();
  const user = await auth.getUser(input.firebaseUid);
  if (
    user.disabled ||
    user.email?.toLowerCase() !== input.recipientEmail.toLowerCase() ||
    (input.eventKey === "auth.email.verification" && user.emailVerified)
  ) {
    throw new AuthEmailRequestError(
      403,
      "The account action is no longer available.",
    );
  }
  const baseUrl = getServerEnvironment().APP_PUBLIC_URL;
  const settings = {
    handleCodeInApp: false,
    url: new URL("/sign-in", baseUrl).toString(),
  };
  const generated =
    input.eventKey === "auth.email.verification"
      ? await auth.generateEmailVerificationLink(user.email!, settings)
      : await auth.generatePasswordResetLink(user.email!, settings);
  // Preserve Firebase's secure code, while always linking directly to this app.
  // The server-owned origin avoids dependence on the console action URL setting.
  const generatedUrl = new URL(generated);
  const code = generatedUrl.searchParams.get("oobCode");
  if (!code) throw new Error("Authentication action code is unavailable.");
  const actionUrl = new URL("/auth/action", baseUrl);
  actionUrl.searchParams.set(
    "mode",
    input.eventKey === "auth.email.verification"
      ? "verifyEmail"
      : "resetPassword",
  );
  actionUrl.searchParams.set("oobCode", code);
  return actionUrl.toString();
}
