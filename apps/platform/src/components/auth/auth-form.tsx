"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/form-controls";
import { useAuthForm, type AuthMode } from "./use-auth-form";

function PasswordField({ mode, password, setPassword }: {
  mode: AuthMode;
  password: string;
  setPassword: (value: string) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <Label htmlFor="password">Password</Label>
        {mode === "sign-in" ? (
          <Link href="/forgot-password" className="mb-2 text-xs font-semibold text-orange-dark hover:underline">
            Forgot password?
          </Link>
        ) : null}
      </div>
      <Input
        id="password"
        type="password"
        autoComplete={mode === "register" ? "new-password" : "current-password"}
        minLength={6}
        required
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
    </div>
  );
}

export function AuthForm({ mode, nextPath = "/portal" }: { mode: AuthMode; nextPath?: string }) {
  const form = useAuthForm(mode, nextPath);

  return (
    <form onSubmit={form.submit} className="space-y-5" noValidate>
      {mode === "register" ? (
        <div>
          <Label htmlFor="display-name">Full name</Label>
          <Input
            id="display-name"
            autoComplete="name"
            required
            value={form.displayName}
            onChange={(event) => form.setDisplayName(event.target.value)}
          />
        </div>
      ) : null}
      <div>
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={form.email}
          onChange={(event) => form.setEmail(event.target.value)}
        />
      </div>
      <PasswordField mode={mode} password={form.password} setPassword={form.setPassword} />
      {form.error ? <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{form.error}</p> : null}
      {form.notice ? <p role="status" className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800">{form.notice}</p> : null}
      <Button type="submit" className="w-full" disabled={form.busy}>
        {form.busy ? "Please wait…" : mode === "register" ? "Create account" : "Sign in"}
      </Button>
      <p className="text-center text-sm text-slate-600">
        {mode === "register" ? "Already registered?" : "New to SME Fund?"}{" "}
        <Link className="font-semibold text-orange-dark hover:underline" href={mode === "register" ? "/sign-in" : "/register"}>
          {mode === "register" ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </form>
  );
}
