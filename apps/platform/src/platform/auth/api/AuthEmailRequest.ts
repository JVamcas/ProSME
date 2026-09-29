import { NextResponse } from "next/server";
import { z } from "zod";

import { csrfTokensMatch } from "@/auth/csrf/verify-token";
import { csrfCookieName, readCookie } from "@/auth/firebase/cookies";
import { AuthEmailRequestError } from "../firebase/ServerAuthEmailService";

export const verificationEmailRequestSchema = z
  .object({
    csrfToken: z.string().min(1),
    idToken: z.string().min(1).max(16_000),
  })
  .strict();

export function hasAuthEmailCsrf(request: Request, csrfToken: string) {
  return csrfTokensMatch(
    readCookie(request.headers.get("cookie"), csrfCookieName),
    csrfToken,
  );
}

export function authEmailErrorResponse(error: unknown) {
  if (error instanceof AuthEmailRequestError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  }
  return NextResponse.json(
    { error: "We could not send that email. Please try again later." },
    { status: 503 },
  );
}
