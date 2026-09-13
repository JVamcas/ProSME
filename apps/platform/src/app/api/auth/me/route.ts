import { NextResponse } from "next/server";

import { getAuthenticatedUserProfile } from "@/auth/authorization/ServerUserProfileService";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getAuthenticatedUserProfile(request.headers);
  if (!user) {
    return NextResponse.json(
      {
        user: null,
      },
      {
        status: 401,
      },
    );
  }

  const response = NextResponse.json({
    user,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
