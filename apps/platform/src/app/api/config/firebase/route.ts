import { NextResponse } from "next/server";

import { getFirebaseWebConfiguration } from "@/auth/firebase/ServerFirebaseConfigService";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getFirebaseWebConfiguration(), {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
