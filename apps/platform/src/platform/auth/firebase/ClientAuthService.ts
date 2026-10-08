"use client";

import {
  applyActionCode,
  checkActionCode,
  confirmPasswordReset,
  verifyPasswordResetCode,
  signInWithEmailAndPassword,
  signOut,
  reload,
} from "firebase/auth";

import { postJson, requestJson } from "@/lib/client-http";
import { getFirebaseClientAuth } from "@/auth/firebase/client";
import { clientSessionService } from "@/platform/auth/ClientSessionService";

type RegisterAccountInput = {
  confirmPassword: string;
  email: string;
  firstName: string;
  password: string;
  surname: string;
};

type SignInInput = {
  email: string;
  password: string;
};

type PasswordResetInput = {
  email: string;
};

type CsrfResponse = {
  token: string;
};

type SessionResponse = {
  defaultPath: string;
};

export type EmailVerificationStatus = {
  email: string;
  verified: boolean;
};

async function getCsrfToken() {
  const response = await requestJson<CsrfResponse>("/api/auth/session", {
    cache: "no-store",
  });
  return response.token;
}

async function establishServerSession(idToken: string) {
  return postJson<SessionResponse, { csrfToken: string; idToken: string }>(
    "/api/auth/session",
    {
      csrfToken: await getCsrfToken(),
      idToken,
    },
  );
}

async function getPendingVerificationUser() {
  const auth = await getFirebaseClientAuth();
  await auth.authStateReady();

  if (!auth.currentUser) {
    throw new Error("verification-session-missing");
  }

  return auth.currentUser;
}

async function registerAccount(input: RegisterAccountInput) {
  const csrfToken = await getCsrfToken();
  await postJson("/api/auth/registration", {
    csrfToken,
    registration: input,
  });

  const auth = await getFirebaseClientAuth();
  const credential = await signInWithEmailAndPassword(
    auth,
    input.email.trim(),
    input.password,
  );
  await requestVerificationForUser(credential.user);
}

async function getEmailVerificationStatus(): Promise<EmailVerificationStatus> {
  const user = await getPendingVerificationUser();
  await reload(user);

  return {
    email: user.email ?? "",
    verified: user.emailVerified,
  };
}

async function resendVerificationEmail() {
  const user = await getPendingVerificationUser();
  await requestVerificationForUser(user);
}

async function completeEmailVerification() {
  const auth = await getFirebaseClientAuth();
  const status = await getEmailVerificationStatus();

  if (status.verified) {
    await signOut(auth);
  }

  return status.verified;
}

async function signIn(input: SignInInput) {
  const auth = await getFirebaseClientAuth();
  const credential = await signInWithEmailAndPassword(
    auth,
    input.email.trim(),
    input.password,
  );

  if (!credential.user.emailVerified) {
    await requestVerificationForUser(credential.user);
    throw new Error("email-not-verified");
  }

  const session = await establishServerSession(
    await credential.user.getIdToken(),
  );
  await signOut(auth);
  return session;
}

async function logout() {
  await postJson("/api/auth/logout", {
    csrfToken: await getCsrfToken(),
  });
  clientSessionService.announceEnded();
}

async function requestPasswordReset(input: PasswordResetInput) {
  await postJson("/api/auth/password-reset", {
    csrfToken: await getCsrfToken(),
    email: input.email.trim(),
  });
}

async function requestVerificationForUser(user: {
  getIdToken: (forceRefresh?: boolean) => Promise<string>;
}) {
  await postJson("/api/auth/verification-email", {
    csrfToken: await getCsrfToken(),
    idToken: await user.getIdToken(true),
  });
}

async function verifyEmailAction(code: string) {
  const auth = await getFirebaseClientAuth();
  const action = await checkActionCode(auth, code);
  if (action.operation !== "VERIFY_EMAIL")
    throw new Error("unsupported-action");
  await applyActionCode(auth, code);
  await auth.authStateReady();
  if (auth.currentUser) {
    await reload(auth.currentUser);
    await auth.currentUser.getIdToken(true);
  }
}

async function checkPasswordResetCode(code: string) {
  return verifyPasswordResetCode(await getFirebaseClientAuth(), code);
}

async function resetPassword(code: string, password: string) {
  await confirmPasswordReset(await getFirebaseClientAuth(), code, password);
}

export const authClientService = {
  verifyEmailAction,
  checkPasswordResetCode,
  resetPassword,
  completeEmailVerification,
  getEmailVerificationStatus,
  logout,
  registerAccount,
  resendVerificationEmail,
  requestPasswordReset,
  signIn,
};
