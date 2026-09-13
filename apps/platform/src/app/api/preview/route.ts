import { draftMode } from "next/headers";
import { NextResponse } from "next/server";

import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  AuthenticationRequiredError,
  PermissionDeniedError,
} from "@/auth/authorization/policy";
import { authorizeContentPreview } from "@/modules/content/ServerContentPreviewService";

function safePath(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export async function GET(request: Request) {
  const user = await resolveUserFromHeaders(request.headers);
  const path = safePath(new URL(request.url).searchParams.get("path"));

  try {
    authorizeContentPreview(user, path);
  } catch (error) {
    const status = error instanceof AuthenticationRequiredError ? 401 : 403;
    if (
      error instanceof AuthenticationRequiredError ||
      error instanceof PermissionDeniedError
    ) {
      return NextResponse.json(
        {
          error: "Content preview access is required",
        },
        {
          status,
        },
      );
    }

    throw error;
  }

  (await draftMode()).enable();
  return NextResponse.redirect(new URL(path, request.url));
}
