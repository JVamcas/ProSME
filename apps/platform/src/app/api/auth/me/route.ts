import { NextResponse } from "next/server";

import { resolveUserFromHeaders } from "@/auth/authorization/current-user";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await resolveUserFromHeaders(request.headers);
  if (!user) return NextResponse.json({ user: null }, { status: 401 });

  const response = NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      userType: user.userType,
      capabilities: [...user.capabilities].sort(),
    },
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
