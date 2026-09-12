import { draftMode } from "next/headers";
import { NextResponse } from "next/server";

import { cmsCapability } from "@/auth/authorization/capabilities";
import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import { can } from "@/auth/authorization/policy";
import { previewResource } from "@/auth/authorization/preview-resource";

function safePath(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export async function GET(request: Request) {
  const user = await resolveUserFromHeaders(request.headers);
  const path = safePath(new URL(request.url).searchParams.get("path"));
  if (!can(user, cmsCapability(previewResource(path), "read"))) {
    return NextResponse.json({ error: "Content preview access is required" }, { status: user ? 403 : 401 });
  }

  (await draftMode()).enable();
  return NextResponse.redirect(new URL(path, request.url));
}
