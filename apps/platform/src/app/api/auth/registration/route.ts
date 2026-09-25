import { NextResponse } from "next/server";
import { z } from "zod";

import { csrfTokensMatch } from "@/auth/csrf/verify-token";
import { registrationSchema } from "@/auth/firebase/auth-form.schemas";
import { csrfCookieName, readCookie } from "@/auth/firebase/cookies";
import { createAccount } from "@/modules/users/ServerRegistrationService";

const requestSchema = z.object({
  csrfToken: z.string().min(1),
  registration: registrationSchema,
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const csrfCookie = readCookie(request.headers.get("cookie"), csrfCookieName);

  if (!csrfTokensMatch(csrfCookie, parsed.data.csrfToken)) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  try {
    await createAccount(parsed.data.registration);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const emailExists =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      String(error.code) === "auth/email-already-exists";
    const message = emailExists
      ? "An account already exists for this email address."
      : "We could not create your account. Please try again.";

    return NextResponse.json(
      { error: message },
      { status: emailExists ? 409 : 503 },
    );
  }
}
