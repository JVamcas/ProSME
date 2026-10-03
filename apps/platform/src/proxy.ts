import { NextResponse, type NextRequest } from "next/server";

import { authRequestPathHeader } from "@/platform/auth/AuthNavigation";

export function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  // Overwrite incoming values so the destination always reflects this request.
  requestHeaders.set(
    authRequestPathHeader,
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  );
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/portal/:path*", "/admin/:path*", "/cms/:path*"],
};
