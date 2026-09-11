"use client";

import { sendPasswordResetEmail } from "firebase/auth";
import Link from "next/link";
import { FormEvent, useState } from "react";

import { getFirebaseClientAuth } from "@/auth/firebase/client";
import { getFirebaseErrorMessage } from "@/auth/firebase/errors";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/form-controls";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const auth = await getFirebaseClientAuth();
      await sendPasswordResetEmail(auth, email.trim(), {
        url: `${window.location.origin}/sign-in`,
      });
      setMessage("If an account exists for that email, reset instructions have been sent.");
    } catch (caught) {
      setError(getFirebaseErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <Label htmlFor="email">Email address</Label>
        <Input id="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
      </div>
      {error ? <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
      {message ? <p role="status" className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800">{message}</p> : null}
      <Button className="w-full" type="submit" disabled={busy}>{busy ? "Please wait…" : "Send reset instructions"}</Button>
      <Link href="/sign-in" className="block text-center text-sm font-semibold text-orange-dark hover:underline">Return to sign in</Link>
    </form>
  );
}
