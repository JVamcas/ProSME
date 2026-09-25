"use client";

import {
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  reload,
  updateProfile,
} from "firebase/auth";

import { postJson, requestJson } from "@/lib/client-http";
import { getFirebaseClientAuth } from "./client";

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
  await sendEmailVerification(credential.user, {
    url: `${window.location.origin}/verify-email`,
  });
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
  await sendEmailVerification(user, {
    url: `${window.location.origin}/verify-email`,
  });
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
    await sendEmailVerification(credential.user, {
      url: `${window.location.origin}/verify-email`,
    });
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
}

async function requestPasswordReset(input: PasswordResetInput) {
  const auth = await getFirebaseClientAuth();
  await sendPasswordResetEmail(auth, input.email.trim(), {
    url: `${window.location.origin}/sign-in`,
  });
}

export const authClientService = {
  completeEmailVerification,
  getEmailVerificationStatus,
  logout,
  registerAccount,
  resendVerificationEmail,
  requestPasswordReset,
  signIn,
};
