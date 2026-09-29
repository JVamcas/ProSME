import { NextResponse } from "next/server";
import { z } from "zod";

import {
  authEmailErrorResponse,
  hasAuthEmailCsrf,
} from "@/platform/auth/api/AuthEmailRequest";
import { passwordResetSchema } from "@/platform/auth/firebase/auth-form.schemas";
import { requestPasswordResetEmail } from "@/platform/auth/firebase/ServerAuthEmailService";

const requestSchema = passwordResetSchema
  .extend({ csrfToken: z.string().min(1) })
  .strict();

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  if (!hasAuthEmailCsrf(request, parsed.data.csrfToken)) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }
  try {
    await requestPasswordResetEmail(parsed.data.email);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return authEmailErrorResponse(error);
  }
}
