"use client";

import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { getFirebaseClientAuth } from "@/auth/firebase/client";
import { getFirebaseErrorMessage } from "@/auth/firebase/errors";

export type AuthMode = "sign-in" | "register";

async function getCsrfToken() {
  const response = await fetch("/api/auth/session", { cache: "no-store" });
  if (!response.ok) throw new Error("csrf-failed");
  return ((await response.json()) as { token: string }).token;
}

async function establishServerSession(idToken: string) {
  const response = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken, csrfToken: await getCsrfToken() }),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "session-failed");
  }
}

async function register(email: string, password: string, displayName: string) {
  const auth = await getFirebaseClientAuth();
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  await updateProfile(credential.user, { displayName: displayName.trim() });
  await sendEmailVerification(credential.user, {
    url: `${window.location.origin}/verify-email`,
  });
  await signOut(auth);
}

async function signIn(email: string, password: string) {
  const auth = await getFirebaseClientAuth();
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  if (!credential.user.emailVerified) {
    await sendEmailVerification(credential.user, {
      url: `${window.location.origin}/verify-email`,
    });
    await signOut(auth);
    throw new Error("email-not-verified");
  }
  await establishServerSession(await credential.user.getIdToken(true));
  await signOut(auth);
}

export function useAuthForm(mode: AuthMode, nextPath: string) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (mode === "register") {
        await register(email, password, displayName);
        setNotice(
          "Account created. Check your inbox and verify your email before signing in.",
        );
        setPassword("");
      } else {
        await signIn(email, password);
        router.replace(nextPath);
        router.refresh();
      }
    } catch (caught) {
      setError(
        caught instanceof Error && caught.message === "email-not-verified"
          ? "Verify your email before signing in. We sent you a new verification email."
          : getFirebaseErrorMessage(caught),
      );
    } finally {
      setBusy(false);
    }
  }

  return {
    busy,
    displayName,
    email,
    error,
    notice,
    password,
    setDisplayName,
    setEmail,
    setPassword,
    submit,
  };
}
