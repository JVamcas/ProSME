import { NextResponse } from "next/server";

import { getFirebaseWebConfiguration } from "@/auth/firebase/firebase-config.service";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getFirebaseWebConfiguration(), {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
