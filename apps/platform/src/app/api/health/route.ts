import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDatabase } from "@/db/client";



export async function GET() {
  try {
    await getDatabase().execute(sql`select 1`);
    return NextResponse.json(
      { status: "ready", checks: { application: "ok", database: "ok" } },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { status: "unavailable", checks: { application: "ok", database: "failed" } },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
