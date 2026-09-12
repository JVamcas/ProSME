import { draftMode } from "next/headers";
import { NextResponse } from "next/server";

import { capabilities } from "@/auth/authorization/capabilities";
import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import { can } from "@/auth/authorization/policy";

function safePath(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export async function GET(request: Request) {
  const user = await resolveUserFromHeaders(request.headers);
  if (!can(user, capabilities.contentUpdate)) {
    return NextResponse.json({ error: "CMS editor access is required" }, { status: user ? 403 : 401 });
  }

  (await draftMode()).enable();
  return NextResponse.redirect(new URL(safePath(new URL(request.url).searchParams.get("path")), request.url));
}
