import { NextResponse } from "next/server";

import {
  authEmailErrorResponse,
  hasAuthEmailCsrf,
  verificationEmailRequestSchema,
} from "@/platform/auth/api/AuthEmailRequest";
import { requestVerificationEmail } from "@/platform/auth/firebase/ServerAuthEmailService";

export async function POST(request: Request) {
  const parsed = verificationEmailRequestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  if (!hasAuthEmailCsrf(request, parsed.data.csrfToken)) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }
  try {
    await requestVerificationEmail(parsed.data.idToken);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return authEmailErrorResponse(error);
  }
}
